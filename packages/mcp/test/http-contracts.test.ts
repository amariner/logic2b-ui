import assert from "node:assert/strict"
import { createHash } from "node:crypto"
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

test("the site endpoint exposes pure project inspection with the shared result schema", async () => {
  const inspection = TOOLS.find((entry) => entry.name === "inspect_project")!
  for (const details of [false, true]) {
    const result = await rpc("tools/call", {
      name: "inspect_project",
      arguments: {
        snapshot: {
          schemaVersion: 1,
          configs: [],
          capabilities: { fileWrites: false, dependencyInstall: false, browser: false },
        },
        details,
      },
    })
    assert.equal(result.isError, undefined)
    const checked = new AjvJsonSchemaValidator().getValidator(inspection.outputSchema)(result.structuredContent)
    assert.ok(checked.valid, checked.errorMessage)
    assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
    assert.equal(Boolean(result.structuredContent.context), details)
  }
})

test("the site endpoint returns typed managed rules with preserved editor content and hash preconditions", async () => {
  const rules = TOOLS.find((entry) => entry.name === "agent_rules")!
  const original = "---\nalwaysApply: false\n---\nProject-owned rules · 😀\n"
  const result = await rpc("tools/call", {
    name: "agent_rules", arguments: {
      stack: "vite", formats: ["cursor"],
      currentFiles: [{ path: ".cursor/rules/logic2b.mdc", content: original }],
    },
  })
  assert.equal(result.isError, undefined)
  const checked = new AjvJsonSchemaValidator().getValidator(rules.outputSchema)(result.structuredContent)
  assert.ok(checked.valid, checked.errorMessage)
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
  assert.equal(result.structuredContent.schemaVersion, 1)
  assert.deepEqual(result.structuredContent.files.map((file: { path: string }) => file.path).sort(),
    [".cursor/rules/logic2b.mdc", "DESIGN.md"])
  const cursor = result.structuredContent.files.find((file: { path: string }) => file.path === ".cursor/rules/logic2b.mdc")
  assert.ok(cursor.content.startsWith(original))
  assert.equal(cursor.action, "update")
  assert.deepEqual(cursor.precondition, {
    kind: "sha256", sha256: createHash("sha256").update(original, "utf8").digest("hex"),
  })
})
