import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { test } from "node:test"
import { hashVerificationSuite, projectFingerprint, summarizeVerificationReport, validateVerificationReport, validateVerificationSuite, VerificationError, VERIFICATION_LIMITS, type VerificationCheck, type VerificationReportV1, type VerificationSuiteV1 } from "../src/verification.ts"
const hash = (value: string) => createHash("sha256").update(value).digest("hex")
const suite = (): VerificationSuiteV1 => ({ schemaVersion: 1, projectFiles: ["src/customers.tsx", "package.json"], planId: hash("incremental-plan"), viewports: [{ id: "desktop", width: 1280, height: 800 }, { id: "mobile", width: 390, height: 844 }], scenarios: [{ id: "customers", route: "/customers?state=empty", steps: [
  { type: "check", id: "empty", assertion: "visible", target: { by: "role", role: "heading", name: "No customers yet" } },
  { type: "action", action: "click", target: { by: "role", role: "button", name: "Create customer" } },
  { type: "check", id: "layout", assertion: "overflow" }, { type: "check", id: "visual", assertion: "screenshot" }, { type: "check", id: "a11y", assertion: "axe" },
] }] })
async function report(): Promise<VerificationReportV1> {
  const input = validateVerificationSuite(suite()), files = input.projectFiles.map(path => ({ path, sha256: hash(path) }))
  return { schemaVersion: 1, origin: "http://127.0.0.1:4321", suite: input, suiteSha256: await hashVerificationSuite(input), project: { scope: "selected-files", fingerprint: await projectFingerprint(files), files, servedSourceBinding: "unverified" }, tools: [{ name: "playwright", version: "1.55.0" }, { name: "axe-core", version: "4.10.0" }], runs: input.viewports.map(viewport => ({ scenarioId: "customers", viewportId: viewport.id, status: "pass", reason: "Completed the declared interaction." })), checks: input.viewports.flatMap(viewport => input.scenarios[0].steps.filter((step): step is VerificationCheck => step.type === "check").map(step => ({ scenarioId: "customers", viewportId: viewport.id, checkId: step.id, kind: "browser-measured", status: "pass", reason: "Measured the declared assertion.", evidenceIds: [step.assertion === "axe" ? "a11y" : step.assertion === "screenshot" ? "visual" : "trace"] }))), evidence: [{ id: "trace", kind: "log", reference: "evidence/checks.json", sha256: hash("log"), tool: "playwright" }, { id: "visual", kind: "screenshot", reference: "evidence/customers.png", sha256: hash("screenshot"), tool: "playwright" }, { id: "a11y", kind: "axe", reference: "evidence/axe.json", sha256: hash("axe"), tool: "axe-core" }], notes: ["Synthetic customer data only."] }
}

test("validates replayable browser reports with exact selected files, routes, viewports and evidence tools", async () => {
  const input = await report(), validated = await validateVerificationReport(input), summary = await summarizeVerificationReport(input)
  assert.deepEqual(validated, input)
  assert.equal(summary.status, "pass"); assert.equal(summary.expectedChecks, 8); assert.equal(summary.reportedChecks, 8)
  assert.deepEqual(summary.counts, { pass: 8, fail: 0, skipped: 0, unknown: 0 }); assert.deepEqual(summary.runCounts, { pass: 2, fail: 0, skipped: 0, unknown: 0 })
  assert.equal(summary.origin, input.origin); assert.deepEqual(summary.viewports, input.suite.viewports); assert.deepEqual(summary.evidence, input.evidence); assert.deepEqual(summary.tools, input.tools)
  assert.ok(summary.checks.every(value => value.route === "/customers?state=empty")); assert.equal(summary.planId, input.suite.planId)
  assert.match(summary.limitations.join(" "), /not retrieved|selected files|visual review|WCAG/)
  assert.deepEqual(input, await report(), "Pure validation must not modify supplied reports.")
})
test("fingerprints are canonical across object-key and selected-file ordering but bind routes, source hashes and plans", async () => {
  const input = suite(), first = await hashVerificationSuite(input), reversed = { ...Object.fromEntries(Object.entries(input).reverse()), projectFiles: [...input.projectFiles].reverse() }
  assert.equal(await hashVerificationSuite(reversed), first)
  assert.notEqual(await hashVerificationSuite({ ...input, planId: hash("different-plan") }), first)
  assert.notEqual(await hashVerificationSuite({ ...input, scenarios: input.scenarios.map(value => ({ ...value, route: "/other" })) }), first)
  const files = [{ path: "src/a.tsx", sha256: hash("a") }, { path: "src/b.tsx", sha256: hash("b") }]
  assert.equal(await projectFingerprint(files), await projectFingerprint([...files].reverse()))
  assert.notEqual(await projectFingerprint(files), await projectFingerprint([{ ...files[0], sha256: hash("changed") }, files[1]]))
})
test("missing results and omitted scenario runs remain unknown even when every submitted assertion passed", async () => {
  const input = await report()
  for (const incomplete of [{ ...input, checks: input.checks.slice(0, -1) }, { ...input, runs: input.runs.slice(0, 1) }, { ...input, checks: [], runs: [] }]) {
    const summary = await summarizeVerificationReport(incomplete)
    assert.equal(summary.status, "unknown"); assert.equal(summary.expectedChecks, 8); assert.equal(summary.runs.length, 2)
    assert.ok(summary.runCounts.unknown > 0)
  }
  const missing = await summarizeVerificationReport({ ...input, checks: input.checks.slice(0, -1) })
  assert.equal(missing.counts.unknown, 1); assert.match(missing.checks.at(-1)!.reason, /No result/)
})
test("action failure after the last passing assertion still fails the scenario and report", async () => {
  const input = await report()
  input.suite.scenarios[0].steps.push({ type: "action", action: "click", target: { by: "role", role: "button", name: "Save customer" } })
  input.suiteSha256 = await hashVerificationSuite(input.suite)
  input.runs[0] = { ...input.runs[0], status: "fail", failedStep: 5, reason: "Save button did not become actionable before timeout." }
  const summary = await summarizeVerificationReport(input)
  assert.equal(summary.status, "fail"); assert.equal(summary.counts.pass, 8); assert.equal(summary.runCounts.fail, 1); assert.equal(summary.runs[0].failedStep, 5)
})
test("failed checks override a claimed passing run and failed runs dominate unknown or skipped coverage", async () => {
  const input = await report()
  input.checks[0].status = "fail"; input.checks[0].reason = "Expected empty state is absent."
  input.checks[1].status = "skipped"; input.checks[2].status = "unknown"
  const summary = await summarizeVerificationReport(input)
  assert.equal(summary.status, "fail"); assert.equal(summary.runs[0].status, "fail"); assert.equal(summary.counts.fail, 1)
})
test("missing capabilities are skipped with reasons rather than green or fabricated browser evidence", async () => {
  const input = await report()
  input.tools = []; input.evidence = []; input.runs = input.runs.map(value => ({ ...value, status: "skipped", reason: "Host browser capability unavailable." }))
  input.checks = input.checks.map(value => ({ ...value, status: "skipped", reason: "Host browser capability unavailable.", evidenceIds: [] }))
  const summary = await summarizeVerificationReport(input)
  assert.equal(summary.status, "skipped"); assert.equal(summary.counts.skipped, 8); assert.equal(summary.runCounts.skipped, 2)
})
test("static analysis and human review cannot satisfy browser-measured assertions", async () => {
  for (const kind of ["static", "human-reviewed"] as const) {
    const input = await report()
    input.evidence = [{ id: "manual", kind: kind === "static" ? "static-result" : "human-note", reference: "evidence/review.json", sha256: hash("review"), tool: "playwright" }]
    input.checks = input.checks.map(value => ({ ...value, kind, evidenceIds: ["manual"] }))
    const summary = await summarizeVerificationReport(input)
    assert.equal(summary.status, "unknown"); assert.equal(summary.counts.unknown, 8); assert.ok(summary.checks.every(value => value.kind === kind))
  }
})
test("pass or fail requires compatible evidence and declared tool versions; references are never fetched", async () => {
  const input = await report(), originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error("Verification unexpectedly fetched evidence") }
  try {
    input.evidence[0].reference = "https://example.invalid/private/evidence.json"
    assert.equal((await summarizeVerificationReport(input)).status, "pass")
    const malformed = [
      { ...input, evidence: [] }, { ...input, tools: [] },
      { ...input, checks: input.checks.map((value, index) => index === 0 ? { ...value, evidenceIds: [] } : value) },
      { ...input, checks: input.checks.map((value, index) => index === 3 ? { ...value, evidenceIds: ["trace"] } : value) },
      { ...input, checks: input.checks.map((value, index) => index === 2 ? { ...value, evidenceIds: ["trace"] } : value) },
    ]
    for (const value of malformed) await assert.rejects(validateVerificationReport(value), VerificationError)
  } finally { globalThis.fetch = originalFetch }
})
test("rejects altered suite/source fingerprints and missing, extra or ambiguous selected-file evidence", async () => {
  const input = await report()
  for (const value of [
    { ...input, suiteSha256: hash("stale-suite") },
    { ...input, suite: { ...input.suite, planId: hash("other-plan") } },
    { ...input, project: { ...input.project, fingerprint: hash("stale-source") } },
    { ...input, project: { ...input.project, files: input.project.files.slice(1) } },
    { ...input, project: { ...input.project, files: [...input.project.files, { path: "extra.tsx", sha256: hash("extra") }] } },
    { ...input, project: { ...input.project, files: [...input.project.files, input.project.files[0]] } },
    { ...input, project: { ...input.project, servedSourceBinding: "verified" } },
    { ...input, project: { ...input.project, scope: "whole-project" } },
  ]) await assert.rejects(validateVerificationReport(value), VerificationError)
})
test("rejects duplicate, extraneous and contradictory run/check records without echoing private content", async () => {
  const input = await report()
  for (const value of [
    { ...input, checks: [...input.checks, input.checks[0]] }, { ...input, runs: [...input.runs, input.runs[0]] },
    { ...input, checks: [{ ...input.checks[0], scenarioId: "PRIVATE_SOURCE" }] },
    { ...input, checks: [{ ...input.checks[0], viewportId: "unknown" }] },
    { ...input, checks: [{ ...input.checks[0], checkId: "other" }] },
    { ...input, runs: [{ ...input.runs[0], failedStep: 0 }] },
    { ...input, runs: [{ ...input.runs[0], status: "fail", failedStep: 5 }] },
    { ...input, runs: [{ ...input.runs[0], reason: "" }] },
    { ...input, checks: [{ ...input.checks[0], kind: "heuristic" }] },
    { ...input, evidence: [...input.evidence, input.evidence[0]] },
    { ...input, tools: [...input.tools, input.tools[0]] },
    { ...input, execute: "PRIVATE_SOURCE" }, { ...input, schemaVersion: 2 },
  ]) await assert.rejects(validateVerificationReport(value), error => error instanceof VerificationError && !error.message.includes("PRIVATE_SOURCE"))
})
test("accepts all known action/assertion forms with literal semantic selectors and explicit axe exclusions", async () => {
  const input = suite(), target = { by: "label", value: "Customer name" } as const
  input.scenarios[0].steps = [
    { type: "action", action: "fill", target, value: "Alex\nExample" }, { type: "action", action: "select", target, value: "active" }, { type: "action", action: "press", target, value: "Shift+Tab" }, { type: "action", action: "text-scale", value: 200 },
    ...(["visible", "hidden", "enabled", "disabled", "focused"] as const).map(assertion => ({ type: "check" as const, id: assertion, assertion, target })),
    ...(["text", "value", "accessible-description"] as const).map(assertion => ({ type: "check" as const, id: assertion, assertion, target, expected: "Customer" })),
    { type: "check", id: "attribute", assertion: "attribute", target, name: "aria-invalid", expected: null },
    { type: "check", id: "count", assertion: "count", target: { by: "role", role: "row" }, expected: 3 },
    { type: "check", id: "order", assertion: "order", target: { by: "test-id", value: "customer-row" }, expected: ["Alex Example", "Bea Example"] },
    { type: "check", id: "axe", assertion: "axe", disabledRules: ["color-contrast"] },
  ]
  assert.deepEqual(validateVerificationSuite(input).scenarios, input.scenarios)
  const evidence = await report()
  evidence.suite.scenarios[0].steps[4] = { type: "check", id: "a11y", assertion: "axe", disabledRules: ["color-contrast"] }; evidence.suiteSha256 = await hashVerificationSuite(evidence.suite)
  const summary = await summarizeVerificationReport(evidence)
  assert.match(summary.limitations.join(" "), /disable rules/)
  assert.deepEqual(summary.checks.find(value => value.checkId === "a11y")!.disabledRules, ["color-contrast"])
})
test("scenario format forbids executable steps, unsafe file targets, origins in routes and duplicate ids", () => {
  const input = suite(), scenario = input.scenarios[0]
  const malformed = [
    { ...input, schemaVersion: 2 }, { ...input, projectFiles: [] }, { ...input, projectFiles: ["../PRIVATE_SOURCE"] }, { ...input, projectFiles: [".env.local"] },
    { ...input, projectFiles: ["src/a.tsx", "SRC/A.tsx"] }, { ...input, projectFiles: ["src/a", "src/a/b"] }, { ...input, projectFiles: ["./src/a.tsx"] },
    { ...input, viewports: [] }, { ...input, viewports: [input.viewports[0], input.viewports[0]] }, { ...input, viewports: [{ ...input.viewports[0], width: 100 }] },
    { ...input, scenarios: [] }, { ...input, scenarios: [scenario, scenario] },
    ...["https://private.invalid/", "//private.invalid/", "/\\private.invalid", "/a b"].map(route => ({ ...input, scenarios: [{ ...scenario, route }] })),
    { ...input, scenarios: [{ ...scenario, steps: [{ type: "action", action: "click", target: { by: "text", value: "Only action" } }] }] },
    { ...input, scenarios: [{ ...scenario, steps: [{ type: "action", action: "evaluate", source: "PRIVATE_SOURCE" }, scenario.steps[0]] }] },
    { ...input, scenarios: [{ ...scenario, steps: [{ ...scenario.steps[0], target: { by: "css", value: "body" } }] }] },
    { ...input, scenarios: [{ ...scenario, steps: [scenario.steps[0], scenario.steps[0]] }] },
    { ...input, scenarios: [{ ...scenario, steps: [{ type: "action", action: "text-scale", value: 900 }, scenario.steps[0]] }] },
  ]
  for (const value of malformed) assert.throws(() => validateVerificationSuite(value), error => error instanceof VerificationError && !error.message.includes("PRIVATE_SOURCE"))
})
test("evidence references reject executable URLs, credentials, traversal and unsupported origin shapes", async () => {
  const input = await report()
  for (const reference of ["javascript:PRIVATE_SOURCE", "file:///private/secret", "data:PRIVATE_SOURCE", "../secret.png", "https://user:PRIVATE_SOURCE@example.com/evidence", "evidence/\ud800.png"]) await assert.rejects(validateVerificationReport({ ...input, evidence: input.evidence.map((value, index) => index === 0 ? { ...value, reference } : value) }), VerificationError)
  for (const origin of ["https://user:PRIVATE_SOURCE@example.com", "file:///secret", "http://localhost/path", "http://localhost?token=PRIVATE_SOURCE", "http://localhost/", "HTTP://LOCALHOST"]) await assert.rejects(validateVerificationReport({ ...input, origin }), VerificationError)
  assert.equal((await validateVerificationReport({ ...input, origin: "https://example.invalid" })).origin, "https://example.invalid")
})
test("bounded counts, Unicode and matrix size reject before transport can imply coverage", async () => {
  const input = suite()
  const scenarios = Array.from({ length: 16 }, (_, index) => ({ id: `scenario${index}`, route: "/", steps: Array.from({ length: 9 }, (_, index) => ({ type: "check", id: `check${index}`, assertion: "overflow" })) }))
  for (const value of [
    { ...input, scenarios }, { ...input, projectFiles: Array.from({ length: 65 }, (_, index) => `src/${index}.ts`) },
    { ...input, scenarios: [{ ...input.scenarios[0], steps: Array.from({ length: 65 }, (_, index) => ({ type: "check", id: `check${index}`, assertion: "overflow" })) }] },
    { ...input, scenarios: [{ ...input.scenarios[0], route: "/\ud800" }] },
    { ...input, scenarios: [{ ...input.scenarios[0], steps: ["huge", "huge2"].map(id => ({ type: "check", id, assertion: "order", target: { by: "text", value: "rows" }, expected: Array.from({ length: 128 }, () => "€".repeat(2048)) })) }] },
    { ...input, ignored: "x".repeat(VERIFICATION_LIMITS.reportBytes) },
  ]) assert.throws(() => validateVerificationSuite(value), VerificationError)
  const evidence = await report()
  await assert.rejects(validateVerificationReport({ ...evidence, notes: Array.from({ length: 33 }, () => "Note") }), VerificationError)
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic
  assert.throws(() => validateVerificationSuite(cyclic), VerificationError)
})
