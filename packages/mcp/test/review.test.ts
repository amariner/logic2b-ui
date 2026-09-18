import assert from "node:assert/strict"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { McpError } from "@modelcontextprotocol/sdk/types.js"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { REVIEW_LIMITS, reviewUi, type ReviewRequest } from "@logic2b/review"
import { handleHttpPost } from "../src/http.ts"
import { LIMITS, ToolInputError } from "../src/limits.ts"
import { runTool, TOOLS } from "../src/tools.ts"

const request: ReviewRequest = {
  files: [
    { path: "src/Customer.tsx", labelContext: "complete", content: '<><button><svg aria-hidden="true"/></button><input aria-label="Name"/><dialog open/></>' },
    { path: "src/Brand.tsx", content: '// logic2b-review-disable-next-line L2B-TOK-001 -- approved brand color\n<div className="text-red-500"/>' },
    { path: "src/Unresolved.tsx", content: '<><Input/><button {...props}/></>' },
    { path: "src/Invalid.tsx", content: 'const PRIVATE_SOURCE_DO_NOT_ECHO = <broken' },
  ],
  policy: { semanticColors: true },
}
const reviewTool = TOOLS.find(tool => tool.name === "review_ui")!
const validator = new AjvJsonSchemaValidator().getValidator(reviewTool.outputSchema)
let fetches = 0
const noFetch = async () => { fetches++; throw new Error("Review must not fetch") }
const wire = (value: unknown) => JSON.parse(JSON.stringify(value))
const invalidRequests = [
  {}, { ...request, schemaVersion: 2 }, { ...request, unexpected: "PRIVATE_SOURCE" },
  { ...request, version: "PRIVATE_SOURCE" }, { ...request, scope: ["states"] },
  { ...request, scope: ["a11y", "a11y"] }, { ...request, policy: { semanticColors: "true" } },
  { ...request, policy: { unsupported: true } },
  { files: [{ path: "../PRIVATE_SOURCE.tsx", content: "PRIVATE_SOURCE" }] },
  { files: [{ path: "src/A.tsx", content: "PRIVATE_SOURCE", labelContext: "yes" }] },
  { files: [{ path: "src/A.tsx", content: "PRIVATE_SOURCE", extra: true }] },
  { files: [{ path: "src/A.tsx", content: false }] },
  { files: Array.from({ length: REVIEW_LIMITS.files + 1 }, (_, i) => ({ path: `src/A${i}.tsx`, content: "" })) },
  { files: [{ path: "src/A.tsx", content: "€".repeat(Math.floor(REVIEW_LIMITS.sourceBytes / 3) + 1) }] },
  { files: [{ path: "src/A.tsx", content: "" }, { path: "src/A.tsx", content: "" }] },
]

test("review_ui returns strict shared-core results with findings, unknowns and auditable suppressions", async () => {
  const result = await runTool("review_ui", request, { fetchImpl: noFetch })
  assert.equal(result.isError, undefined)
  assert.deepEqual(result.structuredContent, wire(reviewUi(request)))
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
  const payload = result.structuredContent!
  assert.equal((payload.findings as unknown[]).length, 2)
  assert.equal((payload.suppressed as unknown[]).length, 1)
  assert.ok((payload.unknowns as unknown[]).length > 0)
  assert.equal(JSON.stringify(payload).includes("PRIVATE_SOURCE_DO_NOT_ECHO"), false)
  const valid = validator(payload); assert.ok(valid.valid, valid.errorMessage)
  for (const malformed of [
    { ...payload, extra: true }, { ...payload, schemaVersion: 2 },
    { ...payload, summary: { errors: 2, warnings: 0, info: 0, score: 100 } },
    { ...payload, findings: [{ ...(payload.findings as object[])[0], category: "accessibility-certified" }] },
    { ...payload, findings: [{ ...(payload.findings as object[])[0], source: "PRIVATE_SOURCE" }] },
    { ...payload, unknowns: [{ file: "A.tsx", rule: "parse", line: 1, column: 1 }] },
    { ...payload, suppressed: [{ ...(payload.suppressed as object[])[0], extra: true }] },
    { ...payload, evaluatedRules: ["L2B-STATE-001"] },
    { ...payload, disabledRules: [{ rule: "L2B-TOK-001", reason: "disabled", extra: true }] },
  ]) assert.equal(validator(malformed).valid, false)
  assert.deepEqual(reviewTool.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false })
  assert.equal(fetches, 0)
})

test("review_ui rejects malformed and oversized source without echoing supplied content or fetching", async () => {
  for (const args of invalidRequests) await assert.rejects(
    runTool("review_ui", args, { fetchImpl: noFetch }),
    error => error instanceof ToolInputError && error.message.length < 256 && !error.message.includes("PRIVATE_SOURCE"),
  )
  assert.equal(fetches, 0)
})

test("HTTP review preserves core parity and accepts the full source budget with worst-case JSON escaping", async () => {
  for (const args of [request, { files: [{ path: "src/A.tsx", content: "//" + "\u0001".repeat(REVIEW_LIMITS.sourceBytes - 2) }] }]) {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "review_ui", arguments: args } })
    assert.ok(new TextEncoder().encode(body).length < LIMITS.bodyBytes)
    const response = await handleHttpPost(new Request("https://registry.test/mcp", { method: "POST", headers: { "content-type": "application/json" }, body }), { fetchImpl: noFetch })
    assert.equal(response.status, 200)
    const rpc = await response.json()
    assert.equal(rpc.error, undefined)
    assert.equal(rpc.result.isError, undefined)
    assert.deepEqual(rpc.result.structuredContent, wire(reviewUi(args)))
    assert.deepEqual(rpc.result.structuredContent, JSON.parse(rpc.result.content[0].text))
  }
  const response = await handleHttpPost(new Request("https://registry.test/mcp", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "review_ui", arguments: invalidRequests[8] } }),
  }), { fetchImpl: noFetch })
  const failure = await response.json()
  assert.equal(failure.error.code, -32602)
  assert.equal(JSON.stringify(failure).includes("PRIVATE_SOURCE"), false)
  assert.equal(fetches, 0)
})

test("actual stdio review handshake validates output, reports uncertainty and rejects invalid params", async () => {
  const client = new Client({ name: "review-protocol-test", version: "1.0.0" })
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/index.ts"],
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { LOGIC2B_REGISTRY: "http://127.0.0.1:1" },
    stderr: "pipe",
  })
  try {
    await client.connect(transport)
    const { tools } = await client.listTools()
    assert.deepEqual(tools.find(tool => tool.name === "review_ui"), wire(reviewTool))
    const result = await client.callTool({ name: "review_ui", arguments: wire(request) })
    assert.equal(result.isError, undefined)
    assert.deepEqual(result.structuredContent, wire(reviewUi(request)))
    for (const args of invalidRequests) await assert.rejects(
      client.callTool({ name: "review_ui", arguments: args }),
      error => error instanceof McpError && error.code === -32602 && !error.message.includes("PRIVATE_SOURCE"),
    )
    const inert = await client.callTool({ name: "review_ui", arguments: { files: [{ path: "src/Inert.tsx", content: 'process.exit(88); export const App = () => <button aria-label="Close"/>' }] } })
    assert.equal(inert.isError, undefined)
    await client.ping()
  } finally { await client.close() }
})
