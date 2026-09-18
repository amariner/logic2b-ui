import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { createServer } from "node:http"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { McpError } from "@modelcontextprotocol/sdk/types.js"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { buildChangePlan, CHANGE_LIMITS, validateChangePlan } from "@logic2b/scaffold/change-plan"
import { handleHttpPost, methodNotAllowed } from "../src/http.ts"
import { LIMITS, ToolInputError } from "../src/limits.ts"
import { runTool, TOOLS, validateToolArguments } from "../src/tools.ts"

const digest = (content: string) => createHash("sha256").update(content).digest("hex")
const beforeSource = 'export const columns = ["Custom customer", "Owner"];\n'
const beforePackage = '{"private":true,"dependencies":{"react":"^19.0.0"}}\n'
const request = {
  schemaVersion: 1,
  registryVersion: "1.0.0-rc.20",
  snapshot: {
    schemaVersion: 1,
    appRoot: ".",
    configurations: [{ path: "package.json", content: beforePackage }],
    files: [{ path: "src/Customers.tsx", sha256: digest(beforeSource) }],
    capabilities: { fileWrites: false, dependencyInstall: false, browser: false },
  },
  candidates: [
    { path: "src/Customers.tsx", content: beforeSource + 'export const filters = ["Active"];\n', reason: "Add customer filters while keeping custom columns." },
    { path: "src/customer-types.ts", content: 'export type Status = "active" | "archived";\n', reason: "Share filter choices." },
    { path: "package.json", content: '{"private":true,"dependencies":{"react":"^19.0.0","clsx":"^2.1.1"}}\n', reason: "Declare the dependency used by the candidate." },
  ],
  missingFiles: ["src/customer-types.ts"],
}
const changeTool = TOOLS.find(tool => tool.name === "change_plan")!
const validator = new AjvJsonSchemaValidator().getValidator(changeTool.outputSchema)
const inputValidator = new AjvJsonSchemaValidator().getValidator(changeTool.inputSchema)
const wire = (value: unknown) => JSON.parse(JSON.stringify(value))
let fetches = 0
const noFetch = async () => { fetches++; throw new Error("Change planning must not fetch") }
const invalidRequests = [
  {}, { ...request, schemaVersion: 2 }, { ...request, extra: "PRIVATE_SOURCE" },
  { ...request, registryVersion: "next" }, { ...request, registryVersion: "^1.0.0" },
  { ...request, snapshot: { ...request.snapshot, schemaVersion: 2 } },
  { ...request, snapshot: { ...request.snapshot, extra: "PRIVATE_SOURCE" } },
  { ...request, snapshot: { ...request.snapshot, configurations: [{ path: "package.json", content: "PRIVATE_SOURCE" }] } },
  { ...request, candidates: [{ path: "../PRIVATE_SOURCE.tsx", content: "PRIVATE_SOURCE", reason: "Change" }] },
  { ...request, candidates: [{ path: ".env", content: "PRIVATE_SOURCE", reason: "Change" }] },
  { ...request, candidates: [{ path: "node_modules/a.tsx", content: "PRIVATE_SOURCE", reason: "Change" }] },
  { ...request, candidates: [{ path: "src/A.tsx", content: "PRIVATE_SOURCE", reason: "Change", command: "PRIVATE_SOURCE" }] },
  { ...request, candidates: [{ path: "src/A.tsx", content: false, reason: "Change" }] },
  { ...request, candidates: [{ path: "src/A.tsx", content: "PRIVATE_SOURCE", reason: "" }] },
  { ...request, candidates: [request.candidates[0], request.candidates[0]] },
  { ...request, candidates: [] },
  { ...request, candidates: Array.from({ length: CHANGE_LIMITS.operations + 1 }, (_, index) => ({ path: `src/A${index}.tsx`, content: "", reason: "Change" })) },
  { ...request, candidates: [{ path: "src/A.tsx", content: "€".repeat(Math.floor(CHANGE_LIMITS.fileBytes / 3) + 1), reason: "Change" }] },
  { ...request, candidates: [{ path: "src/A.tsx", content: "\ud800", reason: "Change" }] },
  { ...request, candidates: ["src/A.tsx", "src/B.tsx", "src/C.tsx"].map(path => ({ path, content: "x".repeat(CHANGE_LIMITS.fileBytes), reason: "Change" })) },
  { ...request, candidates: [{ path: "src/A.tsx", content: "PRIVATE_SOURCE", reason: "x".repeat(513) }] },
  { ...request, missingFiles: Array.from({ length: CHANGE_LIMITS.operations + 1 }, (_, index) => `src/A${index}.tsx`) },
  { ...request, missingFiles: ["src/customer-types.ts", "src/customer-types.ts"] },
  { ...request, missingFiles: ["../PRIVATE_SOURCE"] },
]

test("change_plan assembles strict shared-core plans from source hashes, configuration bytes and explicit absence", async () => {
  const result = await runTool("change_plan", request, { fetchImpl: noFetch })
  assert.equal(result.isError, undefined)
  assert.deepEqual(result.structuredContent, wire(await buildChangePlan(request)))
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
  const plan = await validateChangePlan(result.structuredContent)
  assert.equal(plan.operations.find(file => file.path === "src/Customers.tsx")!.beforeSha256, digest(beforeSource))
  assert.equal(plan.operations.find(file => file.path === "package.json")!.beforeSha256, digest(beforePackage))
  assert.equal(plan.operations.find(file => file.path === "src/customer-types.ts")!.beforeSha256, null)
  assert.equal(plan.operations.find(file => file.path === "src/customer-types.ts")!.kind, "create")
  assert.equal(plan.operations.find(file => file.path === "src/Customers.tsx")!.kind, "update")
  assert.deepEqual(plan.dependencies, [{ name: "clsx", after: "^2.1.1" }])
  assert.deepEqual(plan.conflicts, [])
  for (const file of plan.operations) assert.equal(file.afterSha256, digest(file.content))
  const valid = validator(plan); assert.ok(valid.valid, valid.errorMessage)
  assert.ok(inputValidator(request).valid)
  for (const malformed of [
    { ...plan, extra: true }, { ...plan, schemaVersion: 2 }, { ...plan, id: "not-a-hash" },
    { ...plan, operations: [{ ...plan.operations[0], kind: "delete" }] },
    { ...plan, operations: [{ ...plan.operations[0], kind: "update", beforeSha256: null }] },
    { ...plan, operations: [{ ...plan.operations[0], kind: "create", beforeSha256: digest(beforeSource) }] },
    { ...plan, operations: [{ ...plan.operations[0], beforeSha256: "not-a-hash" }] },
    { ...plan, operations: [{ ...plan.operations[0], shell: "PRIVATE_SOURCE" }] },
    { ...plan, dependencies: [{ name: "clsx", after: "^2.1.1", install: true }] },
    { ...plan, conflicts: [{ path: "src/A.tsx" }] },
    { ...plan, verification: [{ kind: "execute", check: "PRIVATE_SOURCE" }] },
    { ...plan, unsupported: [false] },
  ]) assert.equal(validator(malformed).valid, false)
  assert.deepEqual(changeTool.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false })
  assert.equal(fetches, 0)
})

test("change_plan reports incomplete and contradictory evidence without turning omissions into create permission", async () => {
  for (const args of [
    { ...request, missingFiles: [] },
    { ...request, missingFiles: ["src/Customers.tsx", "src/customer-types.ts"] },
    { ...request, snapshot: { ...request.snapshot, files: [...request.snapshot.files, { path: "package.json", sha256: "f".repeat(64) }] } },
  ]) {
    const result = await runTool("change_plan", args, { fetchImpl: noFetch })
    assert.equal(result.isError, undefined)
    assert.deepEqual(result.structuredContent, wire(await buildChangePlan(args)))
    assert.ok((result.structuredContent!.conflicts as unknown[]).length > 0)
    assert.ok(validator(result.structuredContent).valid)
  }
  assert.equal(fetches, 0)
})

test("change_plan pins snapshot registry evidence, canonicalizes candidate order and exposes unsupported hooks", async () => {
  const manifest = { path: ".logic2b/manifest.json", content: JSON.stringify({ schemaVersion: 1, registry: { resolvedVersion: "1.0.0-rc.20" }, items: {} }) }
  const inferred = { ...request, registryVersion: undefined, snapshot: { ...request.snapshot, configurations: [...request.snapshot.configurations, manifest] } }
  const result = await runTool("change_plan", inferred, { fetchImpl: noFetch })
  assert.equal(result.isError, undefined)
  assert.equal(result.structuredContent!.registryVersion, "1.0.0-rc.20")
  assert.deepEqual(result.structuredContent!.conflicts, [])
  const reordered = await runTool("change_plan", { ...inferred, candidates: [...inferred.candidates].reverse() }, { fetchImpl: noFetch })
  assert.equal(reordered.structuredContent!.id, result.structuredContent!.id)
  const mismatch = await runTool("change_plan", { ...inferred, registryVersion: "1.0.0-rc.19" }, { fetchImpl: noFetch })
  assert.ok((mismatch.structuredContent!.conflicts as { path: string }[]).some(conflict => conflict.path === ".logic2b/manifest.json"))
  const unsupported = await runTool("change_plan", { ...request, candidates: [{ path: "package.json", content: '{"private":true,"dependencies":{"react":"^19.0.0"},"scripts":{"postinstall":"process.exit(88)"}}', reason: "Exercise unsupported lifecycle changes." }] }, { fetchImpl: noFetch })
  assert.equal(unsupported.isError, undefined)
  assert.ok((unsupported.structuredContent!.unsupported as string[]).some(reason => reason.includes("postinstall")))
  await assert.rejects(runTool("change_plan", { ...request, registryVersion: undefined }, { fetchImpl: noFetch }), ToolInputError)
  assert.equal(fetches, 0)
})

test("change_plan rejects unbounded or malformed requests with sanitized protocol errors", async () => {
  for (const [index, args] of invalidRequests.entries()) await assert.rejects(
    runTool("change_plan", args, { fetchImpl: noFetch }),
    error => error instanceof ToolInputError && error.message.length < 400 && !error.message.includes("PRIVATE_SOURCE"),
    `Invalid change request ${index} must reject safely.`,
  )
  assert.throws(() => validateToolArguments("change_plan", invalidRequests[2]), ToolInputError)
  assert.equal(fetches, 0)
})

test("HTTP change planning matches the shared plan and handles full escaped-source budgets without network access", async () => {
  const escaped = {
    registryVersion: "1.0.0-rc.20", snapshot: { schemaVersion: 1, configurations: [], files: [] },
    candidates: ["src/First.tsx", "src/Second.tsx"].map(path => ({ path, content: "\u0001".repeat(CHANGE_LIMITS.fileBytes), reason: "Bounded source data." })),
    missingFiles: ["src/First.tsx", "src/Second.tsx"],
  }
  for (const args of [request, escaped]) {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "change_plan", arguments: args } })
    assert.ok(new TextEncoder().encode(body).length < LIMITS.bodyBytes)
    const response = await handleHttpPost(new Request("https://registry.test/mcp", { method: "POST", headers: { "content-type": "application/json" }, body }), { fetchImpl: noFetch })
    assert.equal(response.status, 200)
    const rpc = await response.json()
    assert.equal(rpc.error, undefined)
    assert.equal(rpc.result.isError, undefined)
    assert.deepEqual(rpc.result.structuredContent, wire(await buildChangePlan(args)))
    assert.deepEqual(rpc.result.structuredContent, JSON.parse(rpc.result.content[0].text))
  }
  for (const args of invalidRequests) {
    const response = await handleHttpPost(new Request("https://registry.test/mcp", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "change_plan", arguments: args } }),
    }), { fetchImpl: noFetch })
    const failure = await response.json()
    assert.equal(failure.error.code, -32602)
    assert.equal(JSON.stringify(failure).includes("PRIVATE_SOURCE"), false)
  }
  assert.equal(fetches, 0)
})

test("actual stdio change planning validates output, rejects invalid inputs and never executes source", async () => {
  const client = new Client({ name: "change-plan-protocol-test", version: "1.0.0" })
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
    assert.deepEqual(tools.find(tool => tool.name === "change_plan"), wire(changeTool))
    const result = await client.callTool({ name: "change_plan", arguments: wire(request) })
    assert.equal(result.isError, undefined)
    assert.deepEqual(result.structuredContent, wire(await buildChangePlan(request)))
    for (const args of invalidRequests) await assert.rejects(
      client.callTool({ name: "change_plan", arguments: args }),
      error => error instanceof McpError && error.code === -32602 && !error.message.includes("PRIVATE_SOURCE"),
    )
    const inert = await client.callTool({ name: "change_plan", arguments: {
      ...request, candidates: [{ path: "src/Inert.tsx", content: "process.exit(88);\nthrow new Error('executed');", reason: "Keep candidate code as data." }], missingFiles: ["src/Inert.tsx"],
    } })
    assert.equal(inert.isError, undefined)
    await client.ping()
  } finally { await client.close() }
})

test("official HTTP client negotiates and receives the same readonly change plan from a live endpoint", async () => {
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
      const response = incoming.method === "POST"
        ? await handleHttpPost(new Request("http://127.0.0.1/mcp", {
          method: "POST", headers: { "content-type": "application/json" }, body: Buffer.concat(chunks).toString("utf8"),
        }), { fetchImpl: noFetch })
        : methodNotAllowed()
      outgoing.writeHead(response.status, Object.fromEntries(response.headers))
      outgoing.end(await response.text())
    } catch {
      outgoing.writeHead(500).end()
    }
  })
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve) })
  const address = server.address()
  assert.ok(address && typeof address === "object")
  const client = new Client({ name: "change-plan-http-client", version: "1.0.0" })
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`)))
    const { tools } = await client.listTools()
    assert.deepEqual(tools.find(tool => tool.name === "change_plan"), wire(changeTool))
    const result = await client.callTool({ name: "change_plan", arguments: request })
    assert.equal(result.isError, undefined)
    assert.deepEqual(result.structuredContent, wire(await buildChangePlan(request)))
    await assert.rejects(client.callTool({ name: "change_plan", arguments: invalidRequests[8] }), error =>
      error instanceof McpError && error.code === -32602 && !error.message.includes("PRIVATE_SOURCE"))
    await client.ping()
  } finally {
    await client.close()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  assert.equal(fetches, 0)
})
