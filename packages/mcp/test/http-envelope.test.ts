import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  LATEST_PROTOCOL_VERSION,
  handleHttpPost,
  methodNotAllowed,
  readBoundedText,
  BodyTooLargeError,
} from "../src/http.ts"
import { LIMITS } from "../src/limits.ts"
import { ImmutableRegistry } from "./helpers/immutable-registry.ts"

const base = "https://reg.test"
const registry = new ImmutableRegistry({
  base,
  items: [{ name: "button", type: "registry:ui", description: "A button.", files: [] }],
})

function post(body: unknown, headers: Record<string, string> = {}) {
  return handleHttpPost(
    new Request(`${base}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { base, fetchImpl: registry.fetchImpl }
  )
}

const rpc = (method: string, params?: unknown, id: unknown = 1) => ({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) })

async function expectError(response: Response, status: number, code: number, pattern: RegExp, id: unknown = null) {
  assert.equal(response.status, status)
  const body = await response.json()
  assert.deepEqual(Object.keys(body).sort(), ["error", "id", "jsonrpc"])
  assert.equal(body.id, id)
  assert.equal(body.error.code, code)
  assert.match(body.error.message, pattern)
  assert.ok(body.error.message.length <= 400)
}

describe("HTTP negative protocol corpus", () => {
  test("parse errors are -32700 with HTTP 400", async () => {
    await expectError(await post("{not json"), 400, -32700, /not valid JSON/)
  })

  test("invalid envelopes are -32600", async () => {
    await expectError(await post([]), 400, -32600, /empty batch/)
    await expectError(await post({ id: 1, method: "ping" }), 200, -32600, /"jsonrpc" must be "2.0"/, 1)
    await expectError(await post({ jsonrpc: "1.0", id: 1, method: "ping" }), 200, -32600, /"jsonrpc" must be "2.0"/, 1)
    await expectError(await post({ jsonrpc: "2.0", id: { nested: true }, method: "ping" }), 200, -32600, /"id" must be a string, a number or null/)
    await expectError(await post({ jsonrpc: "2.0", id: 1, method: 42 }), 200, -32600, /"method" must be a string/, 1)
    const stringBatch = await post(["ping"])
    assert.equal(stringBatch.status, 200)
    const [reply] = await stringBatch.json()
    assert.equal(reply.error.code, -32600)
    assert.match(reply.error.message, /each message must be a JSON object/)
    await expectError(await post(rpc("ping", ["x"])), 200, -32602, /"params" must be an object/, 1)
  })

  test("unsupported methods are -32601 and keep the request id", async () => {
    await expectError(await post(rpc("resources/list", {}, "abc")), 200, -32601, /Method not found: resources\/list/, "abc")
    const long = await post(rpc("x".repeat(500)))
    const body = await long.json()
    assert.ok(body.error.message.length < 120, "method name is truncated")
  })

  test("unknown tools and invalid arguments are -32602 before any registry read", async () => {
    const before = registry.calls.length
    await expectError(await post(rpc("tools/call", { name: "nope", arguments: {} })), 200, -32602, /Unknown tool "nope"/, 1)
    await expectError(await post(rpc("tools/call", { name: "search_components", arguments: { query: "x", limit: 0 } })), 200, -32602, /"limit" argument must be between 1 and 100/, 1)
    await expectError(await post(rpc("tools/call", { name: "install_plan", arguments: { items: "button" } })), 200, -32602, /"items" argument must be a non-empty array/, 1)
    await expectError(await post(rpc("tools/call", { arguments: {} })), 200, -32602, /"name" must be a tool name/, 1)
    assert.equal(registry.calls.length, before, "no registry request was made")
  })

  test("tool execution failures are successful responses with isError", async () => {
    const response = await post(rpc("tools/call", { name: "get_component", arguments: { name: "ghost" } }))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.id, 1)
    assert.equal(body.result.isError, true)
    assert.equal(body.result.structuredContent, undefined)
    assert.match(body.result.content[0].text, /"ghost" is not present in registry 1\.0\.0/)
  })

  test("successful calls return structured content equal to the text", async () => {
    const response = await post(rpc("tools/call", { name: "list_components", arguments: {} }))
    const body = await response.json()
    assert.equal(body.result.isError, undefined)
    assert.deepEqual(body.result.structuredContent, JSON.parse(body.result.content[0].text))
    assert.equal(body.result.structuredContent.registryVersion, "1.0.0")
  })

  test("notifications and client responses are acknowledged with 202", async () => {
    for (const body of [
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 7, result: {} },
      [{ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 1 } }],
    ]) {
      const response = await post(body)
      assert.equal(response.status, 202)
      assert.equal(await response.text(), "")
    }
  })

  test("batches are bounded and answered per message", async () => {
    const mixed = await post([
      rpc("ping", undefined, 1),
      { jsonrpc: "2.0", method: "notifications/initialized" },
      rpc("nope", undefined, 2),
      rpc("tools/call", { name: "nope" }, 3),
    ])
    assert.equal(mixed.status, 200)
    const replies = await mixed.json()
    assert.deepEqual(replies.map((reply: { id: unknown }) => reply.id), [1, 2, 3])
    assert.deepEqual(replies[0].result, {})
    assert.equal(replies[1].error.code, -32601)
    assert.equal(replies[2].error.code, -32602)

    const tooMany = await post(Array.from({ length: LIMITS.batchLength + 1 }, (_, i) => rpc("ping", undefined, i)))
    await expectError(tooMany, 400, -32600, /at most 8 messages \(received 9\)/)
  })

  test("protocol version negotiation stays lenient in the body and strict in the header", async () => {
    const legacy = await post(rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "0" } }))
    assert.equal((await legacy.json()).result.protocolVersion, "2024-11-05")
    const unknownVersion = await post(rpc("initialize", { protocolVersion: "1999-01-01", capabilities: {}, clientInfo: { name: "t", version: "0" } }))
    assert.equal((await unknownVersion.json()).result.protocolVersion, LATEST_PROTOCOL_VERSION)
    const supportedHeader = await post(rpc("ping"), { "Mcp-Protocol-Version": "2025-06-18" })
    assert.equal(supportedHeader.status, 200)
    await expectError(
      await post(rpc("ping"), { "Mcp-Protocol-Version": "1999-01-01" }),
      400, -32600, /Unsupported Mcp-Protocol-Version "1999-01-01"\. Supported: 2025-11-25/
    )
  })

  test("request bodies are cut off at the byte limit while streaming", async () => {
    const chunk = new TextEncoder().encode("x".repeat(64 * 1024))
    const oversized = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let sent = 0; sent <= LIMITS.bodyBytes; sent += chunk.byteLength) controller.enqueue(chunk)
        controller.close()
      },
    })
    const request = new Request(`${base}/mcp`, {
      method: "POST",
      body: oversized,
      // @ts-expect-error Node's fetch requires duplex for streaming bodies.
      duplex: "half",
    })
    await expectError(await handleHttpPost(request, { base, fetchImpl: registry.fetchImpl }), 413, -32600, /exceeds 2097152 bytes/)

    const declared = new Request(`${base}/mcp`, { method: "POST", headers: { "Content-Length": String(LIMITS.bodyBytes + 1) }, body: "{}" })
    await assert.rejects(() => readBoundedText(declared, LIMITS.bodyBytes), BodyTooLargeError)

    const small = new Request(`${base}/mcp`, { method: "POST", body: JSON.stringify(rpc("ping")) })
    assert.equal(JSON.parse(await readBoundedText(small, LIMITS.bodyBytes)).method, "ping")
  })

  test("GET and DELETE answer 405 with a JSON-RPC body", async () => {
    const response = methodNotAllowed()
    assert.equal(response.status, 405)
    assert.equal(response.headers.get("Allow"), "POST, OPTIONS")
    assert.equal((await response.json()).error.code, -32000)
  })
})
