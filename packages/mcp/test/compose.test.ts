import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { buildComposePlan, loadComposeItems, validateComposeRequest } from "@logic2b/scaffold/compose"
import { REGISTRY_VERSION } from "../../registry/version.ts"
import { composeLocal } from "../../cli/src/compose.ts"
import { createRegistryClient, type FetchLike } from "../src/registry.ts"
import { runTool, TOOLS } from "../src/tools.ts"
import { createServer } from "../src/server.ts"
import { handleHttpPost } from "../src/http.ts"
import { ToolInputError } from "../src/limits.ts"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"

const base = "https://compose.test"
const calls: string[] = []
const fetchImpl: FetchLike = async url => {
  calls.push(url)
  const pathname = new URL(url).pathname
  assert.ok(pathname.startsWith("/r/"))
  try { const text = await readFile(new URL(`../../../apps/web/public${pathname}`, import.meta.url), "utf8"); return { ok: true, status: 200, text: async () => text } }
  catch { return { ok: false, status: 404, text: async () => "missing" } }
}
const request = {
  version: REGISTRY_VERSION,
  requirements: [
    { id: "browse", route: "/customers", task: "browse-customers", roles: ["list"], requiredStates: ["loading", "empty", "no-results", "error"], actions: ["create", "edit", "retry"] },
    { id: "edit", route: "/customers/edit", task: "edit-customer", roles: ["primary-form"], requiredStates: ["validation-error", "submitting", "error", "unsaved-changes"], actions: ["save", "cancel"] },
  ],
}
const tool = TOOLS.find(tool => tool.name === "compose_plan")!
const ajv = new AjvJsonSchemaValidator()
const validate = ajv.getValidator(tool.outputSchema)

test("actual immutable customer composition has shared CLI/MCP parity and a strict wire schema", async () => {
  calls.length = 0
  const result = await runTool("compose_plan", request, { base, fetchImpl })
  assert.equal(result.isError, undefined)
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
  assert.equal(calls.filter(url => url.endsWith("/r/versions.json")).length, 1)
  assert.equal(calls.filter(url => url.includes("/r/versions/")).length, 1)
  assert.ok(calls.every(url => /\/r\/(?:versions|content\/)/.test(url)))
  assert.deepEqual(result.structuredContent, await composeLocal(request, { registry: base, fetchImpl }))
  const client = await createRegistryClient(base, REGISTRY_VERSION, fetchImpl)
  assert.deepEqual(result.structuredContent, buildComposePlan(request, client.resolvedVersion, await loadComposeItems(validateComposeRequest(request), client.index, name => client.getItem(name))))
  assert.ok(ajv.getValidator(tool.inputSchema)(request).valid)
  const check = validate(result.structuredContent); assert.ok(check.valid, check.errorMessage)
  assert.equal(result.structuredContent!.confidence, "medium")
  assert.equal((result.structuredContent!.gaps as unknown[]).length, 5)
  for (const malformed of [{ ...result.structuredContent, schemaVersion: 2 }, { ...result.structuredContent, registryVersion: "next" }, { ...result.structuredContent, confidence: "perfect" }, { ...result.structuredContent, next: { install: { items: ["button"], version: "next" } } }, { ...result.structuredContent, pages: [{ route: "/", purpose: "browse", sections: [{ item: "invented" }] }] }]) assert.equal(validate(malformed).valid, false)
})
test("composition rejects malformed input before fetch and retains payload integrity failures", async () => {
  let count = 0
  const noFetch = async () => { count++; throw new Error("unexpected fetch") }
  for (const raw of [{}, { ...request, schemaVersion: 9 }, { ...request, requirements: [{ ...request.requirements[0], route: "/../PRIVATE" }] }, { ...request, requirements: [request.requirements[0], request.requirements[0]] }, { ...request, brief: "PRIVATE".repeat(400) }, { ...request, command: "PRIVATE" }]) await assert.rejects(runTool("compose_plan", raw, { fetchImpl: noFetch }), error => error instanceof ToolInputError && !error.message.includes("PRIVATE"))
  assert.equal(count, 0)
  const tampered: FetchLike = async url => {
    const res = await fetchImpl(url)
    if (!url.includes("/r/content/")) return res
    return { ...res, text: async () => `${await res.text()} ` }
  }
  const result = await runTool("compose_plan", request, { base, fetchImpl: tampered })
  assert.equal(result.isError, true); assert.equal(result.structuredContent, undefined); assert.match(result.content[0].text, /Integrity check failed/)
})
test("official local client and stateless HTTP return the same composition evidence", async t => {
  const client = new Client({ name: "composition-test", version: "1.0.0" })
  const server = createServer({ base, fetchImpl })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport); await client.connect(clientTransport)
  t.after(async () => { await client.close(); await server.close() })
  const local = await client.callTool({ name: "compose_plan", arguments: request })
  const response = await handleHttpPost(new Request("https://compose.test/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "compose_plan", arguments: request } }) }), { base, fetchImpl })
  const wire = await response.json() as { result: unknown }
  assert.equal(response.status, 200); assert.deepEqual(wire.result, local)
  assert.deepEqual(tool.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true })
})

test("source output reuses one verified release, applies presets and produces only grounded routes/roles with CLI parity", async () => {
  for (const stack of ["next", "vite", "astro"] as const) {
    const args = { ...request, stack, preset: encodePreset({ ...DEFAULT_CONFIG, iconLibrary: "tabler" }), output: "project" }
    calls.length = 0
    const result = await runTool("compose_plan", args, { base, fetchImpl })
    assert.equal(result.isError, undefined, JSON.stringify(result))
    assert.equal(calls.filter(url => url.endsWith("/r/versions.json")).length, 1)
    assert.equal(calls.filter(url => url.includes("/r/versions/")).length, 1)
    assert.equal(new Set(calls).size, calls.length, "each verified asset is fetched once")
    const checked = validate(result.structuredContent); assert.ok(checked.valid, checked.errorMessage)
    const project = result.structuredContent!.project as { files: { path: string; content: string }[]; items: { name: string }[]; registryVersion: string; iconLibrary: string }
    assert.equal(project.registryVersion, REGISTRY_VERSION)
    assert.equal(project.iconLibrary, "tabler")
    assert.ok(project.items.some(item => item.name === "theme"))
    assert.ok(project.items.every(item => item.name !== "login-01"))
    const source = project.files.filter(file => /\.[jt]sx?$/.test(file.path)).map(file => file.content).join("\n")
    assert.ok(source.includes("@tabler/icons-react")); assert.ok(!source.includes("lucide-react"))
    if (stack === "next") assert.ok(project.files.some(file => file.path === "app/customers/edit/page.tsx"))
    if (stack === "astro") assert.ok(project.files.some(file => file.path === "src/pages/customers/edit/index.astro"))
    assert.ok(project.files.every(file => !file.path.endsWith("starter-page.tsx")))
    assert.deepEqual(result.structuredContent, await composeLocal(args, { registry: base, fetchImpl }))
    assert.equal(result.structuredContent!.confidence, "medium", "local callbacks never attest production wiring")
    assert.ok(validate({ ...result.structuredContent, project: { ...project, registryVersion: "next" } }).valid === false)
  }
})
test("unsupported source requirements stay named gaps, preset errors reject before fetch, and foundation integrity failures remain errors", async () => {
  for (const changes of [{ locale: "fr" }, { requirements: [{ ...request.requirements[0], requiredStates: ["offline"] }] }, { requirements: [{ ...request.requirements[0], actions: ["export"] }] }, { requirements: [{ ...request.requirements[0], route: "/_private" }] }]) {
    const result = await runTool("compose_plan", { ...request, ...changes, output: "project" }, { base, fetchImpl })
    assert.equal(result.isError, undefined); assert.equal(result.structuredContent!.project, null)
    assert.equal(result.structuredContent!.confidence, "low")
    assert.ok((result.structuredContent!.gaps as unknown[]).length)
  }
  let fetches = 0
  await assert.rejects(runTool("compose_plan", { ...request, preset: "PRIVATE_BAD_PRESET" }, { fetchImpl: async () => { fetches++; throw new Error("unexpected") } }), ToolInputError)
  assert.equal(fetches, 0)
  const forbidden = await runTool("compose_plan", { ...request, output: "project", constraints: { avoid: ["theme"] } }, { base, fetchImpl })
  assert.equal(forbidden.isError, undefined); assert.equal(forbidden.structuredContent!.project, null); assert.match(forbidden.content[0].text, /foundation conflicts/)
  const tamperedFoundation: FetchLike = async url => {
    const response = await fetchImpl(url)
    if (!url.includes("/r/content/")) return response
    const text = await response.text()
    return { ...response, text: async () => JSON.parse(text).name === "theme" ? `${text} ` : text }
  }
  const broken = await runTool("compose_plan", { ...request, output: "project" }, { base, fetchImpl: tamperedFoundation })
  assert.equal(broken.isError, true); assert.equal(broken.structuredContent, undefined); assert.match(broken.content[0].text, /Integrity check failed/)
  const form = await runTool("compose_plan", { ...request, locale: "es-ES", output: "project", requirements: [request.requirements[1]] }, { base, fetchImpl })
  assert.equal(form.isError, undefined)
  const project = form.structuredContent!.project as { files: { path: string; content: string }[]; items: { name: string }[] }
  const host = project.files.find(file => file.path.endsWith("composition-screen.tsx"))!.content
  assert.ok(host.includes("Guardar cliente")); assert.ok(!host.includes('import { AdminCustomers }'))
  assert.ok(project.items.every(item => item.name !== "admin-customers-01"))
})
