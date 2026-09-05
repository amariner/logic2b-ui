import assert from "node:assert/strict"
import { test } from "node:test"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"
import { POST } from "../../../apps/web/src/pages/mcp.ts"
import { TOOLS } from "../src/tools.ts"

async function rpc(method: string, params: Record<string, unknown> = {}) {
  const request = new Request("https://registry.test/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })
  const response = await POST({ request } as Parameters<typeof POST>[0])
  assert.equal(response.status, 200)
  return (await response.json()).result
}

test("HTTP publishes the same output contracts as stdio and returns structured data", async () => {
  const listing = await rpc("tools/list")
  assert.deepEqual(listing.tools, JSON.parse(JSON.stringify(TOOLS)))
  const tool = listing.tools.find((entry: { name: string }) => entry.name === "decode_preset")
  const result = await rpc("tools/call", {
    name: "decode_preset", arguments: { preset: encodePreset(DEFAULT_CONFIG) },
  })
  const checked = new AjvJsonSchemaValidator().getValidator(tool.outputSchema)(result.structuredContent)
  assert.ok(checked.valid, checked.errorMessage)
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
})

test("HTTP tool errors remain errors rather than successful structured payloads", async () => {
  const result = await rpc("tools/call", { name: "decode_preset", arguments: { preset: "invalid" } })
  assert.equal(result.isError, true)
  assert.equal(result.structuredContent, undefined)
  assert.match(result.content[0].text, /not a valid preset/)
})
