import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { execFile } from "node:child_process"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { validateVerificationReport, type VerificationSuiteV1, type VerificationStep } from "@logic2b/scaffold/verification"
import { verifyLocal } from "../src/verify.ts"

const execFileAsync = promisify(execFile)
const packageRoot = fileURLToPath(new URL("../", import.meta.url))
const browserExecutable = process.env.PLAYWRIGHT_CHROMIUM_PATH
const source = "// Independent synthetic consumer source fingerprint.\n"
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Verification test</title><style>*{box-sizing:border-box}body{margin:1rem;background:white;color:black;font-family:sans-serif}main{max-width:40rem}h1{font-size:1.5rem;overflow-wrap:anywhere}input,select{display:block;max-width:100%;font:inherit}button{font:inherit}p{overflow-wrap:anywhere}</style></head><body><main><h1>Customers</h1><label for="customer">Customer name</label><input id="customer" aria-describedby="hint"><p id="hint">Use a synthetic name.</p><label for="status">Status</label><select id="status"><option value="active">Active</option><option value="archived">Archived</option></select><button id="save" onclick="document.querySelector('[role=status]').textContent='Saved';">Save</button><button disabled>Delete</button><p role="status" aria-live="polite">Ready</p><ul><li>Alma</li><li>Bruno</li></ul><p hidden data-testid="hidden">Hidden</p></main></body></html>`
const heading: VerificationStep = { type: "check", id: "heading", assertion: "visible", target: { by: "role", role: "heading", name: "Customers" } }
const name = { by: "label" as const, value: "Customer name" }
const button = { by: "role" as const, role: "button", name: "Save" }
const suite = (steps: VerificationStep[] = [heading]): VerificationSuiteV1 => ({ schemaVersion: 1, projectFiles: ["src/Customers.tsx"], viewports: [{ id: "desktop", width: 1280, height: 800 }], scenarios: [{ id: "customers", route: "/customers", steps }] })

async function fixture(t: { after: (fn: () => Promise<void>) => void }, handler?: (request: IncomingMessage, response: ServerResponse, cwd: string) => void | Promise<void>) {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-verify-browser-"))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  await mkdir(join(cwd, "src")); await writeFile(join(cwd, "package.json"), '{"private":true}'); await writeFile(join(cwd, "src/Customers.tsx"), source)
  await symlink(join(packageRoot, "node_modules"), join(cwd, "node_modules"), "dir")
  const server = createServer((request, response) => {
    void (async () => {
      if (handler) return handler(request, response, cwd)
      if (request.url === "/missing") return response.writeHead(404).end("Missing")
      response.writeHead(200, { "content-type": "text/html" }).end(html)
    })().catch(() => response.writeHead(500).end("Fixture failed"))
  })
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve) })
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
  const address = server.address(); assert.ok(address && typeof address === "object")
  const url = `http://127.0.0.1:${address.port}`
  return { cwd, url, server, run: (selected: VerificationSuiteV1, output = "result", timeoutMs = 300) => verifyLocal({ cwd, suite: selected, url, output: join(cwd, output), timeoutMs, browserExecutable }) }
}

test("real browser assertions and persisted screenshot/axe/log hashes identify actual desktop and mobile evidence", async t => {
  const app = await fixture(t)
  const selected = suite([
    heading,
    { type: "action", action: "fill", target: name, value: "Synthetic customer" },
    { type: "check", id: "value", assertion: "value", target: name, expected: "Synthetic customer" },
    { type: "check", id: "description", assertion: "accessible-description", target: name, expected: "Use a synthetic name." },
    { type: "check", id: "description-link", assertion: "attribute", target: name, name: "aria-describedby", expected: "hint" },
    { type: "check", id: "no-error", assertion: "attribute", target: name, name: "aria-invalid", expected: null },
    { type: "action", action: "press", target: name, value: "Tab" },
    { type: "check", id: "focus", assertion: "focused", target: { by: "label", value: "Status" } },
    { type: "action", action: "select", target: { by: "label", value: "Status" }, value: "archived" },
    { type: "check", id: "selection", assertion: "value", target: { by: "label", value: "Status" }, expected: "archived" },
    { type: "check", id: "enabled", assertion: "enabled", target: button },
    { type: "check", id: "disabled", assertion: "disabled", target: { by: "role", role: "button", name: "Delete" } },
    { type: "action", action: "click", target: button },
    { type: "check", id: "saved", assertion: "text", target: { by: "role", role: "status" }, expected: "Saved" },
    { type: "check", id: "count", assertion: "count", target: { by: "role", role: "listitem" }, expected: 2 },
    { type: "check", id: "order", assertion: "order", target: { by: "role", role: "listitem" }, expected: ["Alma", "Bruno"] },
    { type: "check", id: "hidden", assertion: "hidden", target: { by: "test-id", value: "hidden" } },
    { type: "action", action: "text-scale", value: 200 },
    { type: "check", id: "overflow", assertion: "overflow" },
    { type: "check", id: "visual", assertion: "screenshot" },
    { type: "check", id: "a11y", assertion: "axe" },
  ])
  selected.viewports.push({ id: "mobile", width: 390, height: 844 })
  const result = await app.run(selected, "result", 3000)
  const axeObservations = await Promise.all(result.report.evidence.filter(item => item.kind === "axe").map(async item => JSON.parse(await readFile(join(app.cwd, "result", item.reference), "utf8")).observed))
  assert.equal(result.summary.status, "pass", JSON.stringify({ runs: result.report.runs, incomplete: axeObservations.map(result => result.incomplete), violations: axeObservations.map(result => result.violations) }))
  assert.equal(result.summary.counts.pass, 32)
  assert.equal(result.report.project.servedSourceBinding, "unverified")
  assert.equal(result.report.project.files[0].sha256, createHash("sha256").update(source).digest("hex"))
  assert.ok(result.report.tools.some(tool => tool.name === "chromium" && tool.version))
  assert.equal(result.report.evidence.filter(item => item.kind === "screenshot").length, 2)
  assert.equal(result.report.evidence.filter(item => item.kind === "axe").length, 2)
  for (const evidence of result.report.evidence) {
    const bytes = await readFile(join(app.cwd, "result", evidence.reference))
    assert.equal(createHash("sha256").update(bytes).digest("hex"), evidence.sha256)
    assert.equal((await lstat(join(app.cwd, "result", evidence.reference))).mode & 0o777, 0o600)
    if (evidence.kind === "screenshot") assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a")
    if (evidence.kind === "axe") {
      const observed = JSON.parse(bytes.toString("utf8")).observed
      assert.equal(observed.violations.length, 0)
      assert.equal(observed.incomplete.length, 0)
      assert.ok(observed.testEngine.version)
    }
  }
  assert.deepEqual(await validateVerificationReport(JSON.parse(await readFile(join(app.cwd, "result/report.json"), "utf8"))), result.report)
  assert.equal(await readFile(join(app.cwd, "src/Customers.tsx"), "utf8"), source)
})

test("missing route, selector, mismatched assertion and timed-out actions fail without passing blocked checks", async t => {
  const app = await fixture(t)
  const selected = suite()
  selected.scenarios = [
    { id: "route", route: "/missing", steps: [heading] },
    { id: "selector", route: "/customers", steps: [{ ...heading, target: { by: "role", role: "heading", name: "Absent heading" } } as VerificationStep, { type: "check", id: "later", assertion: "overflow" }] },
    { id: "assertion", route: "/customers", steps: [{ type: "check", id: "text", assertion: "text", target: { by: "role", role: "heading" }, expected: "Wrong heading" }] },
    { id: "action-before", route: "/customers", steps: [{ type: "action", action: "click", target: { by: "role", role: "button", name: "Absent action" } }, heading] },
    { id: "action-after", route: "/customers", steps: [heading, { type: "action", action: "click", target: { by: "role", role: "button", name: "Absent action" } }] },
  ]
  const result = await app.run(selected, "result", 500)
  assert.equal(result.summary.status, "fail")
  assert.ok(result.report.runs.every(run => run.status === "fail"), JSON.stringify(result.report.runs))
  assert.equal(result.report.checks.find(check => check.scenarioId === "route")!.status, "skipped")
  assert.equal(result.report.checks.find(check => check.scenarioId === "selector" && check.checkId === "heading")!.status, "fail")
  assert.equal(result.report.checks.find(check => check.scenarioId === "selector" && check.checkId === "later")!.status, "skipped")
  assert.equal(result.report.checks.find(check => check.scenarioId === "assertion")!.status, "fail")
  assert.equal(result.report.checks.find(check => check.scenarioId === "action-before")!.status, "skipped")
  assert.equal(result.report.checks.find(check => check.scenarioId === "action-after")!.status, "pass", JSON.stringify(result.report.checks))
  assert.equal(result.report.runs.find(run => run.scenarioId === "action-after")!.failedStep, 1)
  assert.ok(result.report.evidence.some(item => item.kind === "log"))
})

test("an unreachable started-app origin fails route execution and leaves all assertions skipped", async t => {
  const app = await fixture(t)
  const stopped = createServer()
  await new Promise<void>((resolve, reject) => { stopped.once("error", reject); stopped.listen(0, "127.0.0.1", resolve) })
  const address = stopped.address(); assert.ok(address && typeof address === "object")
  await new Promise<void>((resolve, reject) => stopped.close(error => error ? reject(error) : resolve()))
  const result = await verifyLocal({ cwd: app.cwd, suite: suite(), url: `http://127.0.0.1:${address.port}`, output: join(app.cwd, "result"), timeoutMs: 200, browserExecutable })
  assert.equal(result.summary.status, "fail", JSON.stringify(result.summary))
  assert.equal(result.report.runs[0].status, "fail")
  assert.equal(result.report.checks[0].status, "skipped")
  assert.match(result.report.runs[0].reason, /unavailable/)
})

test("source changes during the browser run invalidate otherwise passing observations", async t => {
  const app = await fixture(t, async (_request, response, cwd) => {
    await writeFile(join(cwd, "src/Customers.tsx"), source + "// Changed after initial fingerprint.\n")
    response.writeHead(200, { "content-type": "text/html" }).end(html)
  })
  const result = await app.run(suite(), "result", 1000)
  assert.equal(result.report.checks[0].status, "pass")
  assert.equal(result.summary.status, "fail")
  assert.match(result.report.runs[0].reason, /changed during verification/)
  assert.equal(result.report.project.files[0].sha256, createHash("sha256").update(source).digest("hex"), "the original source fingerprint is retained")
})

test("real axe violations and horizontal overflow produce failures with measured evidence", async t => {
  const inaccessible = html.replace('<label for="customer">Customer name</label>', "").replace("</style>", "body{min-width:1800px}</style>")
  const app = await fixture(t, (_request, response) => { response.writeHead(200, { "content-type": "text/html" }).end(inaccessible) })
  const selected = suite([{ type: "check", id: "a11y", assertion: "axe" }])
  selected.scenarios.push({ id: "overflow", route: "/customers", steps: [{ type: "check", id: "width", assertion: "overflow" }] })
  const result = await app.run(selected, "result", 2000)
  assert.equal(result.summary.status, "fail")
  assert.ok(result.report.checks.every(check => check.status === "fail"), JSON.stringify(result.report.checks))
  const evidence = result.report.evidence.find(item => item.kind === "axe")!
  const measurement = JSON.parse(await readFile(join(app.cwd, "result", evidence.reference), "utf8"))
  assert.ok(measurement.observed.violations.some((violation: { id: string }) => violation.id === "label"))
  assert.ok(result.report.runs.every(run => run.status === "fail"))
})

test("external-origin requests are blocked and cannot yield an unrestricted pass", async t => {
  let externalRequests = 0
  const external = await fixture(t, (_request, response) => { externalRequests++; response.writeHead(200).end("private") })
  const body = html.replace("</main>", `<button onclick="fetch('${external.url}/private').then(()=>document.querySelector('[role=status]').textContent='Leaked').catch(()=>document.querySelector('[role=status]').textContent='Blocked')">External request</button></main>`)
  const app = await fixture(t, (_request, response) => { response.writeHead(200, { "content-type": "text/html" }).end(body) })
  const result = await app.run(suite([heading, { type: "action", action: "click", target: { by: "role", role: "button", name: "External request" } }, { type: "check", id: "blocked", assertion: "text", target: { by: "role", role: "status" }, expected: "Blocked" }]), "result", 1000)
  assert.equal(externalRequests, 0)
  assert.equal(result.summary.status, "unknown")
  assert.match(result.report.runs[0].reason, /blocked/)
  assert.ok(result.report.checks.every(check => check.status === "pass"))
})

test("same-origin redirects cannot bypass external request isolation", async t => {
  let externalRequests = 0, redirectHops = 0
  const external = await fixture(t, (_request, response) => { externalRequests++; response.writeHead(200, { "access-control-allow-origin": "*" }).end("private") })
  const body = html.replace("</main>", `<button onclick="fetch('/redirect').then(()=>document.querySelector('[role=status]').textContent='Leaked').catch(()=>document.querySelector('[role=status]').textContent='Blocked')">Redirected request</button></main>`)
  const app = await fixture(t, (request, response) => {
    if (request.url === "/redirect") { response.writeHead(302, { location: "/redirect-again" }).end(); return }
    if (request.url === "/redirect-again") { redirectHops++; response.writeHead(302, { location: `${external.url}/private` }).end(); return }
    response.writeHead(200, { "content-type": "text/html" }).end(body)
  })
  const result = await app.run(suite([heading, { type: "action", action: "click", target: { by: "role", role: "button", name: "Redirected request" } }, { type: "check", id: "blocked", assertion: "text", target: { by: "role", role: "status" }, expected: "Blocked" }]), "result", 1000)
  assert.equal(externalRequests, 0, "the browser must not contact a redirected external endpoint")
  assert.equal(redirectHops, 0, "all redirects reject at the first hop, including same-origin destinations")
  assert.equal(result.summary.status, "unknown")
  assert.match(result.report.runs[0].reason, /blocked/)
})

test("a redirected entry route fails instead of silently checking a different page", async t => {
  let destinations = 0
  const app = await fixture(t, (request, response) => {
    if (request.url === "/customers") { response.writeHead(302, { location: "/actual-customers" }).end(); return }
    destinations++; response.writeHead(200, { "content-type": "text/html" }).end(html)
  })
  const result = await app.run(suite(), "result", 1000)
  assert.equal(destinations, 0)
  assert.equal(result.summary.status, "fail")
  assert.equal(result.report.checks[0].status, "skipped")
  assert.match(result.report.runs[0].reason, /unavailable/)
})

test("a final action navigating to about:blank cannot retain a passing origin-bound report", async t => {
  const body = html.replace("</main>", '<button onclick="location.href=\'about:blank\'">Leave application</button></main>')
  const app = await fixture(t, (_request, response) => { response.writeHead(200, { "content-type": "text/html" }).end(body) })
  const result = await app.run(suite([heading, { type: "action", action: "click", target: { by: "role", role: "button", name: "Leave application" } }]), "result", 1000)
  assert.equal(result.report.checks[0].status, "pass")
  assert.equal(result.summary.status, "fail", "completion after leaving the origin must fail even when preceding checks passed")
  assert.equal(result.report.runs[0].failedStep, 1)
})

test("suite deadline bounds action waits and prevents later scenarios from reporting success", async t => {
  const app = await fixture(t)
  const selected = suite([{ type: "action", action: "click", target: { by: "role", role: "button", name: "Absent action" } }, heading])
  selected.scenarios.push({ id: "later", route: "/customers", steps: [heading] })
  const started = Date.now()
  const result = await verifyLocal({ cwd: app.cwd, suite: selected, url: app.url, output: join(app.cwd, "result"), timeoutMs: 3000, budgetMs: 1000, browserExecutable })
  assert.equal(result.summary.status, "fail")
  assert.ok(result.report.runs.every(run => run.status === "fail"))
  assert.ok(result.report.checks.every(check => check.status === "skipped"))
  assert.match(result.report.runs[1].reason, /budget.*exhausted/)
  assert.ok(Date.now() - started < 15000, "suite runtime stays bounded including browser startup")
})

test("actual CLI exits 0 for passing browser evidence and 1 for a failed interaction", async t => {
  const app = await fixture(t)
  const passing = suite([heading])
  const failing = suite([{ type: "check", id: "wrong", assertion: "text", target: { by: "role", role: "heading" }, expected: "Wrong" }])
  await writeFile(join(app.cwd, "pass.json"), JSON.stringify(passing)); await writeFile(join(app.cwd, "fail.json"), JSON.stringify(failing))
  const run = async (file: string, output: string) => {
    const args = ["--import", "tsx", "src/index.ts", "verify", join(app.cwd, file), "--cwd", app.cwd, "--url", app.url, "--output", join(app.cwd, output), "--timeout", "1000", "--json", ...(browserExecutable ? ["--browser-executable", browserExecutable] : [])]
    try { const result = await execFileAsync(process.execPath, args, { cwd: packageRoot, encoding: "utf8", timeout: 30000 }); return { ...result, code: 0 } }
    catch (error) { const failure = error as Error & { stdout: string; stderr: string; code: number }; return { stdout: failure.stdout, stderr: failure.stderr, code: failure.code } }
  }
  const pass = await run("pass.json", "passed")
  assert.equal(pass.code, 0, pass.stderr)
  assert.equal(JSON.parse(pass.stdout).summary.status, "pass")
  const fail = await run("fail.json", "failed")
  assert.equal(fail.code, 1, fail.stderr)
  assert.equal(JSON.parse(fail.stdout).summary.status, "fail")
})
