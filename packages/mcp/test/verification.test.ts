import assert from "node:assert/strict"
import { createServer } from "node:http"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { McpError } from "@modelcontextprotocol/sdk/types.js"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { summarizeVerificationReport, VERIFICATION_LIMITS, type VerificationReportV1 } from "@logic2b/scaffold/verification"
import { handleHttpPost, methodNotAllowed } from "../src/http.ts"
import { ToolInputError } from "../src/limits.ts"
import { runTool, TOOLS } from "../src/tools.ts"
import { verificationReport } from "./helpers/verification-report.ts"

const tool = TOOLS.find(entry => entry.name === "verify_report")!
const validator = new AjvJsonSchemaValidator().getValidator(tool.outputSchema)
const inputValidator = new AjvJsonSchemaValidator().getValidator(tool.inputSchema)
const wire = (value: unknown) => JSON.parse(JSON.stringify(value))
let fetches = 0
const noFetch = async () => { fetches++; throw new Error("Report summarization must not fetch") }
const invalid = (error: unknown) => error instanceof ToolInputError && error.message.length < 400 && !error.message.includes("PRIVATE_REPORT_DATA")
const invalidRpc = (error: unknown) => error instanceof McpError && error.code === -32602 && !error.message.includes("PRIVATE_REPORT_DATA")

function malformed(report: VerificationReportV1): unknown[] {
  return [
    {}, null, [], { ...report, schemaVersion: 2 }, { ...report, private: "PRIVATE_REPORT_DATA" },
    { ...report, origin: "file:///PRIVATE_REPORT_DATA" },
    { ...report, origin: "http://PRIVATE_REPORT_DATA:secret@localhost:3000" },
    { ...report, origin: "http://localhost:3000/PRIVATE_REPORT_DATA" },
    { ...report, suiteSha256: "a".repeat(64) },
    { ...report, suite: { ...report.suite, schemaVersion: 2 } },
    { ...report, suite: { ...report.suite, scenarios: [{ ...report.suite.scenarios[0], steps: [{ type: "execute", script: "PRIVATE_REPORT_DATA" }] }] } },
    { ...report, suite: { ...report.suite, projectFiles: ["../PRIVATE_REPORT_DATA"] } },
    { ...report, project: { ...report.project, fingerprint: "a".repeat(64) } },
    { ...report, project: { ...report.project, servedSourceBinding: "verified" } },
    { ...report, project: { ...report.project, files: [{ path: "src/Customers.tsx", sha256: "PRIVATE_REPORT_DATA" }] } },
    { ...report, tools: [{ name: "playwright", version: "" }] },
    { ...report, tools: [...report.tools, report.tools[0]] },
    { ...report, evidence: [{ ...report.evidence[0], sha256: "PRIVATE_REPORT_DATA" }, ...report.evidence.slice(1)] },
    { ...report, evidence: [{ ...report.evidence[0], tool: "PRIVATE_REPORT_DATA" }, ...report.evidence.slice(1)] },
    { ...report, evidence: [{ ...report.evidence[0], content: "PRIVATE_REPORT_DATA" }, ...report.evidence.slice(1)] },
    { ...report, checks: [{ ...report.checks[0], status: "PRIVATE_REPORT_DATA" }, ...report.checks.slice(1)] },
    { ...report, checks: [{ ...report.checks[0], evidenceIds: ["PRIVATE_REPORT_DATA"] }, ...report.checks.slice(1)] },
    { ...report, checks: [...report.checks, report.checks[0]] },
    { ...report, runs: [...report.runs, report.runs[0]] },
    { ...report, checks: [{ ...report.checks[0], checkId: "PRIVATE_REPORT_DATA" }, ...report.checks.slice(1)] },
    { ...report, runs: [{ ...report.runs[0], viewportId: "PRIVATE_REPORT_DATA" }, ...report.runs.slice(1)] },
    { ...report, notes: ["PRIVATE_REPORT_DATA" + "x".repeat(VERIFICATION_LIMITS.reportBytes)] },
    { ...report, notes: ["PRIVATE_REPORT_DATA\ud800"] },
    { ...report, evidence: Array.from({ length: VERIFICATION_LIMITS.evidence + 1 }, (_, i) => ({ ...report.evidence[0], id: `evidence-${i}` })) },
    { ...report, checks: [{ ...report.checks[0], evidenceIds: [] }, ...report.checks.slice(1)] },
    { ...report, checks: report.checks.map(check => check.checkId === "accessibility" ? { ...check, evidenceIds: ["desktop-heading"] } : check) },
    { ...report, checks: report.checks.map(check => check.checkId === "visual" ? { ...check, evidenceIds: ["desktop-heading"] } : check) },
  ]
}

test("verify_report returns the strict shared summary with readonly annotations and visible trust limits", async () => {
  const report = await verificationReport()
  assert.ok(inputValidator(report).valid)
  const result = await runTool("verify_report", report, { fetchImpl: noFetch })
  assert.equal(result.isError, undefined)
  assert.deepEqual(result.structuredContent, wire(await summarizeVerificationReport(report)))
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
  assert.equal(result.structuredContent!.status, "pass")
  assert.equal(result.structuredContent!.expectedChecks, 8)
  assert.equal(result.structuredContent!.reportedChecks, 8)
  assert.deepEqual(result.structuredContent!.tools, report.tools)
  assert.deepEqual(result.structuredContent!.evidence, report.evidence)
  assert.deepEqual(result.structuredContent!.viewports, report.suite.viewports)
  assert.equal(result.structuredContent!.origin, report.origin)
  const valid = validator(result.structuredContent); assert.ok(valid.valid, valid.errorMessage)
  assert.match(JSON.stringify(result.structuredContent!.limitations), /host|claim|authentic/i)
  assert.match(JSON.stringify(result.structuredContent!.limitations), /source|selected|served/i)
  assert.deepEqual(tool.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false })
  for (const bad of [
    { ...result.structuredContent, extra: true }, { ...result.structuredContent, schemaVersion: 2 },
    { ...result.structuredContent, status: "approved" }, { ...result.structuredContent, counts: {} },
    { ...result.structuredContent, projectFingerprint: "not-a-hash" },
    { ...result.structuredContent, checks: [{ ...report.checks[0], assertion: "execute" }] },
  ]) assert.equal(validator(bad).valid, false)
  assert.equal(fetches, 0)
})

test("static or human passes and absent run records cannot establish browser success", async () => {
  for (const kind of ["static", "human-reviewed"] as const) {
    const report = await verificationReport()
    report.checks = report.checks.map(check => ({ ...check, kind }))
    report.evidence = report.evidence.map(evidence => ({ ...evidence, kind: kind === "static" ? "static-result" : "human-note" }))
    const result = await runTool("verify_report", report, { fetchImpl: noFetch })
    assert.equal(result.isError, undefined)
    assert.equal(result.structuredContent!.status, "unknown")
    assert.deepEqual(result.structuredContent!.counts, { pass: 0, fail: 0, skipped: 0, unknown: 8 })
  }
  const report = await verificationReport()
  const noRuns = await runTool("verify_report", { ...report, runs: [] }, { fetchImpl: noFetch })
  assert.equal(noRuns.structuredContent!.status, "unknown")
  const skippedRun = await runTool("verify_report", { ...report, runs: report.runs.map(run => ({ ...run, status: "skipped", reason: "The host lacked its browser capability." })) }, { fetchImpl: noFetch })
  assert.equal(skippedRun.structuredContent!.status, "skipped")
  const failedRun = await runTool("verify_report", { ...report, runs: report.runs.map(run => ({ ...run, status: "fail", failedStep: 0, reason: "Navigation failed after the recorded checks." })) }, { fetchImpl: noFetch })
  assert.equal(failedRun.structuredContent!.status, "fail")
  assert.equal(fetches, 0)
})

test("verify_report preserves fail, skipped and unknown and cannot pass missing declared coverage", async () => {
  for (const status of ["fail", "skipped", "unknown"] as const) {
    const report = await verificationReport(status)
    const result = await runTool("verify_report", report, { fetchImpl: noFetch })
    assert.equal(result.isError, undefined)
    assert.equal(result.structuredContent!.status, status)
    assert.deepEqual(result.structuredContent, wire(await summarizeVerificationReport(report)))
    assert.ok(validator(result.structuredContent).valid)
  }
  const report = await verificationReport()
  const incomplete = { ...report, checks: report.checks.slice(0, 4), runs: report.runs.slice(0, 1) }
  const result = await runTool("verify_report", incomplete, { fetchImpl: noFetch })
  assert.equal(result.isError, undefined)
  assert.equal(result.structuredContent!.status, "unknown")
  assert.equal(result.structuredContent!.expectedChecks, 8)
  assert.equal(result.structuredContent!.reportedChecks, 4)
  assert.ok(validator(result.structuredContent).valid)
  assert.equal(fetches, 0)
})

test("verify_report rejects malformed proofs, hash mismatches, unknown versions and bounded-input violations without echo", async () => {
  for (const [index, report] of malformed(await verificationReport()).entries()) {
    await assert.rejects(runTool("verify_report", report, { fetchImpl: noFetch }), invalid, `Invalid report ${index} must reject safely.`)
  }
  assert.equal(fetches, 0)
})

test("HTTP verification reports match shared summaries and map every malformed proof to invalid params", async () => {
  for (const status of ["pass", "fail", "skipped", "unknown"] as const) {
    const report = await verificationReport(status)
    const response = await handleHttpPost(new Request("https://registry.test/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "verify_report", arguments: report } }) }), { fetchImpl: noFetch })
    assert.equal(response.status, 200)
    const rpc = await response.json()
    assert.equal(rpc.error, undefined)
    assert.equal(rpc.result.isError, undefined)
    assert.deepEqual(rpc.result.structuredContent, wire(await summarizeVerificationReport(report)))
    assert.deepEqual(rpc.result.structuredContent, JSON.parse(rpc.result.content[0].text))
  }
  for (const report of malformed(await verificationReport())) {
    const response = await handleHttpPost(new Request("https://registry.test/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "verify_report", arguments: report } }) }), { fetchImpl: noFetch })
    const failure = await response.json()
    assert.equal(failure.error.code, -32602)
    assert.equal(JSON.stringify(failure).includes("PRIVATE_REPORT_DATA"), false)
  }
  assert.equal(fetches, 0)
})

test("actual stdio validates report output, keeps source-like strings inert and rejects malformed proofs", async () => {
  const client = new Client({ name: "verification-protocol-test", version: "1.0.0" })
  const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "src/index.ts"], cwd: fileURLToPath(new URL("../", import.meta.url)), env: { LOGIC2B_REGISTRY: "http://127.0.0.1:1" }, stderr: "pipe" })
  try {
    await client.connect(transport)
    const { tools } = await client.listTools()
    assert.deepEqual(tools.find(entry => entry.name === "verify_report"), wire(tool))
    for (const status of ["pass", "fail", "skipped", "unknown"] as const) {
      const report = await verificationReport(status)
      report.notes.push("process.exit(88); throw new Error('source-like report data must never execute');")
      const result = await client.callTool({ name: "verify_report", arguments: wire(report) })
      assert.equal(result.isError, undefined)
      assert.deepEqual(result.structuredContent, wire(await summarizeVerificationReport(report)))
    }
    for (const report of malformed(await verificationReport()).filter(value => typeof value === "object" && value !== null && !Array.isArray(value))) await assert.rejects(client.callTool({ name: "verify_report", arguments: wire(report) }), invalidRpc)
    await client.ping()
  } finally { await client.close() }
})

test("official HTTP client receives the same summary from a live endpoint without opening evidence references", async () => {
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
      const response = incoming.method === "POST" ? await handleHttpPost(new Request("http://127.0.0.1/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: Buffer.concat(chunks).toString("utf8") }), { fetchImpl: noFetch }) : methodNotAllowed()
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text())
    } catch { outgoing.writeHead(500).end() }
  })
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve) })
  const address = server.address(); assert.ok(address && typeof address === "object")
  const client = new Client({ name: "verification-http-client", version: "1.0.0" })
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`)))
    const { tools } = await client.listTools()
    assert.deepEqual(tools.find(entry => entry.name === "verify_report"), wire(tool))
    const report = await verificationReport()
    report.evidence = report.evidence.map(evidence => ({ ...evidence, reference: `https://evidence.invalid/${evidence.id}.json` }))
    const result = await client.callTool({ name: "verify_report", arguments: wire(report) })
    assert.equal(result.isError, undefined)
    assert.deepEqual(result.structuredContent, wire(await summarizeVerificationReport(report)))
    await assert.rejects(client.callTool({ name: "verify_report", arguments: { ...report, suiteSha256: "a".repeat(64) } }), invalidRpc)
    await client.ping()
  } finally {
    await client.close()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  assert.equal(fetches, 0)
})
