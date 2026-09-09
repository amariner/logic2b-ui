import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { runTool, TOOLS } from "../src/tools.ts"
import { validateItem, type FetchLike } from "../src/registry.ts"
import { REGISTRY_VERSION } from "../../registry/version.ts"

const base = "https://behavior.test"
const fetchImpl: FetchLike = async url => {
  const pathname = new URL(url).pathname
  assert.ok(pathname.startsWith("/r/"))
  try { const text = await readFile(new URL(`../../../apps/web/public${pathname}`, import.meta.url), "utf8"); return { ok: true, status: 200, text: async () => text } }
  catch { return { ok: false, status: 404, text: async () => "missing" } }
}
const validator = new AjvJsonSchemaValidator()
test("actual immutable customer contracts survive discovery, get and install plan with schema parity", async () => {
  for (const name of ["admin-customers-01", "customer-edit-01"]) {
    const payload = JSON.parse(await readFile(new URL(`../../../apps/web/public/r/${name}.json`, import.meta.url), "utf8"))
    for (const [tool, args] of [["list_components", { kind: "block" }], ["get_component", { name }], ["install_plan", { items: [name] }]] as const) {
      const result = await runTool(tool, { ...args, version: REGISTRY_VERSION }, { base, fetchImpl })
      assert.ok(!result.isError, JSON.stringify(result))
      assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
      const data = JSON.parse(result.content[0].text)
      const item = tool === "get_component" ? data : data.items.find((item: { name: string }) => item.name === name)
      assert.deepEqual(item.behavior, payload.behavior)
      const validate = validator.getValidator(TOOLS.find(t => t.name === tool)!.outputSchema)
      const check = validate(data)
      assert.ok(check.valid, check.errorMessage)
      item.behavior.schemaVersion = 9
      assert.equal(validate(data).valid, false, `${tool} must validate nested behavior`)
      if (tool === "install_plan") assert.ok(data.notes.some((note: string) => note.includes("server")))
    }
  }
})

test("unsupported or malformed behavior is rejected before returning consumer instructions", async () => {
  const payload = JSON.parse(await readFile(new URL("../../../apps/web/public/r/customer-edit-01.json", import.meta.url), "utf8"))
  for (const behavior of [{ ...payload.behavior, schemaVersion: 99 }, { ...payload.behavior, consumer: "not an array" }]) assert.throws(() => validateItem(payload.name, { ...payload, behavior }), /Invalid behavior contract/)
  const corruptManifest: FetchLike = async url => {
    const response = await fetchImpl(url)
    if (!url.includes("/r/versions/")) return response
    const manifest = JSON.parse(await response.text())
    manifest.items.find((item: { name: string }) => item.name === "customer-edit-01").behavior.schemaVersion = 99
    return { ok: true, status: 200, text: async () => JSON.stringify(manifest) }
  }
  const result = await runTool("list_components", {}, { base, fetchImpl: corruptManifest })
  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /Invalid behavior contract/)
})
