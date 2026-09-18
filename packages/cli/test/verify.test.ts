import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { link, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { summarizeVerificationReport, VERIFICATION_LIMITS, type VerificationSuiteV1 } from "@logic2b/scaffold/verification"
import { readVerificationArtifact, verificationOrigin, verifyLocal } from "../src/verify.ts"

const packageRoot = fileURLToPath(new URL("../", import.meta.url))
const suite: VerificationSuiteV1 = {
  schemaVersion: 1, projectFiles: ["src/Customers.tsx"],
  viewports: [{ id: "desktop", width: 1280, height: 800 }, { id: "mobile", width: 390, height: 844 }],
  scenarios: [{ id: "customers", route: "/customers", steps: [{ type: "check", id: "heading", assertion: "visible", target: { by: "role", role: "heading", name: "Customers" } }] }],
}
const source = "throw new Error('Selected source must not execute');\n"
async function fixture(t: { after: (fn: () => Promise<void>) => void }, files: Record<string, string | Buffer> = {}) {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-verify-"))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  for (const [path, content] of Object.entries({ "package.json": '{"private":true,"scripts":{"build":"exit 99","postinstall":"exit 99"}}', "src/Customers.tsx": source, ...files })) {
    await mkdir(dirname(join(cwd, path)), { recursive: true }); await writeFile(join(cwd, path), content)
  }
  return cwd
}
const options = (cwd: string, output = "result") => ({ cwd, suite, url: "http://127.0.0.1:3000", output: join(cwd, output), timeoutMs: 50 })
const absent = async (path: string) => assert.rejects(lstat(path), { code: "ENOENT" })

test("verification accepts only explicit HTTP(S) loopback origins", () => {
  assert.equal(verificationOrigin("http://localhost:3000/"), "http://localhost:3000")
  assert.equal(verificationOrigin("https://127.0.0.1:4443"), "https://127.0.0.1:4443")
  assert.equal(verificationOrigin("http://[::1]:3000"), "http://[::1]:3000")
  for (const url of ["https://example.com", "file:///tmp/app.html", "javascript:process.exit(88)", "http://localhost.evil.test", "http://user:secret@localhost", "http://localhost/customers", "http://localhost?token=PRIVATE", "http://localhost#route", "//localhost", "not a url"]) assert.throws(() => verificationOrigin(url))
})

test("invalid suites, executable steps and bounds reject before creating any artifacts", async t => {
  const cwd = await fixture(t)
  const invalidSuites = [
    null, {}, { ...suite, schemaVersion: 2 }, { ...suite, execute: "process.exit(88)" },
    { ...suite, projectFiles: ["../outside.ts"] }, { ...suite, projectFiles: [".env"] },
    { ...suite, projectFiles: ["node_modules/private.ts"] }, { ...suite, projectFiles: ["src/Customers.tsx", "src/Customers.tsx"] },
    { ...suite, scenarios: [{ ...suite.scenarios[0], route: "https://example.com" }] },
    { ...suite, scenarios: [{ ...suite.scenarios[0], route: "//example.com" }] },
    { ...suite, scenarios: [{ ...suite.scenarios[0], steps: [{ type: "script", content: "process.exit(88)" }] }] },
    { ...suite, scenarios: [{ ...suite.scenarios[0], steps: [{ type: "action", action: "evaluate", code: "process.exit(88)" }] }] },
    { ...suite, scenarios: [{ ...suite.scenarios[0], steps: [{ type: "check", id: "run", assertion: "evaluate", expected: "process.exit(88)" }] }] },
    { ...suite, viewports: [{ id: "desktop", width: 100000, height: 800 }] },
  ]
  for (const invalid of invalidSuites) {
    await assert.rejects(verifyLocal({ ...options(cwd), suite: invalid }))
    await absent(join(cwd, "result"))
  }
  for (const overrides of [{ timeoutMs: 49 }, { timeoutMs: 30001 }, { timeoutMs: Number.NaN }, { budgetMs: 999 }, { budgetMs: 300001 }, { url: "http://external.example" }, { appUnavailable: "" }, { appUnavailable: "x".repeat(513) }, { appUnavailable: "Failed\nBuild" }]) {
    await assert.rejects(verifyLocal({ ...options(cwd), ...overrides }))
    await absent(join(cwd, "result"))
  }
  assert.equal(await readFile(join(cwd, "src/Customers.tsx"), "utf8"), source)
})

test("missing browser dependencies create a truthful skipped report with file hashes and private artifacts", async t => {
  const cwd = await fixture(t)
  const result = await verifyLocal(options(cwd))
  assert.equal(result.summary.status, "skipped")
  assert.deepEqual(result.summary.counts, { pass: 0, fail: 0, skipped: 2, unknown: 0 })
  assert.equal(result.report.project.files[0].sha256, createHash("sha256").update(source).digest("hex"))
  assert.equal(result.report.project.servedSourceBinding, "unverified")
  assert.ok(result.report.runs.every(run => /Browser capability unavailable/.test(run.reason)))
  assert.deepEqual(result.report.evidence, [])
  assert.deepEqual(await summarizeVerificationReport(await readVerificationArtifact(join(cwd, "result/report.json"))), result.summary)
  assert.deepEqual(JSON.parse(await readFile(join(cwd, "result/summary.json"), "utf8")), result.summary)
  assert.equal((await lstat(join(cwd, "result"))).mode & 0o777, 0o700)
  assert.equal((await lstat(join(cwd, "result/report.json"))).mode & 0o777, 0o600)
  assert.equal(await readFile(join(cwd, "src/Customers.tsx"), "utf8"), source)
  assert.deepEqual((await readdir(cwd)).sort(), ["package.json", "result", "src"])
})

test("a missing selected Chromium executable stays skipped without installing a browser", async t => {
  const cwd = await fixture(t)
  await symlink(join(packageRoot, "node_modules"), join(cwd, "node_modules"), "dir")
  const result = await verifyLocal({ ...options(cwd), browserExecutable: join(cwd, "absent-chromium") })
  assert.equal(result.summary.status, "skipped")
  assert.ok(result.report.runs.every(run => /Chromium capability unavailable/.test(run.reason)))
  assert.ok(result.report.tools.some(tool => tool.name === "playwright"))
  assert.deepEqual(result.report.evidence, [])
})

test("missing host isolation capability skips every run while genuine browser initialization errors fail", async t => {
  for (const unavailable of [true, false]) {
    const cwd = await fixture(t, {
      "node_modules/playwright/package.json": '{"name":"playwright","version":"0.0.0-test","main":"index.cjs"}',
      "node_modules/playwright/index.cjs": `const stats = { contexts: 0, closed: 0, browsersClosed: 0 }; module.exports = { stats, chromium: { launch: async () => ({ version: () => '0.0.0-test', newContext: async () => { stats.contexts++; ${unavailable ? "return { close: async () => { stats.closed++; } };" : "throw new Error('Actual context initialization failed');"} }, close: async () => { stats.browsersClosed++; } }) } };`,
      "node_modules/playwright/test.js": "module.exports = { expect: () => {} };",
      "node_modules/@axe-core/playwright/package.json": '{"name":"@axe-core/playwright","version":"0.0.0-test","main":"index.cjs"}',
      "node_modules/@axe-core/playwright/index.cjs": "module.exports = { default: class AxeBuilder {} };",
    })
    const result = await verifyLocal(options(cwd))
    const { stats } = createRequire(join(cwd, "package.json"))("playwright")
    assert.equal(result.summary.status, unavailable ? "skipped" : "fail")
    assert.ok(result.report.checks.every(check => check.status === "skipped"))
    assert.equal(stats.contexts, unavailable ? 1 : 2, "a discovered missing capability avoids opening subsequent contexts")
    assert.equal(stats.closed, unavailable ? 1 : 0)
    assert.equal(stats.browsersClosed, 1)
    if (unavailable) {
      assert.ok(result.report.runs.every(run => /WebSocket isolation/.test(run.reason)))
      assert.deepEqual(result.report.evidence, [], "missing capabilities are not invented runtime failures")
    } else assert.ok(result.report.runs.every(run => run.status === "fail"))
  }
})

test("a stalled or late context creation cannot escape the suite deadline or leak its context", { timeout: 6000 }, async t => {
  for (const late of [false, true]) {
    const cwd = await fixture(t, {
      "node_modules/playwright/package.json": '{"name":"playwright","version":"0.0.0-test","main":"index.cjs"}',
      "node_modules/playwright/index.cjs": `const stats = { contexts: 0, closed: 0, browsersClosed: 0 }; module.exports = { stats, chromium: { launch: async () => ({ version: () => '0.0.0-test', newContext: () => { stats.contexts++; return ${late ? "new Promise(resolve => setTimeout(() => resolve({ close: async () => { stats.closed++; } }), 1200))" : "new Promise(() => {})"}; }, close: async () => { stats.browsersClosed++; } }) } };`,
      "node_modules/playwright/test.js": "module.exports = { expect: () => {} };",
      "node_modules/@axe-core/playwright/package.json": '{"name":"@axe-core/playwright","version":"0.0.0-test","main":"index.cjs"}',
      "node_modules/@axe-core/playwright/index.cjs": "module.exports = { default: class AxeBuilder {} };",
    })
    const started = Date.now()
    const result = await verifyLocal({ ...options(cwd), budgetMs: 1000 })
    assert.ok(Date.now() - started < 2500, "the browser initialization must not escape the declared budget")
    const { stats } = createRequire(join(cwd, "package.json"))("playwright")
    assert.equal(result.summary.status, "fail")
    assert.equal(result.report.runs[0].status, "fail")
    assert.match(result.report.runs[1].reason, /budget.*exhausted/)
    assert.ok(result.report.checks.every(check => check.status === "skipped"))
    assert.equal(stats.contexts, 1, "remaining viewports never attempt initialization after the deadline")
    assert.ok(stats.browsersClosed >= 1, "a stalled creation must close its owning browser")
    if (late) await new Promise(resolve => setTimeout(resolve, 300))
    assert.equal(stats.closed, late ? 1 : 0, "a context resolving after the rejected race is closed explicitly")
    assert.deepEqual(JSON.parse(await readFile(join(cwd, "result/report.json"), "utf8")), result.report)
  }
})

test("a real failed app build can be recorded as unavailable without claiming browser checks", async t => {
  const cwd = await fixture(t, { "broken-app.mjs": "export const Broken = { incomplete: ;\n" })
  await symlink(join(packageRoot, "node_modules"), join(cwd, "node_modules"), "dir")
  const build = spawnSync(process.execPath, ["--check", join(cwd, "broken-app.mjs")], { encoding: "utf8" })
  assert.equal(build.status, 1)
  assert.match(build.stderr, /SyntaxError/)
  const result = await verifyLocal({ ...options(cwd), appUnavailable: "App source failed its syntax build check before startup." })
  assert.equal(result.summary.status, "skipped")
  assert.ok(result.report.runs.every(run => /Host reported the app unavailable/.test(run.reason)))
  assert.deepEqual(result.summary.counts, { pass: 0, fail: 0, skipped: 2, unknown: 0 })
  assert.ok(!result.report.tools.some(tool => tool.name === "playwright"), "unavailable app does not load installed browser tools")
  assert.deepEqual(result.report.evidence, [])
  assert.match(JSON.stringify(result.report.notes), /host|Host/)
})

test("selected source symlinks, hardlinks, linked directories and oversized files reject before artifacts", async t => {
  const cwd = await fixture(t)
  await symlink(join(cwd, "src/Customers.tsx"), join(cwd, "linked.ts"))
  await symlink(join(cwd, "src"), join(cwd, "linked-dir"), "dir")
  for (const path of ["linked.ts", "linked-dir/Customers.tsx"]) {
    await assert.rejects(verifyLocal({ ...options(cwd), suite: { ...suite, projectFiles: [path] } }))
    await absent(join(cwd, "result"))
  }
  await writeFile(join(cwd, "original.ts"), "original")
  await link(join(cwd, "original.ts"), join(cwd, "hardlink.ts"))
  await assert.rejects(verifyLocal({ ...options(cwd), suite: { ...suite, projectFiles: ["hardlink.ts"] } }))
  await writeFile(join(cwd, "large.ts"), Buffer.alloc(VERIFICATION_LIMITS.fileBytes + 1))
  await assert.rejects(verifyLocal({ ...options(cwd), suite: { ...suite, projectFiles: ["large.ts"] } }))
  await assert.rejects(verifyLocal({ ...options(cwd), suite: { ...suite, projectFiles: ["missing.ts"] } }))
  await absent(join(cwd, "result"))
})

test("verification artifacts reject links, oversized input, raw JavaScript and malformed UTF-8 JSON", async t => {
  const cwd = await fixture(t, { "suite.json": JSON.stringify(suite), "code.json": "process.exit(88);", "utf8.json": Buffer.from([0xff, 0xfe]), "huge.json": Buffer.alloc(VERIFICATION_LIMITS.reportBytes + 1, 32) })
  assert.deepEqual(await readVerificationArtifact(join(cwd, "suite.json")), suite)
  for (const path of ["code.json", "utf8.json", "huge.json"]) await assert.rejects(readVerificationArtifact(join(cwd, path)))
  await symlink(join(cwd, "suite.json"), join(cwd, "linked.json"))
  await assert.rejects(readVerificationArtifact(join(cwd, "linked.json")))
  await link(join(cwd, "suite.json"), join(cwd, "hard.json"))
  await assert.rejects(readVerificationArtifact(join(cwd, "hard.json")))
})

test("verification refuses to overwrite a prior evidence directory", async t => {
  const cwd = await fixture(t, { "result/user.txt": "Keep my evidence" })
  await assert.rejects(verifyLocal(options(cwd)), { code: "EEXIST" })
  assert.equal(await readFile(join(cwd, "result/user.txt"), "utf8"), "Keep my evidence")
  assert.deepEqual(await readdir(join(cwd, "result")), ["user.txt"])
})

test("CLI missing capability exits 2 with machine-readable evidence and malformed suites leave no output", async t => {
  const cwd = await fixture(t, { "suite.json": JSON.stringify(suite), "bad.json": JSON.stringify({ ...suite, execute: "process.exit(88)" }) })
  const run = (file: string, output: string, extra: string[] = []) => spawnSync(process.execPath, ["--import", "tsx", "src/index.ts", "verify", join(cwd, file), "--cwd", cwd, "--url", "http://127.0.0.1:3000", "--output", join(cwd, output), "--json", ...extra], { cwd: packageRoot, encoding: "utf8", timeout: 20000 })
  const skipped = run("suite.json", "result")
  assert.equal(skipped.status, 2, skipped.stderr)
  assert.equal(JSON.parse(skipped.stdout).summary.status, "skipped")
  assert.deepEqual(JSON.parse(skipped.stdout).report, JSON.parse(await readFile(join(cwd, "result/report.json"), "utf8")))
  const unavailable = run("suite.json", "unavailable-result", ["--app-unavailable", "Build failed its syntax check."])
  assert.equal(unavailable.status, 2, unavailable.stderr)
  assert.equal(JSON.parse(unavailable.stdout).summary.status, "skipped")
  assert.match(JSON.parse(unavailable.stdout).report.runs[0].reason, /Build failed its syntax check/)
  const invalid = run("bad.json", "invalid-result")
  assert.equal(invalid.status, 2, invalid.stderr)
  assert.equal(invalid.stdout, "")
  await absent(join(cwd, "invalid-result"))
})
