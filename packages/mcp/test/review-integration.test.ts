import assert from "node:assert/strict"
import { createServer } from "node:http"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { McpError } from "@modelcontextprotocol/sdk/types.js"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { REVIEW_LIMITS, reviewUi, type ReviewRequest } from "@logic2b/review"
import { handleHttpPost, methodNotAllowed } from "../src/http.ts"
import { ToolInputError } from "../src/limits.ts"
import { runTool, TOOLS } from "../src/tools.ts"

const tool = TOOLS.find(entry => entry.name === "review_ui")!
const validator = new AjvJsonSchemaValidator()
type ValidationSchema = Parameters<typeof validator.getValidator>[0]
const validInput = validator.getValidator(tool.inputSchema as ValidationSchema)
const validOutput = validator.getValidator(tool.outputSchema as ValidationSchema)
const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value))
let registryFetches = 0
const noFetch = async () => { registryFetches++; throw new Error("Static review must not access the registry") }
const basic = (): ReviewRequest => ({ files: [{ path: "src/Control.tsx", content: "<button />" }] })
const complete = (): ReviewRequest => ({ files: [{ ...basic().files[0], labelContext: "complete" }] })
const overflow = (): ReviewRequest => ({ files: [{
  path: "src/Many.tsx", labelContext: "complete", content: `<>${"<button />".repeat(REVIEW_LIMITS.findings + 1)}</>`,
}] })
const sourceAsData: ReviewRequest = { files: [{ path: "src/Inert.tsx", labelContext: "complete", content: [
  'import "https://review.invalid/do-not-import.js";',
  'globalThis.__logic2bReviewIntegrationExecuted = true;',
  'throw new Error("REVIEW_SOURCE_MUST_NOT_EXECUTE");',
  'fetch("https://review.invalid/do-not-fetch");',
  'export const UI = () => <button aria-label="Save customer" />;',
].join("\n") }] }
const suppression: ReviewRequest = { scope: ["tokens"], policy: { semanticColors: true }, files: [{
  path: "src/Brand.tsx", content: '// logic2b-review-disable-next-line L2B-TOK-001 -- approved brand swatch\nconst swatch = <div className="text-red-500" />;',
}] }
const corpus: ReviewRequest[] = [
  basic(), complete(), { ...complete(), schemaVersion: 1, scope: ["tokens"] },
  { ...basic(), scope: ["tokens"], policy: { semanticColors: false } },
  suppression, sourceAsData, overflow(),
]
const invalid: Array<[string, Record<string, unknown>]> = [
  ["absolute path", { files: [{ path: "/PRIVATE_REVIEW_SOURCE.tsx", content: "" }] }],
  ["backslash path", { files: [{ path: "src\\PRIVATE_REVIEW_SOURCE.tsx", content: "" }] }],
  ["private directory", { files: [{ path: ".git/PRIVATE_REVIEW_SOURCE.tsx", content: "" }] }],
  ["dependency directory", { files: [{ path: "node_modules/PRIVATE_REVIEW_SOURCE.tsx", content: "" }] }],
  ["unsupported source type", { files: [{ path: "src/PRIVATE_REVIEW_SOURCE.ts", content: "" }] }],
  ["empty scope", { ...basic(), scope: [] }],
  ["invalid context", { files: [{ ...basic().files[0], labelContext: true }] }],
  ["unsupported external suppression", { ...basic(), suppressions: [] }],
  ["unknown policy", { ...basic(), policy: { forcePrimitives: true } }],
  ["combined UTF-8 budget", { files: Array.from({ length: 3 }, (_, i) => ({ path: `src/Part${i}.tsx`, content: "é".repeat(45_000) })) }],
]

function assertResult(result: unknown, request: ReviewRequest) {
  assert.ok(result && typeof result === "object")
  const envelope = result as Record<string, unknown>
  assert.equal(envelope.isError, undefined)
  assert.ok(Array.isArray(envelope.content))
  assert.equal(envelope.content[0]?.type, "text")
  assert.deepEqual(envelope.structuredContent, JSON.parse(envelope.content[0].text))
  assert.deepEqual(envelope.structuredContent, wire(reviewUi(request)))
  const checked = validOutput(envelope.structuredContent)
  assert.ok(checked.valid, checked.errorMessage ?? "Invalid review result schema")
}

const invalidRpc = (error: unknown) => error instanceof McpError && error.code === -32602
  && error.message.length < 400 && !error.message.includes("PRIVATE_REVIEW_SOURCE")

async function exerciseClient(client: Client) {
  const listed = (await client.listTools()).tools
  assert.equal(listed.length, 22)
  for (const name of ["review_ui", "change_plan", "verify_report", "compose_plan"]) assert.ok(listed.some(entry => entry.name === name))
  assert.deepEqual(listed.find(entry => entry.name === "review_ui"), wire(tool))
  for (const request of corpus) assertResult(await client.callTool({ name: "review_ui", arguments: wire(request) as unknown as Record<string, unknown> }), request)
  for (const [label, args] of invalid) await assert.rejects(client.callTool({ name: "review_ui", arguments: args }), invalidRpc, label)
  await client.ping()
}

test("review preserves optional version, explicit label context, scopes and source-comment suppressions", async () => {
  for (const request of corpus) {
    assert.equal(validInput(request).valid, true)
    assertResult(await runTool("review_ui", request, { fetchImpl: noFetch }), request)
  }
  const partial = reviewUi(basic()), full = reviewUi(complete())
  assert.equal(partial.findings.length, 0)
  assert.ok(partial.unknowns.some(entry => entry.rule === "L2B-A11Y-003"))
  assert.equal(full.findings[0]?.rule, "L2B-A11Y-003")
  assert.equal(full.findings[0]?.severity, "error")
  const disabled = reviewUi({ ...complete(), scope: ["tokens"] })
  assert.deepEqual(disabled.evaluatedRules, [])
  assert.equal(disabled.disabledRules.length, 4)
  const suppressed = reviewUi(suppression)
  assert.equal(suppressed.suppressed[0]?.finding.rule, "L2B-TOK-001")
  assert.equal(suppressed.suppressed[0]?.finding.severity, "error")
  assert.deepEqual(suppressed.summary, { errors: 0, warnings: 0, info: 0 })
  assert.equal((globalThis as Record<string, unknown>).__logic2bReviewIntegrationExecuted, undefined)
  assert.equal(registryFetches, 0)
})

test("review retains the published 256 KiB source allowance and reports output truncation as data", async () => {
  const maximum: ReviewRequest = { files: [{ path: "src/Maximum.tsx", content: "//" + "é".repeat((REVIEW_LIMITS.sourceBytes - 2) / 2) }] }
  assert.equal(new TextEncoder().encode(maximum.files[0].content).length, REVIEW_LIMITS.sourceBytes)
  assertResult(await runTool("review_ui", maximum, { fetchImpl: noFetch }), maximum)
  const result = await runTool("review_ui", overflow(), { fetchImpl: noFetch })
  assertResult(result, overflow())
  assert.equal(result.structuredContent?.truncated, true)
  assert.equal((result.structuredContent?.findings as unknown[]).length, REVIEW_LIMITS.findings)
  assert.equal(registryFetches, 0)
})

test("review output schema rejects corrupt nested evidence and completeness metadata", () => {
  const full = reviewUi(complete()), suppressed = reviewUi(suppression)
  for (const malformed of [
    { ...full, findings: [{ ...full.findings[0], line: 0 }] },
    { ...full, findings: [{ ...full.findings[0], column: "1" }] },
    { ...full, findings: [{ ...full.findings[0], evidence: [17] }] },
    { ...full, findings: [{ ...full.findings[0], confidence: "certain" }] },
    { ...full, unknowns: [{ file: "src/Control.tsx", rule: "parse", line: 1, column: 1, reason: 42 }] },
    { ...suppressed, suppressed: [{ ...suppressed.suppressed[0], finding: { ...suppressed.suppressed[0].finding, severity: "fatal" } }] },
    { ...full, disabledRules: [{ rule: "L2B-TOK-001" }] },
    { ...full, assumptions: [true] },
    { ...full, truncated: "false" },
  ]) assert.equal(validOutput(malformed).valid, false)
})

test("direct and HTTP review reject the extended negative corpus before registry access", async () => {
  for (const [label, args] of invalid) {
    await assert.rejects(runTool("review_ui", args, { fetchImpl: noFetch }), error =>
      error instanceof ToolInputError && !error.message.includes("PRIVATE_REVIEW_SOURCE"), label)
    const response = await handleHttpPost(new Request("https://review.invalid/mcp", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "review_ui", arguments: args } }),
    }), { fetchImpl: noFetch })
    assert.equal(response.status, 200, label)
    const failure = await response.json()
    assert.equal(failure.error.code, -32602, label)
    assert.equal(failure.result, undefined, label)
    assert.ok(failure.error.message.length < 256, label)
    assert.equal(JSON.stringify(failure).includes("PRIVATE_REVIEW_SOURCE"), false, label)
  }
  assert.equal(registryFetches, 0)
})

test("stdio preserves the 22-tool catalog and published review protocol across the regression corpus", async () => {
  const client = new Client({ name: "review-integration-stdio", version: "1.0.0" })
  const transport = new StdioClientTransport({
    command: process.execPath,
    // The release check can explicitly replay this corpus against a freshly built bundle.
    args: process.env.LOGIC2B_REVIEW_BUNDLED === "1" ? ["dist/index.js"] : ["--import", "tsx", "src/index.ts"],
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { LOGIC2B_REGISTRY: "http://127.0.0.1:1" }, stderr: "pipe",
  })
  try { await client.connect(transport); await exerciseClient(client) }
  finally { await client.close() }
})

test("official HTTP client negotiates review and receives matching bounded results from a live endpoint", async () => {
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
      const headers = new Headers()
      for (const [name, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value)
      const response = incoming.method === "POST" ? await handleHttpPost(new Request("http://127.0.0.1/mcp", {
        method: "POST", headers, body: Buffer.concat(chunks).toString("utf8"),
      }), { fetchImpl: noFetch }) : methodNotAllowed()
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text())
    } catch { outgoing.writeHead(500).end() }
  })
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve) })
  const address = server.address(); assert.ok(address && typeof address === "object")
  const client = new Client({ name: "review-integration-http", version: "1.0.0" })
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`)))
    await exerciseClient(client)
  } finally {
    await client.close()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  assert.equal(registryFetches, 0)
})
