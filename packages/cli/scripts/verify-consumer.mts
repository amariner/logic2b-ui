import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { createServer } from "node:http"
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { ICON_PACKAGE_VERSIONS, scaffoldRegistryPath } from "@logic2b/scaffold"
import { summarizeVerificationReport, validateVerificationSuite } from "@logic2b/scaffold/verification"
import { addComponents, type FetchLike } from "../src/lib.ts"
import { scaffoldProject } from "../src/scaffold.ts"
import { consumerSuite } from "../test/fixtures/consumer-verification/suite.ts"

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const registryDirectory = join(repository, "apps/web/public/r")
const fixtureDirectory = join(repository, "packages/cli/test/fixtures/consumer-verification")
const version = "1.0.0-rc.18"
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex")
const json = (data: unknown) => `${JSON.stringify(data, null, 2)}\n`
const fetchImpl: FetchLike = async input => {
  const url = new URL(input)
  const path = decodeURIComponent(url.pathname.slice(3))
  if (!url.pathname.startsWith("/r/") || !path.endsWith(".json") || path.split("/").some(part => !part || part === "." || part === ".." || part.includes("\\"))) return { ok: false, status: 404, text: async () => "Not found" }
  try { const content = await readFile(join(registryDirectory, path), "utf8"); return { ok: true, status: 200, text: async () => content } }
  catch { return { ok: false, status: 404, text: async () => "Not found" } }
}

async function files(directory: string, root = directory): Promise<string[]> {
  const result: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error("Consumer source cannot contain symbolic links.")
    if (entry.isDirectory()) result.push(...await files(path, root))
    else if (entry.isFile()) result.push(relative(root, path).split(sep).join("/"))
  }
  return result.sort()
}

interface Provenance {
  schemaVersion: 1
  registryVersion: string
  items: { name: string; integrity: string; files: { path: string; sha256: string }[] }[]
  limitations: string[]
}

async function prepare(root: string) {
  // Fail on an existing destination rather than overwrite any consumer work.
  await mkdir(root)
  await scaffoldProject({ cwd: root, registry: "https://ui.logic2b.com", registryVersion: version, framework: "vite", starter: "auth", name: "logic2b-consumer-verification", install: false, fetchImpl })
  const installed = await addComponents(["admin-customers-01", "customer-edit-01"], { cwd: root, registryVersion: version, install: false, fetchImpl })
  const manifest = JSON.parse(await readFile(join(root, ".logic2b/manifest.json"), "utf8"))
  assert.equal(manifest.registry.resolvedVersion, version)
  const registryManifest = JSON.parse(await readFile(join(registryDirectory, `versions/${version}.json`), "utf8"))
  const provenance: Provenance = { schemaVersion: 1, registryVersion: version, items: [], limitations: [
    "This generated consumer uses only synthetic customers and a deterministic in-memory service; production persistence and server authorization remain untested.",
    "Sorting, record identity, persistence status and opener focus are consumer responsibilities implemented by the fixture host.",
    "Screenshot checks capture evidence for human inspection; they are not visual regression or WCAG conformance assertions.",
  ] }
  for (const [name, item] of installed) {
    const entry = registryManifest.items.find((candidate: { name: string }) => candidate.name === name)
    assert.ok(entry, `Missing immutable manifest entry ${name}`)
    const immutableBytes = await readFile(join(repository, "apps/web/public", entry.content))
    assert.equal(`sha256-${createHash("sha256").update(immutableBytes).digest("base64")}`, entry.integrity)
    const immutable = JSON.parse(immutableBytes.toString("utf8"))
    const copied = []
    for (const file of immutable.files ?? []) {
      const path = scaffoldRegistryPath("src", file.path)
      const bytes = await readFile(join(root, path), "utf8")
      assert.equal(bytes, file.content, `${name}: installed bytes differ from immutable registry`)
      copied.push({ path, sha256: hash(bytes) })
    }
    assert.deepEqual(item.files?.map(file => file.content), immutable.files?.map((file: { content: string }) => file.content))
    provenance.items.push({ name, integrity: entry.integrity, files: copied })
  }
  const packagePath = join(root, "package.json")
  const manifestPackage = JSON.parse(await readFile(packagePath, "utf8"))
  // Add the block's icon dependency with the same exact tested scaffold pin.
  manifestPackage.dependencies["lucide-react"] = ICON_PACKAGE_VERSIONS["lucide-react"]
  // The auth scaffold already pins the remaining shared dependencies. Fail if
  // that stops being true instead of silently installing dependency ranges.
  for (const item of installed.values()) for (const dependency of item.dependencies ?? []) assert.ok(manifestPackage.dependencies[dependency], `Missing pinned consumer dependency ${dependency}`)
  manifestPackage.devDependencies.playwright = "1.61.1"
  manifestPackage.devDependencies["@axe-core/playwright"] = "4.12.1"
  manifestPackage.packageManager = "pnpm@11.10.0"
  await writeFile(packagePath, json(manifestPackage))
  await writeFile(join(root, "pnpm-workspace.yaml"), "packages: []\nverifyDepsBeforeRun: false\nallowBuilds:\n  esbuild: true\n")
  await writeFile(join(root, "src/components/starter-page.tsx"), await readFile(join(fixtureDirectory, "starter-page.tsx")))
  const html = (await readFile(join(root, "index.html"), "utf8"))
    .replace('<html lang="en" class="dark">', '<html lang="en">')
    .replace("<title>logic2b starter</title>", '<title>Customer management verification fixture</title>\n    <script>const fixtureParams = new URLSearchParams(location.search); document.documentElement.classList.toggle("dark", fixtureParams.get("theme") === "dark"); document.documentElement.lang = fixtureParams.get("locale") === "es" ? "es" : "en";</script>')
  await writeFile(join(root, "index.html"), html)
  await writeFile(join(root, "consumer-provenance.json"), json(provenance))
  const projectFiles = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json", "vite.config.ts", "index.html", "components.json", "consumer-provenance.json", ...await files(join(root, "src"), root)]
  const suite = validateVerificationSuite(consumerSuite(projectFiles))
  await writeFile(join(root, "verification-suite.json"), json(suite))
  const count = suite.scenarios.reduce((total, scenario) => total + scenario.steps.filter(step => step.type === "check").length * suite.viewports.length, 0)
  console.log(`Prepared immutable ${version} consumer at ${root}: ${suite.scenarios.length} scenarios, ${count} browser assertions.`)
  console.log("Next run explicit pnpm install, pnpm run build, then consumer check. Preparation does not install or build.")
}

async function cli(args: string[], cwd: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((fulfill, reject) => {
    const processHandle = spawn(process.execPath, [join(repository, "packages/cli/dist/index.js"), ...args], { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = "", stderr = ""
    const timer = setTimeout(() => { processHandle.kill("SIGTERM"); reject(new Error("Consumer verification exceeded ten minutes.")) }, 600_000)
    processHandle.stdout.on("data", chunk => { stdout += chunk; if (stdout.length > 4 * 1024 * 1024) processHandle.kill("SIGTERM") })
    processHandle.stderr.on("data", chunk => { stderr += chunk; if (stderr.length > 2 * 1024 * 1024) processHandle.kill("SIGTERM") })
    processHandle.on("error", error => { clearTimeout(timer); reject(error) })
    processHandle.on("close", code => { clearTimeout(timer); fulfill({ code, stdout, stderr }) })
  })
}

async function check(root: string, evidenceDirectory: string) {
  const dist = join(root, "dist")
  await stat(join(dist, "index.html")) // Checking never builds, starts a package script or installs anything.
  await stat(join(repository, "packages/cli/dist/index.js"))
  const provenance = JSON.parse(await readFile(join(root, "consumer-provenance.json"), "utf8")) as Provenance
  assert.equal(provenance.registryVersion, version)
  for (const item of provenance.items) for (const file of item.files) assert.equal(hash(await readFile(join(root, file.path))), file.sha256, `Installed immutable bytes changed: ${file.path}`)
  const suite = validateVerificationSuite(JSON.parse(await readFile(join(root, "verification-suite.json"), "utf8")))
  assert.deepEqual(suite, validateVerificationSuite(consumerSuite(suite.projectFiles)), "Prepared fixture coverage changed")
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405); response.end(); return }
      const path = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname)
      const target = path === "/" || path === "/customers" ? join(dist, "index.html") : resolve(dist, `.${path}`)
      if (!target.startsWith(`${dist}${sep}`)) { response.writeHead(404); response.end(); return }
      const bytes = await readFile(target)
      const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml" }
      response.writeHead(200, { "Content-Type": mime[extname(target)] ?? "application/octet-stream", "Cache-Control": "no-store" })
      response.end(request.method === "HEAD" ? undefined : bytes)
    } catch { response.writeHead(404); response.end("Not found") }
  })
  await new Promise<void>((fulfill, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", fulfill) })
  try {
    const address = server.address()
    assert.ok(address && typeof address !== "string")
    const result = await cli(["verify", "verification-suite.json", "--cwd", root, "--url", `http://127.0.0.1:${address.port}`, "--output", evidenceDirectory, "--json"], root)
    if (result.stderr) process.stderr.write(result.stderr)
    const report = JSON.parse(await readFile(join(evidenceDirectory, "report.json"), "utf8"))
    const summary = await summarizeVerificationReport(report)
    assert.deepEqual(report.suite, suite, "CLI report must contain the complete prepared suite")
    assert.deepEqual(JSON.parse(await readFile(join(evidenceDirectory, "summary.json"), "utf8")), summary)
    const emitted = JSON.parse(result.stdout)
    assert.deepEqual(emitted.report, report); assert.deepEqual(emitted.summary, summary)
    await writeFile(join(evidenceDirectory, "fixture-provenance.json"), json(provenance))
    const allowedReviewKeys = new Set(["mobile", "desktop"].flatMap(viewport => ["large-list-axe", "large-edit-axe"].map(id => `translated-large-text/${viewport}/${id}`)))
    const reviewChecks = summary.checks.filter(check => check.status === "unknown")
    if (summary.counts.fail || summary.counts.skipped) console.error(json({ counts: summary.counts, runs: summary.runs.filter(run => run.status !== "pass"), checks: summary.checks.filter(check => check.status === "fail") }))
    assert.equal(summary.counts.fail, 0, `Failed browser checks; see ${evidenceDirectory}`)
    assert.equal(summary.counts.skipped, 0, `Unexecuted browser checks; see ${evidenceDirectory}`)
    for (const check of reviewChecks) {
      assert.ok(allowedReviewKeys.has(`${check.scenarioId}/${check.viewportId}/${check.checkId}`), `Unexpected unknown check ${check.checkId}`)
      assert.equal(check.assertion, "axe")
      assert.ok(check.evidenceIds.length > 0)
      for (const id of check.evidenceIds) {
        const reference = report.evidence.find((entry: { id: string }) => entry.id === id)
        assert.equal(reference?.kind, "axe")
        const observation = JSON.parse(await readFile(join(evidenceDirectory, reference.reference), "utf8"))
        assert.equal(observation.status, "unknown")
        assert.equal(observation.assertion.id, check.checkId)
        assert.deepEqual(observation.observed.violations, [], "Actual contrast violations cannot use the review exception")
        assert.ok(observation.observed.incomplete.length > 0)
        for (const rule of observation.observed.incomplete) {
          assert.equal(rule.id, "color-contrast", "Only clipped text contrast may require review")
          assert.ok(rule.nodes.length > 0)
          for (const node of rule.nodes) {
            assert.deepEqual(node.all, []); assert.deepEqual(node.none, [])
            assert.ok(node.any.length > 0)
            for (const reason of node.any) {
              assert.equal(reason.id, "color-contrast")
              assert.equal(reason.data?.messageKey, "elmPartiallyObscured", "Any other contrast uncertainty fails the fixture")
            }
          }
        }
      }
    }
    assert.equal(result.code, reviewChecks.length ? 2 : 0, `Unexpected CLI exit; see ${evidenceDirectory}`)
    assert.equal(summary.status, reviewChecks.length ? "unknown" : "pass")
    assert.equal(summary.reportedChecks, summary.expectedChecks)
    assert.equal(summary.counts.pass + reviewChecks.length, summary.expectedChecks)
    assert.equal(summary.runs.length, suite.scenarios.length * suite.viewports.length)
    assert.equal(summary.runCounts.fail, 0)
    assert.equal(summary.runCounts.skipped, 0)
    for (const run of summary.runs) {
      const needsReview = reviewChecks.some(check => check.scenarioId === run.scenarioId && check.viewportId === run.viewportId)
      assert.equal(run.status, needsReview ? "unknown" : "pass", `Unexpected incomplete run ${run.scenarioId}/${run.viewportId}`)
      assert.equal(run.reason, needsReview ? "One or more browser measurements require human review." : "Every declared action and check completed.", "Blocked network requests and other run uncertainties cannot use the contrast exception")
    }
    for (const evidence of report.evidence) {
      assert.ok(!evidence.reference.includes(":") && !evidence.reference.startsWith("/"), "Reference fixture evidence must remain local")
      assert.equal(hash(await readFile(join(evidenceDirectory, evidence.reference))), evidence.sha256, "Evidence bytes do not match report")
    }
    await writeFile(join(evidenceDirectory, "fixture-contrast-review.json"), json({
      status: reviewChecks.length ? "human-review-required" : "no-incomplete-contrast-checks",
      checks: reviewChecks.map(check => ({ scenarioId: check.scenarioId, viewportId: check.viewportId, checkId: check.checkId, evidenceIds: check.evidenceIds })),
      reason: "At 200% text, horizontal table scrolling clips some cells. Axe cannot determine their background colors. Those checks remain unknown in the original report and CLI exit remains 2; a human must inspect contrast across scroll positions. No axe rule is disabled.",
    }))
    console.log(`Generated ${version} consumer coverage complete: ${summary.counts.pass} pass, ${reviewChecks.length} contrast checks require review; ${summary.expectedChecks} assertions across ${summary.runs.length} route/viewport runs. Evidence: ${evidenceDirectory}`)
    console.log("The fixture accepts only the documented clipped-text contrast uncertainty. Screenshots await human visual review; backend persistence, real authorization and unlisted routes remain outside this fixture.")
  } finally {
    server.closeAllConnections()
    await new Promise<void>((fulfill, reject) => server.close(error => error ? reject(error) : fulfill()))
  }
}

const [command, directory, output, ...extra] = process.argv.slice(2)
if (!directory || extra.length || (command !== "prepare" && command !== "check") || (command === "prepare" && output)) throw new Error("Usage: verify-consumer.mts prepare <new-directory> | check <prepared-directory> [new-evidence-directory]")
const root = resolve(directory)
if (command === "prepare") await prepare(root)
else await check(root, output ? resolve(output) : join(root, "verification-evidence"))
