import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { createServer, type Server } from "node:http"
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { ICON_PACKAGE_VERSIONS, scaffoldRegistryPath } from "@logic2b/scaffold"
import { summarizeVerificationReport, validateVerificationSuite } from "@logic2b/scaffold/verification"
import { addComponents, basePath, type FetchLike } from "../src/lib.ts"
import { scaffoldProject } from "../src/scaffold.ts"
import { CUSTOM_PATH, HOST_PATH, THEME_PATH, customizeCustomerSource, addSegmentFilter, customizeHost, customizeTheme, conflictCustomerSource } from "../test/fixtures/customer-journey/customizations.ts"
import { customerJourneySuite } from "../test/fixtures/customer-journey/suite.ts"

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const registryDirectory = join(repository, "apps/web/public/r")
const initialVersion = "1.0.0-rc.17"
const updatedVersion = "1.0.0-rc.18"
const statePath = "journey-state.json"
const artifactPath = "journey-artifacts"
const preservedComment = "// A concurrent consumer note retained by the refreshed filter plan.\n"
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex")
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
type Stage = "customized" | "changed" | "updated"
type Digests = Record<string, string>
interface Build { source: Digests; dist: Digests; result: string }
interface Checkpoint { stage: Stage; planId: string; source: Digests; build?: Build; verification?: { directory: string; reportSha256: string; pass: number; review: number } }
interface State { schemaVersion: 1; root: string; registryVersion: string; checkpoints: Checkpoint[] }
interface Provenance { schemaVersion: 1; registryVersion: string; items: { name: string; integrity: string; files: { path: string; registryPath: string; sha256: string }[] }[] }
interface ProcessResult { code: number | null; stdout: string; stderr: string }
interface ContrastTargets { checkId: string; viewportId: string; route: string; width: number; height: number; selectors: string[] }

async function files(directory: string, root = directory): Promise<string[]> {
  const result: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    assert.ok(!entry.isSymbolicLink(), `Fixture files must not contain symbolic links: ${path}`)
    if (entry.isDirectory()) result.push(...await files(path, root))
    else if (entry.isFile()) result.push(relative(root, path).split(sep).join("/"))
  }
  return result.sort()
}

async function digestFiles(root: string, paths: string[]): Promise<Digests> {
  const result: Digests = {}
  for (const path of [...paths].sort()) result[path] = hash(await readFile(join(root, path)))
  return result
}

async function sourceFiles(root: string, installed = true): Promise<string[]> {
  return ["package.json", ...(installed ? ["pnpm-lock.yaml"] : []), "pnpm-workspace.yaml", "tsconfig.json", "vite.config.ts", "index.html", "components.json", "journey-provenance.json", ...await files(join(root, "src"), root)].sort()
}

async function source(root: string, installed = true): Promise<Digests> { return digestFiles(root, await sourceFiles(root, installed)) }
async function managed(root: string) {
  const result: Record<string, { sha256: string; dev: number; ino: number; mode: number; mtimeMs: number; ctimeMs: number }> = {}
  for (const path of ["components.json", ...await files(join(root, "src"), root), ...await files(join(root, ".logic2b"), root)].sort()) {
    const observation = await stat(join(root, path))
    result[path] = { sha256: hash(await readFile(join(root, path))), dev: observation.dev, ino: observation.ino, mode: observation.mode, mtimeMs: observation.mtimeMs, ctimeMs: observation.ctimeMs }
  }
  return result
}
async function state(root: string): Promise<State> {
  const value = JSON.parse(await readFile(join(root, statePath), "utf8")) as State
  assert.equal(value.schemaVersion, 1); assert.equal(value.root, root)
  assert.ok(value.checkpoints.length > 0 && value.checkpoints.length <= 3)
  assert.deepEqual(value.checkpoints.map(item => item.stage), ["customized", "changed", "updated"].slice(0, value.checkpoints.length))
  return value
}
const current = (value: State) => value.checkpoints[value.checkpoints.length - 1]
async function saveState(root: string, value: State) { await writeFile(join(root, statePath), json(value)) }
async function artifact(root: string, name: string, value: unknown) { await writeFile(join(root, artifactPath, name), json(value), { flag: "wx" }) }

async function execute(command: string, args: string[], cwd: string): Promise<ProcessResult> {
  return new Promise((fulfill, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = "", stderr = "", exceeded = false
    const timer = setTimeout(() => { exceeded = true; child.kill("SIGTERM") }, 600_000)
    child.stdout.on("data", chunk => { stdout += chunk; if (stdout.length > 4 * 1024 * 1024) { exceeded = true; child.kill("SIGTERM") } })
    child.stderr.on("data", chunk => { stderr += chunk; if (stderr.length > 2 * 1024 * 1024) { exceeded = true; child.kill("SIGTERM") } })
    child.on("error", error => { clearTimeout(timer); reject(error) })
    child.on("close", code => { clearTimeout(timer); if (exceeded) reject(new Error("Fixture process exceeded its time/output budget.")); else fulfill({ code, stdout, stderr }) })
  })
}
const cli = (args: string[], root: string) => execute(process.execPath, [join(repository, "packages/cli/dist/index.js"), ...args], root)

const fetchImpl: FetchLike = async input => {
  const url = new URL(input), path = decodeURIComponent(url.pathname.slice(3))
  if (!url.pathname.startsWith("/r/") || !path.endsWith(".json") || path.split("/").some(part => !part || part === "." || part === ".." || part.includes("\\"))) return { ok: false, status: 404, text: async () => "Not found" }
  try { const content = await readFile(join(registryDirectory, path), "utf8"); return { ok: true, status: 200, text: async () => content } }
  catch { return { ok: false, status: 404, text: async () => "Not found" } }
}

async function immutable(version: string, name: string) {
  const manifest = JSON.parse(await readFile(join(registryDirectory, `versions/${version}.json`), "utf8"))
  const entry = manifest.items.find((candidate: { name: string }) => candidate.name === name)
  assert.ok(entry, `Missing immutable ${version}/${name}`)
  const bytes = await readFile(join(repository, "apps/web/public", entry.content))
  assert.equal(`sha256-${createHash("sha256").update(bytes).digest("base64")}`, entry.integrity)
  return { entry, item: JSON.parse(bytes.toString("utf8")) as { files: { path: string; content: string }[] } }
}

async function plan(root: string, label: string, candidates: { path: string; content: string; reason: string }[]) {
  const request = join(root, artifactPath, `${label}-request.json`), output = join(root, artifactPath, `${label}-plan.json`)
  await writeFile(request, json({ schemaVersion: 1, candidates }), { flag: "wx" })
  const before = await managed(root)
  const result = await cli(["change", "plan", request, "--cwd", root, "--output", output, "--json"], root)
  await artifact(root, `${label}-plan-process.json`, result)
  assert.equal(result.code, 0, result.stderr || result.stdout)
  assert.deepEqual(await managed(root), before, "Planning must not mutate source, bases or install metadata")
  const value = JSON.parse(await readFile(output, "utf8"))
  assert.deepEqual(value, JSON.parse(result.stdout)); assert.deepEqual(value.conflicts, []); assert.deepEqual(value.unsupported, [])
  assert.equal(value.dependencies.length, 0)
  return { path: output, value }
}

async function apply(root: string, path: string, label: string, dryRun = false) {
  const result = await cli(["change", "apply", path, "--cwd", root, ...(dryRun ? ["--dry-run"] : []), "--json"], root)
  await artifact(root, `${label}-apply-process.json`, result)
  const value = JSON.parse(result.stdout)
  assert.equal(value.dependencyInstallation, "not-run")
  return { result, value }
}

async function prepare(root: string) {
  await stat(join(repository, "packages/cli/dist/index.js"))
  await mkdir(root)
  await scaffoldProject({ cwd: root, registry: "https://ui.logic2b.com", registryVersion: initialVersion, framework: "vite", starter: "auth", name: "logic2b-customer-journey", install: false, fetchImpl })
  const installed = await addComponents(["admin-customers-01", "customer-edit-01"], { cwd: root, registryVersion: initialVersion, install: false, fetchImpl })
  const installManifest = JSON.parse(await readFile(join(root, ".logic2b/manifest.json"), "utf8"))
  assert.equal(installManifest.registry.resolvedVersion, initialVersion)
  const provenance: Provenance = { schemaVersion: 1, registryVersion: initialVersion, items: [] }
  for (const [name, item] of installed) {
    const remote = await immutable(initialVersion, name), copied = []
    assert.equal(installManifest.items[name].integrity, remote.entry.integrity)
    assert.equal(installManifest.items[name].version, remote.entry.version)
    for (const file of remote.item.files) {
      const path = scaffoldRegistryPath("src", file.path), bytes = await readFile(join(root, path), "utf8")
      assert.equal(bytes, file.content, `${name}: copied immutable bytes differ`)
      assert.equal(await readFile(basePath(root, file.path), "utf8"), file.content)
      copied.push({ path, registryPath: file.path, sha256: hash(bytes) })
    }
    assert.deepEqual(item.files?.map(file => file.content), remote.item.files.map(file => file.content))
    provenance.items.push({ name, integrity: remote.entry.integrity, files: copied })
  }
  const packagePath = join(root, "package.json"), pkg = JSON.parse(await readFile(packagePath, "utf8"))
  pkg.dependencies["lucide-react"] = ICON_PACKAGE_VERSIONS["lucide-react"]
  for (const item of installed.values()) for (const dependency of item.dependencies ?? []) assert.ok(pkg.dependencies[dependency], `Missing pinned dependency ${dependency}`)
  pkg.devDependencies.playwright = "1.61.1"; pkg.devDependencies["@axe-core/playwright"] = "4.12.1"; pkg.packageManager = "pnpm@11.10.0"
  await writeFile(packagePath, json(pkg))
  await writeFile(join(root, "pnpm-workspace.yaml"), "packages: []\nverifyDepsBeforeRun: false\nallowBuilds:\n  esbuild: true\n")
  await writeFile(join(root, HOST_PATH), customizeHost(await readFile(join(repository, "packages/cli/test/fixtures/consumer-verification/starter-page.tsx"), "utf8")))
  const html = (await readFile(join(root, "index.html"), "utf8"))
    .replace('<html lang="en" class="dark">', '<html lang="en">')
    .replace("<title>logic2b starter</title>", '<title>Customer lifecycle acceptance fixture</title>\n    <script>const fixtureParams = new URLSearchParams(location.search); document.documentElement.classList.toggle("dark", fixtureParams.get("theme") === "dark"); document.documentElement.lang = fixtureParams.get("locale") === "es" ? "es" : "en";</script>')
  await writeFile(join(root, "index.html"), html)
  await writeFile(join(root, "journey-provenance.json"), json(provenance))
  await mkdir(join(root, artifactPath))
  const sourceBefore = await source(root, false)
  const basesBefore = await digestFiles(root, await files(join(root, ".logic2b/base"), root))
  const first = await plan(root, "create", [
    { path: CUSTOM_PATH, content: customizeCustomerSource(await readFile(join(root, CUSTOM_PATH), "utf8")), reason: "Preserve a customer-owned Account owner column and custom workspace copy." },
    { path: THEME_PATH, content: customizeTheme(await readFile(join(root, THEME_PATH), "utf8")), reason: "Keep the consumer's primary color override." },
  ])
  assert.equal(first.value.registryVersion, initialVersion)
  assert.equal(first.value.operations.length, 2)
  const applied = await apply(root, first.path, "create")
  assert.equal(applied.result.code, 0); assert.equal(applied.value.status, "applied")
  assert.deepEqual(await source(root, false), { ...sourceBefore, ...Object.fromEntries(first.value.operations.map((operation: { path: string; afterSha256: string }) => [operation.path, operation.afterSha256])) }, "Initial customization changed an unrelated application file")
  assert.deepEqual(await digestFiles(root, await files(join(root, ".logic2b/base"), root)), basesBefore, "Customizations must not become upstream merge bases")
  await saveState(root, { schemaVersion: 1, root, registryVersion: initialVersion, checkpoints: [{ stage: "customized", planId: first.value.id, source: await source(root, false) }] })
  console.log(`Prepared ${initialVersion} customer journey and applied custom column, copy and theme through plan ${first.value.id}.`)
  console.log("Next explicitly install dependencies, then run journey build and check. Preparation does not install or build.")
}

async function requireVerified(root: string, expected: Stage) {
  const value = await state(root), checkpoint = current(value)
  assert.equal(checkpoint.stage, expected, `Expected ${expected} lifecycle stage`)
  assert.ok(checkpoint.verification, `Build and check ${expected} before continuing the lifecycle`)
  assert.deepEqual(await source(root), checkpoint.source, "Source changed after accepted verification")
  return value
}

async function change(root: string) {
  const value = await requireVerified(root, "customized")
  const sourceBefore = await source(root)
  const upstreamPaths = [".logic2b/manifest.json", ...await files(join(root, ".logic2b/base"), root)]
  const upstreamBefore = await digestFiles(root, upstreamPaths)
  const content = await readFile(join(root, CUSTOM_PATH), "utf8")
  const candidate = { path: CUSTOM_PATH, content: addSegmentFilter(content), reason: "Add a segment filter while keeping the custom column, copy and theme." }
  const stale = await plan(root, "filter-stale", [candidate])
  const beforeDryRun = await managed(root), dryRun = await apply(root, stale.path, "filter-dry-run", true)
  assert.equal(dryRun.result.code, 0); assert.equal(dryRun.value.status, "ready")
  const afterDryRun = await managed(root)
  assert.deepEqual(afterDryRun, beforeDryRun, "Dry-run changed application or metadata")
  await artifact(root, "filter-dry-run-no-write.json", { before: beforeDryRun, after: afterDryRun })
  await writeFile(join(root, CUSTOM_PATH), preservedComment + content)
  const beforeRejected = await managed(root), rejected = await apply(root, stale.path, "filter-stale")
  assert.equal(rejected.result.code, 1); assert.equal(rejected.value.status, "conflict")
  const afterRejected = await managed(root)
  assert.deepEqual(afterRejected, beforeRejected, "Stale rejection changed an application target or metadata")
  await artifact(root, "filter-stale-no-write.json", { before: beforeRejected, after: afterRejected })
  const fresh = await plan(root, "filter-fresh", [{ ...candidate, content: addSegmentFilter(await readFile(join(root, CUSTOM_PATH), "utf8")) }])
  assert.equal(fresh.value.registryVersion, initialVersion)
  assert.notEqual(fresh.value.id, stale.value.id)
  const applied = await apply(root, fresh.path, "filter-fresh")
  assert.equal(applied.result.code, 0); assert.equal(applied.value.status, "applied")
  const beforeRepeat = await managed(root), repeated = await apply(root, fresh.path, "filter-repeat")
  assert.equal(repeated.result.code, 0); assert.equal(repeated.value.status, "already-applied")
  const afterRepeat = await managed(root)
  assert.deepEqual(afterRepeat, beforeRepeat, "Repeat apply must be a complete source/base/metadata no-op")
  await artifact(root, "filter-repeat-no-write.json", { before: beforeRepeat, after: afterRepeat })
  assert.deepEqual(await source(root), { ...sourceBefore, [CUSTOM_PATH]: hash(addSegmentFilter(preservedComment + content)) }, "The second request changed an unrelated source or customization")
  assert.deepEqual(await digestFiles(root, upstreamPaths), upstreamBefore, "The second request must not alter upstream bases or installation metadata")
  assert.ok((await readFile(join(root, CUSTOM_PATH), "utf8")).startsWith(preservedComment))
  value.checkpoints.push({ stage: "changed", planId: fresh.value.id, source: await source(root) })
  await saveState(root, value)
  console.log(`Second request applied as ${fresh.value.id}; dry-run, stale rejection and idempotent repeat are recorded. Build and check the changed stage next.`)
}

async function serve(directory: string, app = false): Promise<{ server: Server; origin: string }> {
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405); response.end(); return }
      const path = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname)
      const target = app && (path === "/" || path === "/customers") ? join(directory, "index.html") : resolve(directory, `.${path}`)
      if (!target.startsWith(`${directory}${sep}`)) { response.writeHead(404); response.end(); return }
      const bytes = await readFile(target)
      const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml" }
      response.writeHead(200, { "Content-Type": mime[extname(target)] ?? "application/octet-stream", "Cache-Control": "no-store" })
      response.end(request.method === "HEAD" ? undefined : bytes)
    } catch { response.writeHead(404); response.end("Not found") }
  })
  await new Promise<void>((fulfill, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", fulfill) })
  const address = server.address(); assert.ok(address && typeof address !== "string")
  return { server, origin: `http://127.0.0.1:${address.port}` }
}
async function close(server: Server) { server.closeAllConnections(); await new Promise<void>((fulfill, reject) => server.close(error => error ? reject(error) : fulfill())) }

async function update(root: string) {
  const value = await requireVerified(root, "changed")
  const expectedSource = await source(root)
  const conflictRoot = join(root, artifactPath, "conflict-consumer")
  await mkdir(conflictRoot)
  await mkdir(join(conflictRoot, ".logic2b"))
  // Recovery journals belong to their original root. A conflict branch copies
  // only installed bases/metadata and owns its new resolution transaction.
  for (const path of ["src", "components.json", "package.json", ".logic2b/base", ".logic2b/manifest.json"]) await cp(join(root, path), join(conflictRoot, path), { recursive: true, errorOnExist: true })
  await mkdir(join(conflictRoot, artifactPath))
  await writeFile(join(conflictRoot, CUSTOM_PATH), conflictCustomerSource(await readFile(join(conflictRoot, CUSTOM_PATH), "utf8")))
  const originalTheme = await readFile(join(root, THEME_PATH), "utf8"), originalHost = await readFile(join(root, HOST_PATH), "utf8")
  const registry = await serve(join(repository, "apps/web/public"))
  const args = ["update", "admin-customers-01", "customer-edit-01", "--registry", registry.origin, "--registry-version", updatedVersion, "--no-install", "--no-agent-rules"]
  try {
    const result = await cli([...args, "--cwd", root], root)
    await artifact(root, "upstream-update-process.json", result)
    assert.equal(result.code, 0, result.stderr || result.stdout)
    const expectedRemote = await immutable(updatedVersion, "admin-customers-01")
    const block = expectedRemote.item.files.find(file => scaffoldRegistryPath("src", file.path) === CUSTOM_PATH)
    assert.ok(block)
    const expected = preservedComment + addSegmentFilter(customizeCustomerSource(block.content))
    expectedSource[CUSTOM_PATH] = hash(expected)
    assert.equal(await readFile(join(root, CUSTOM_PATH), "utf8"), expected, "Upstream merge must keep every custom source edit and include rc.18")
    assert.equal(await readFile(join(root, THEME_PATH), "utf8"), originalTheme)
    assert.equal(await readFile(join(root, HOST_PATH), "utf8"), originalHost)
    const provenance = JSON.parse(await readFile(join(root, "journey-provenance.json"), "utf8")) as Provenance
    const manifest = JSON.parse(await readFile(join(root, ".logic2b/manifest.json"), "utf8"))
    assert.equal(manifest.registry.resolvedVersion, updatedVersion)
    for (const installed of provenance.items) {
      const remote = await immutable(updatedVersion, installed.name)
      assert.equal(manifest.items[installed.name].integrity, remote.entry.integrity)
      assert.equal(manifest.items[installed.name].version, remote.entry.version)
      for (const file of remote.item.files) {
        assert.equal(await readFile(basePath(root, file.path), "utf8"), file.content, "Merge bases must be pristine upstream bytes")
        const path = scaffoldRegistryPath("src", file.path)
        if (path !== CUSTOM_PATH) { assert.equal(await readFile(join(root, path), "utf8"), file.content); expectedSource[path] = hash(file.content) }
      }
    }
    const conflict = await cli([...args, "--cwd", conflictRoot], conflictRoot)
    await artifact(root, "conflicting-update-process.json", conflict)
    assert.equal(conflict.code, 1, "A marked upstream conflict must return a failing exit code")
    const marked = await readFile(join(conflictRoot, CUSTOM_PATH), "utf8")
    assert.match(marked, /^<<<<<<< local \(logic2b:[a-f0-9-]+\)$/m); assert.match(marked, /^=======$/m); assert.match(marked, /^>>>>>>> registry \(logic2b:[a-f0-9-]+\)$/m)
    await artifact(root, "conflicting-source.json", { path: CUSTOM_PATH, sha256: hash(marked), content: marked })
    const beforeRepeat = await managed(conflictRoot)
    const repeat = await cli([...args, "--cwd", conflictRoot], conflictRoot)
    await artifact(root, "conflicting-update-repeat-process.json", repeat)
    assert.equal(repeat.code, 1, "Repeating an unresolved conflict must not claim success")
    const afterRepeat = await managed(conflictRoot)
    assert.deepEqual(afterRepeat, beforeRepeat, "Repeat conflicting update must preserve marked files and metadata")
    await artifact(root, "conflicting-update-repeat-no-write.json", { before: beforeRepeat, after: afterRepeat })
    // Explicit resolution takes the actual clean merged source and keeps the
    // deliberate local presentation choice, with fresh marker-bearing hashes.
    const upstreamTable = '<Table className="min-w-72 table-fixed sm:min-w-[40rem]"'
    assert.equal(expected.split(upstreamTable).length, 2)
    const resolved = expected.replace(upstreamTable, '<Table className="min-w-72 table-fixed sm:min-w-[40rem] caption-bottom"')
    assert.doesNotMatch(resolved, /^<<<<<<< |^=======|^>>>>>>> /m)
    const resolution = await plan(conflictRoot, "resolve-conflict", [{ path: CUSTOM_PATH, content: resolved, reason: "Explicitly combine the local table presentation with the upstream scroll fix and retained customizations." }])
    assert.equal(resolution.value.registryVersion, updatedVersion, "Resolution must use fresh installed registry evidence")
    const applied = await apply(conflictRoot, resolution.path, "resolve-conflict")
    assert.equal(applied.result.code, 0); assert.equal(applied.value.status, "applied")
    assert.equal(await readFile(join(conflictRoot, CUSTOM_PATH), "utf8"), resolved)
    const resolvedUpdate = await cli([...args, "--cwd", conflictRoot], conflictRoot)
    await artifact(root, "resolved-update-process.json", resolvedUpdate)
    assert.equal(resolvedUpdate.code, 0); assert.equal(await readFile(join(conflictRoot, CUSTOM_PATH), "utf8"), resolved)
    // A per-command registry override does not silently rewrite the consumer's
    // pin. Make that future-selection decision an explicit, inspectable change.
    const config = JSON.parse(await readFile(join(root, "components.json"), "utf8"))
    assert.equal(config.logic2b.version, initialVersion)
    const pinned = { ...config, logic2b: { ...config.logic2b, version: updatedVersion } }
    const pin = await plan(root, "pin-updated-registry", [{ path: "components.json", content: json(pinned), reason: "Explicitly select the accepted registry update for future commands while preserving consumer configuration." }])
    assert.equal(pin.value.registryVersion, updatedVersion)
    assert.deepEqual(pin.value.operations.map((operation: { path: string }) => operation.path), ["components.json"])
    const pinnedResult = await apply(root, pin.path, "pin-updated-registry")
    assert.equal(pinnedResult.result.code, 0); assert.equal(pinnedResult.value.status, "applied")
    expectedSource["components.json"] = hash(json(pinned))
    assert.deepEqual(await source(root), expectedSource, "Upstream update or explicit pin changed an unrelated app file")
    const status = await cli(["status", "--cwd", root, "--registry", registry.origin], root)
    await artifact(root, "updated-default-selection-process.json", status)
    assert.equal(status.code, 0); assert.ok(status.stdout.includes(`Requested: ${updatedVersion}`)); assert.ok(status.stdout.includes(`Selected now: ${updatedVersion}`))
    assert.ok(status.stdout.includes("registry selection matches the installed lock"))
    await artifact(root, "update-preservation.json", { schemaVersion: 1, from: initialVersion, to: updatedVersion, filterPlanId: current(value).planId, pinPlanId: pin.value.id, cleanMergedSourceSha256: hash(expected), themeSha256: hash(originalTheme), hostSha256: hash(originalHost), conflictSourceSha256: hash(marked), resolvedSourceSha256: hash(resolved), resolutionPlanId: resolution.value.id, conflictDirectory: conflictRoot })
    value.registryVersion = updatedVersion
    value.checkpoints.push({ stage: "updated", planId: pin.value.id, source: await source(root) })
    await saveState(root, value)
    console.log(`Updated to ${updatedVersion}; custom column, copy, filter, consumer note and theme survived. Explicit conflict/repeat/resolution evidence is retained. Build and check next.`)
  } finally { await close(registry.server) }
}

async function build(root: string) {
  const value = await state(root), checkpoint = current(value)
  assert.ok(!checkpoint.build && !checkpoint.verification, "This stage already has a recorded build; use its pending check or prepare a fresh fixture")
  // Only the explicit installation may add the lockfile between prepare/build.
  const before = await source(root)
  const expected = { ...before }; if (checkpoint.stage === "customized") delete expected["pnpm-lock.yaml"]
  assert.deepEqual(expected, checkpoint.source, "Application source changed outside the recorded lifecycle")
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"))
  assert.equal(packageJson.scripts.build, "tsc --noEmit && vite build", "Only the known generated fixture build script is authorized")
  await rm(join(root, "dist"), { recursive: true, force: true })
  const result = await execute("pnpm", ["run", "build"], root)
  await artifact(root, `${checkpoint.stage}-build-process.json`, result)
  assert.equal(result.code, 0, result.stderr || result.stdout)
  assert.deepEqual(await source(root), before, "Build changed application source or installed dependency declarations")
  await stat(join(root, "dist/index.html"))
  const dist = await digestFiles(join(root, "dist"), await files(join(root, "dist")))
  assert.ok(Object.keys(dist).length >= 2)
  checkpoint.source = before
  checkpoint.build = { source: before, dist, result: `${artifactPath}/${checkpoint.stage}-build-process.json` }
  await saveState(root, value)
  console.log(`Built ${checkpoint.stage} explicitly with source and ${Object.keys(dist).length} production artifact hashes recorded. Check runs this build without installation or rebuilding.`)
}

export async function tableMembership(page: import("playwright").Page, selectors: string[]) {
  assert.ok(selectors.length > 0 && selectors.length <= 128, "Contrast review requires bounded, nonempty targets")
  for (const selector of selectors) assert.ok(typeof selector === "string" && selector.length > 0 && selector.length <= 1024 && !/[\u0000-\u001f]/.test(selector), "Contrast review supports only bounded CSS selector strings")
  const observations = await page.evaluate(selectors => {
    const regions = document.querySelectorAll('[role="region"][aria-label="Todos los clientes"]')
    const region = regions.length === 1 ? regions[0] : null
    const tables = region?.querySelectorAll("table")
    const table = tables?.length === 1 ? tables[0] : null
    return selectors.map(selector => {
      const matches = Array.from(document.querySelectorAll(selector))
      return { selector, matches: matches.slice(0, 129).map(element => ({ tag: element.tagName.toLowerCase(), text: element.textContent?.trim().slice(0, 120) ?? "", inNamedTable: !!region && !!table && region.contains(element) && table.contains(element) && element.closest("table") === table })) }
    })
  }, selectors)
  for (const observation of observations) {
    assert.ok(observation.matches.length > 0 && observation.matches.length <= 128, "Contrast target must resolve to a bounded, nonempty set of DOM nodes")
    assert.ok(observation.matches.every(match => match.inNamedTable), "Contrast target is outside the named customer table")
  }
  return observations
}

export async function themeEvidence(root: string, origin: string, contrastTargets: ContrastTargets[] = []) {
  const require = createRequire(join(root, "package.json")), { chromium } = require("playwright") as typeof import("playwright")
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
    await page.goto(`${origin}/customers`)
    const button = page.getByRole("button", { name: "Add customer", exact: true })
    await button.waitFor()
    const mobileOwner = page.getByText("Account owner: Lin Park", { exact: true })
    assert.equal(await mobileOwner.isVisible(), true, "The custom owner must remain visible in the mobile summary")
    const mobileOwnerBox = await mobileOwner.boundingBox()
    assert.ok(mobileOwnerBox && mobileOwnerBox.width > 0 && mobileOwnerBox.height > 0)
    const observed = await button.evaluate(element => {
      const root = getComputedStyle(document.documentElement), button = getComputedStyle(element)
      return { primary: root.getPropertyValue("--primary").trim(), foreground: root.getPropertyValue("--primary-foreground").trim(), background: button.backgroundColor, color: button.color }
    })
    assert.equal(observed.primary.toLowerCase(), "#075985"); assert.ok(["#fff", "#ffffff"].includes(observed.foreground.toLowerCase()), "Vite may shorten an equivalent white token")
    assert.equal(observed.background, "rgb(7, 89, 133)"); assert.equal(observed.color, "rgb(255, 255, 255)")
    const luminance = [7, 89, 133].map(value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
    const contrastRatio = 1.05 / (luminance + .05)
    assert.ok(contrastRatio >= 4.5)
    await page.setViewportSize({ width: 1280, height: 900 })
    const desktopOwner = page.getByRole("cell", { name: "Lin Park", exact: true })
    const ownerHeader = page.getByRole("columnheader", { name: "Account owner", exact: true })
    assert.equal(await ownerHeader.isVisible(), true)
    const headerText = await ownerHeader.evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element)
      const box = element.getBoundingClientRect()
      return { box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom }, fragments: Array.from(range.getClientRects(), rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })) }
    })
    assert.ok(headerText.fragments.length > 0)
    for (const fragment of headerText.fragments) {
      assert.ok(fragment.left >= headerText.box.left - 1 && fragment.right <= headerText.box.right + 1, "The owner heading must not overlap an adjacent column")
      assert.ok(fragment.top >= headerText.box.top - 1 && fragment.bottom <= headerText.box.bottom + 1, "The owner heading must remain inside its table header")
    }
    assert.equal(await desktopOwner.isVisible(), true, "The custom owner column must remain visible on desktop")
    const desktopOwnerBox = await desktopOwner.boundingBox()
    assert.ok(desktopOwnerBox && desktopOwnerBox.width > 0 && desktopOwnerBox.height > 0)
    const ancestry = []
    for (const review of contrastTargets) {
      await page.setViewportSize({ width: review.width, height: review.height })
      await page.goto(`${origin}${review.route}`)
      await page.evaluate(() => { const root = document.documentElement; root.style.fontSize = `${parseFloat(getComputedStyle(root).fontSize) * 2}px` })
      const region = page.getByRole("region", { name: "Todos los clientes", exact: true })
      await region.press("ArrowRight"); await region.press("ArrowLeft")
      if (review.checkId === "large-edit-axe") {
        await page.getByRole("button", { name: "Editar Alejandra Fernández de la Vega — Responsable de relaciones internacionales y atención a clientes", exact: true }).click()
        await page.getByRole("textbox", { name: "Nombre completo", exact: true }).waitFor()
      }
      const observations = await tableMembership(page, review.selectors)
      assert.equal(await page.locator("h1").count(), 1, "The negative ancestry probe requires the real page heading")
      await assert.rejects(() => tableMembership(page, ["h1"]), /outside the named customer table/)
      ancestry.push({ ...review, observations, negativeHeadingProbe: { selector: "h1", rejected: true } })
    }
    return { schemaVersion: 1, kind: "trusted-fixture-browser-measurement", viewports: [{ width: 390, height: 900 }, { width: 1280, height: 900 }], observed, contrastRatio, minimum: 4.5, responsiveOwner: { mobile: { text: "Account owner: Lin Park", visible: true, box: mobileOwnerBox }, desktop: { text: "Lin Park", column: "Account owner", visible: true, box: desktopOwnerBox, headerText } }, contrastTargetAncestry: { observations: ancestry, limitation: "Separate route/state replay confirms target membership in the named scrolling table, not the exact scroll position or instant of the original axe measurement. Contrast remains unknown and requires human review." }, browserVersion: browser.version(), limitation: "This measures the light-theme Add customer button and one responsive owner field; it is not a full visual or accessibility approval." }
  } finally { await browser.close() }
}

async function check(root: string, evidenceDirectory: string) {
  const value = await state(root), checkpoint = current(value)
  assert.ok(checkpoint.build, "Run the explicit journey build phase before checking")
  assert.ok(!checkpoint.verification, "This stage is already checked; a new lifecycle must use a new fixture")
  assert.deepEqual(await source(root), checkpoint.build.source, "Build is stale: source changed after the recorded successful build")
  const dist = join(root, "dist")
  assert.deepEqual(await digestFiles(dist, await files(dist)), checkpoint.build.dist, "Built production artifact hashes changed")
  const suite = validateVerificationSuite(customerJourneySuite(checkpoint.stage, Object.keys(checkpoint.source), checkpoint.planId))
  const suiteFile = join(root, artifactPath, `${checkpoint.stage}-suite.json`)
  try { await writeFile(suiteFile, json(suite), { flag: "wx" }) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; assert.equal(await readFile(suiteFile, "utf8"), json(suite), "Existing stage suite differs; prepare a fresh fixture") }
  const host = await serve(dist, true)
  try {
    const result = await cli(["verify", suiteFile, "--cwd", root, "--url", host.origin, "--output", evidenceDirectory, "--json"], root)
    const reportBytes = await readFile(join(evidenceDirectory, "report.json")), report = JSON.parse(reportBytes.toString("utf8"))
    const summary = await summarizeVerificationReport(report)
    assert.deepEqual(report.suite, suite)
    assert.deepEqual(JSON.parse(await readFile(join(evidenceDirectory, "summary.json"), "utf8")), summary)
    assert.deepEqual(JSON.parse(result.stdout), { report, summary })
    assert.equal(summary.planId, checkpoint.planId)
    assert.deepEqual(Object.fromEntries(report.project.files.map((file: { path: string; sha256: string }) => [file.path, file.sha256])), checkpoint.source)
    for (const name of ["logic2b", "node", "playwright", "@axe-core/playwright", "chromium"]) assert.ok(report.tools.some((tool: { name: string; version: string }) => tool.name === name && tool.version.length), `Missing executed tool version ${name}`)
    const toolVersion = (name: string) => report.tools.find((tool: { name: string }) => tool.name === name)?.version
    assert.equal(toolVersion("logic2b"), JSON.parse(await readFile(join(repository, "packages/cli/package.json"), "utf8")).version)
    assert.equal(toolVersion("node"), process.versions.node)
    assert.equal(toolVersion("playwright"), "1.61.1"); assert.equal(toolVersion("@axe-core/playwright"), "4.12.1")
    assert.equal(report.project.servedSourceBinding, "unverified")
    const allowed = new Set(checkpoint.stage === "updated" ? ["mobile", "desktop"].flatMap(viewport => ["large-list-axe", "large-edit-axe"].map(id => `translated-large-text/${viewport}/${id}`)) : [])
    const review = summary.checks.filter(check => check.status === "unknown")
    const contrastTargets: ContrastTargets[] = []
    if (summary.counts.fail || summary.counts.skipped) console.error(json({ counts: summary.counts, runs: summary.runs.filter(run => run.status !== "pass"), checks: summary.checks.filter(check => check.status === "fail") }))
    assert.equal(summary.counts.fail, 0, `Browser failures; inspect ${evidenceDirectory}`)
    assert.equal(summary.counts.skipped, 0, `Unexecuted checks; inspect ${evidenceDirectory}`)
    for (const check of review) {
      assert.ok(allowed.has(`${check.scenarioId}/${check.viewportId}/${check.checkId}`), `Unexpected unknown ${check.checkId}`)
      assert.equal(check.assertion, "axe"); assert.ok(check.evidenceIds.length)
      const scenario = suite.scenarios.find(scenario => scenario.id === check.scenarioId)!, viewport = suite.viewports.find(viewport => viewport.id === check.viewportId)!
      const targets: ContrastTargets = { checkId: check.checkId, viewportId: check.viewportId, route: scenario.route, width: viewport.width, height: viewport.height, selectors: [] }
      for (const id of check.evidenceIds) {
        const evidence = report.evidence.find((entry: { id: string }) => entry.id === id)
        assert.equal(evidence?.kind, "axe")
        const observation = JSON.parse(await readFile(join(evidenceDirectory, evidence.reference), "utf8"))
        assert.equal(observation.status, "unknown"); assert.equal(observation.assertion.id, check.checkId)
        assert.deepEqual(observation.observed.violations, []); assert.ok(observation.observed.incomplete.length)
        for (const rule of observation.observed.incomplete) {
          assert.equal(rule.id, "color-contrast"); assert.ok(rule.nodes.length)
          for (const node of rule.nodes) {
            assert.ok(Array.isArray(node.target) && node.target.length === 1 && typeof node.target[0] === "string", "Contrast review cannot qualify shadow targets or non-CSS selectors")
            assert.ok(node.target[0].length > 0 && node.target[0].length <= 1024 && targets.selectors.length < 128, "Contrast target collection exceeds fixture bounds")
            targets.selectors.push(node.target[0])
            assert.deepEqual(node.all, []); assert.deepEqual(node.none, []); assert.ok(node.any.length)
            for (const reason of node.any) { assert.equal(reason.id, "color-contrast"); assert.equal(reason.data?.messageKey, "elmPartiallyObscured") }
          }
        }
      }
      assert.ok(targets.selectors.length > 0); contrastTargets.push(targets)
    }
    assert.equal(result.code, review.length ? 2 : 0, result.stderr)
    assert.equal(summary.status, review.length ? "unknown" : "pass")
    assert.equal(summary.reportedChecks, summary.expectedChecks)
    assert.equal(summary.counts.pass + review.length, summary.expectedChecks)
    assert.equal(summary.runs.length, suite.scenarios.length * suite.viewports.length)
    assert.equal(summary.runCounts.fail, 0); assert.equal(summary.runCounts.skipped, 0)
    for (const run of summary.runs) {
      const needsReview = review.some(check => check.scenarioId === run.scenarioId && check.viewportId === run.viewportId)
      assert.equal(run.status, needsReview ? "unknown" : "pass")
      assert.equal(run.reason, needsReview ? "One or more browser measurements require human review." : "Every declared action and check completed.")
    }
    for (const evidence of report.evidence) {
      assert.ok(!evidence.reference.includes(":") && !evidence.reference.startsWith("/"))
      assert.equal(hash(await readFile(join(evidenceDirectory, evidence.reference))), evidence.sha256)
    }
    const measurement = await themeEvidence(root, host.origin, contrastTargets)
    assert.equal(toolVersion("chromium"), measurement.browserVersion)
    await writeFile(join(evidenceDirectory, "theme-measurement.json"), json(measurement))
    assert.deepEqual(await source(root), checkpoint.build.source, "Consumer source changed during lifecycle verification")
    assert.deepEqual(await digestFiles(dist, await files(dist)), checkpoint.build.dist, "Consumer build changed during lifecycle verification")
    await writeFile(join(evidenceDirectory, "lifecycle-build.json"), json({ schemaVersion: 1, stage: checkpoint.stage, registryVersion: value.registryVersion, planId: checkpoint.planId, ...checkpoint.build, limitations: ["The trusted fixture explicitly ran its known build command against stable source, recorded output hashes, and served those artifacts itself. This local observation is not cryptographic provenance or a remote attestation.", "Screenshots require visual review; synthetic persistence and permission simulation do not verify production services."] }))
    await writeFile(join(evidenceDirectory, "contrast-review.json"), json({ status: review.length ? "human-review-required" : "no-incomplete-contrast-checks", checks: review, reason: "Only the documented 200% table-scroll clipped-text contrast uncertainties are accepted by this fixture; original checks remain unknown and CLI retains exit 2. No axe rule is disabled." }))
    checkpoint.verification = { directory: evidenceDirectory, reportSha256: hash(reportBytes), pass: summary.counts.pass, review: review.length }
    await saveState(root, value)
    console.log(`${checkpoint.stage}: ${summary.counts.pass} passing assertions, ${review.length} qualified contrast reviews, ${summary.runs.length} route/viewport runs. Evidence: ${evidenceDirectory}`)
  } finally { await close(host.server) }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, directory, output, ...extra] = process.argv.slice(2)
  if (!directory || extra.length || !["prepare", "change", "update", "build", "check"].includes(command) || (command === "check" ? !output : !!output)) throw new Error("Usage: verify-customer-journey.mts prepare|change|update|build <project> | check <project> <new-evidence-directory>")
  const root = resolve(directory)
  if (command === "prepare") await prepare(root)
  else if (command === "change") await change(root)
  else if (command === "update") await update(root)
  else if (command === "build") await build(root)
  else await check(root, resolve(output))
}
