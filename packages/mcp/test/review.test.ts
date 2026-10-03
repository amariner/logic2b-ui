import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { fileURLToPath } from "node:url"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { McpError } from "@modelcontextprotocol/sdk/types.js"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { REVIEW_LIMITS, reviewUi, type ReviewRequest } from "@logic2b/review"
import { handleHttpPost } from "../src/http.ts"
import { byteLength, ToolInputError } from "../src/limits.ts"
import { runTool, TOOLS, validateToolArguments } from "../src/tools.ts"

const tool = TOOLS.find((entry) => entry.name === "review_ui")!
const validator = new AjvJsonSchemaValidator()
const validateInput = validator.getValidator(tool.inputSchema)
const validateOutput = validator.getValidator(tool.outputSchema as Parameters<typeof validator.getValidator>[0])
let fetches = 0
const noFetch = async () => {
  fetches += 1
  throw new Error("review_ui must not fetch")
}
const source = [
  'import "https://example.test/must-not-import.js";',
  'globalThis.__reviewExecuted = true;',
  'fetch("https://example.test/must-not-fetch");',
  'console.log("must-not-run");',
  'export const UI = () => <>',
  '  <dialog />',
  '  <input />',
  '  <button />',
  '  <button aria-label="Save" className="text-red-500" />',
  '  <Button />',
  '</>;',
].join("\n")
const request: ReviewRequest = {
  schemaVersion: 1,
  files: [{ path: "src/customer.tsx", content: source }],
  policy: { semanticColors: true },
  suppressions: [{ file: "src/customer.tsx", rule: "L2B-A11Y-003", line: 8, reason: "The host supplies the confirmed accessible name." }],
}
const basic = () => ({ schemaVersion: 1, files: [{ path: "src/ui.tsx", content: "export const UI = () => <button />" }] })
const invalidArguments: Array<[string, () => Record<string, unknown>]> = [
  ["unsupported schema", () => ({ ...basic(), schemaVersion: 2 })],
  ["missing schema", () => ({ files: [] })],
  ["unknown root field", () => ({ ...basic(), cwd: "/private/project" })],
  ["wrong file collection", () => ({ ...basic(), files: "src/ui.tsx" })],
  ["empty file collection", () => ({ ...basic(), files: [] })],
  ["too many files", () => ({ ...basic(), files: Array.from({ length: 65 }, (_, i) => ({ path: `src/f${i}.tsx`, content: "" })) })],
  ["absolute file", () => ({ ...basic(), files: [{ path: "/private/ui.tsx", content: "" }] })],
  ["path traversal", () => ({ ...basic(), files: [{ path: "../private.tsx", content: "" }] })],
  ["duplicate paths", () => ({ ...basic(), files: [...basic().files, ...basic().files] })],
  ["non-string source", () => ({ ...basic(), files: [{ path: "src/ui.tsx", content: 3 }] })],
  ["unknown file field", () => ({ ...basic(), files: [{ ...basic().files[0], execute: true }] })],
  ["UTF-8 file byte budget", () => ({ ...basic(), files: [{ path: "src/ui.tsx", content: "é".repeat(REVIEW_LIMITS.fileBytes / 2 + 1) }] })],
  ["UTF-8 total byte budget", () => ({ ...basic(), files: Array.from({ length: 3 }, (_, i) => ({ path: `src/f${i}.tsx`, content: "é".repeat(45_000) })) })],
  ["wrong policy", () => ({ ...basic(), policy: { semanticColors: "true" } })],
  ["unknown policy", () => ({ ...basic(), policy: { forcePrimitives: true } })],
  ["unknown suppression rule", () => ({ ...basic(), suppressions: [{ file: "src/ui.tsx", rule: "L2B-NOPE-001", line: 1, reason: "Verified consumer context supplies the name." }] })],
  ["absent suppression file", () => ({ ...basic(), suppressions: [{ file: "src/other.tsx", rule: "L2B-A11Y-003", line: 1, reason: "Verified consumer context supplies the name." }] })],
  ["unreasoned suppression", () => ({ ...basic(), suppressions: [{ file: "src/ui.tsx", rule: "L2B-A11Y-003", line: 1, reason: "ignore" }] })],
]
const oversizedResult = () => ({ schemaVersion: 1, files: [{ path: "src/flood.tsx", content: `export const UI = () => <>${"<button />".repeat(REVIEW_LIMITS.findings + 1)}</>` }] })
function assertResult(value: unknown) {
  assert.ok(value && typeof value === "object")
  const result = value as Record<string, unknown>
  assert.equal(result.isError, undefined)
  assert.ok(Array.isArray(result.content))
  const content = result.content as Array<{ type: string; text: string }>
  assert.equal(content[0]?.type, "text")
  assert.deepEqual(result.structuredContent, JSON.parse(content[0]!.text))
  const checked = validateOutput(result.structuredContent)
  assert.ok(checked.valid, checked.errorMessage ?? "Invalid review result schema")
  assert.deepEqual(result.structuredContent, reviewUi(request))
}

describe("review_ui adapter", () => {
  test("shares core schemas, evidence, suppression and typed/text parity without executing source", async () => {
    assert.equal(validateInput(request).valid, true)
    assert.deepEqual(validateToolArguments("review_ui", request), request)
    assert.equal(tool.annotations.openWorldHint, false)
    const result = await runTool("review_ui", request, { fetchImpl: noFetch })
    assertResult(result)
    const output = reviewUi(request)
    assert.equal(output.summary.errors, 2)
    assert.ok(output.findings.some((finding) => finding.category === "design-policy"))
    assert.equal(output.suppressed[0]?.finding.rule, "L2B-A11Y-003")
    assert.ok(output.unknowns.length > 0)
    assert.ok(byteLength(JSON.stringify(output)) <= REVIEW_LIMITS.outputBytes)
    assert.equal((globalThis as Record<string, unknown>).__reviewExecuted, undefined)
    assert.equal(fetches, 0)
  })

  test("output schema rejects malformed nested findings, suppressions and unknowns", () => {
    const result = reviewUi(request)
    assert.equal(validateOutput({ ...result, findings: [{ ...result.findings[0], line: "one" }] }).valid, false)
    assert.equal(validateOutput({ ...result, suppressed: [{ finding: {}, reason: "reason" }] }).valid, false)
    assert.equal(validateOutput({ ...result, unknowns: [{ file: "src/ui.tsx" }] }).valid, false)
  })

  for (const [label, args] of invalidArguments) test(`rejects ${label} before I/O`, async () => {
    assert.throws(() => validateToolArguments("review_ui", args()), ToolInputError)
    await assert.rejects(() => runTool("review_ui", args(), { fetchImpl: noFetch }), (error: unknown) => {
      assert.ok(error instanceof ToolInputError)
      assert.ok(error.message.length <= 301)
      return true
    })
    assert.equal(fetches, 0)
  })

  test("rejects an over-budget result with an actionable bounded error", async () => {
    assert.doesNotThrow(() => validateToolArguments("review_ui", oversizedResult()))
    await assert.rejects(() => runTool("review_ui", oversizedResult(), { fetchImpl: noFetch }), ToolInputError)
    assert.equal(fetches, 0)
  })
})

describe("review_ui actual stdio protocol", () => {
  const client = new Client({ name: "review-stdio-test", version: "0.0.0" })
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/index.ts"],
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { LOGIC2B_REGISTRY: "http://127.0.0.1:1" },
    stderr: "pipe",
  })
  before(async () => { await client.connect(transport) })
  after(async () => { await client.close() })

  test("advertises the same schema and returns core-equivalent evidence", async () => {
    const listed = (await client.listTools()).tools.find((entry) => entry.name === "review_ui")!
    assert.deepEqual(listed.inputSchema, tool.inputSchema)
    assert.deepEqual(listed.outputSchema, tool.outputSchema)
    assertResult(await client.callTool({ name: "review_ui", arguments: request as unknown as Record<string, unknown> }))
  })

  test("returns invalid params for the bounded negative corpus and remains usable", async () => {
    for (const [, args] of [...invalidArguments, ["result overflow", oversizedResult] as [string, () => Record<string, unknown>]]) {
      await assert.rejects(() => client.callTool({ name: "review_ui", arguments: args() }),
        (error: unknown) => error instanceof McpError && error.code === -32602 && error.message.length < 400)
    }
    await client.ping()
  })
})

describe("review_ui HTTP protocol", () => {
  async function post(args: unknown) {
    const response = await handleHttpPost(new Request("https://reg.test/mcp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "review_ui", arguments: args } }),
    }), { fetchImpl: noFetch })
    assert.equal(response.status, 200)
    return response.json()
  }

  test("shares the same successful result through actual JSON-RPC envelopes", async () => {
    const body = await post(request)
    assertResult(body.result)
    assert.equal(fetches, 0)
  })

  test("rejects invalid requests and result overflow as -32602 before network access", async () => {
    for (const [, args] of [...invalidArguments, ["result overflow", oversizedResult] as [string, () => Record<string, unknown>]]) {
      const body = await post(args())
      assert.equal(body.error.code, -32602)
      assert.equal(body.result, undefined)
      assert.ok(body.error.message.length <= 301)
    }
    assert.equal(fetches, 0)
  })
})
