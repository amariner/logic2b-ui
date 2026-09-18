import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test, type TestContext } from "node:test"
import { addComponents, updateComponents, type FetchLike } from "../src/lib.ts"

const original = "export const title = 'Customers'\n\nexport const pageSize = 10\n"
const local = original.replace("'Customers'", "'Strategic customers'")
const upstream = original.replace("'Customers'", "'Customer directory'")
const sourcePath = "src/components/ui/button.tsx"
const basePath = ".logic2b/base/ui/button.tsx"
const recordPath = ".logic2b/update-conflicts.json"
const manifestPath = ".logic2b/manifest.json"

function registry(base: string, sources: string[], paths: (string | null)[] = sources.map(() => "ui/button.tsx")): Record<string, string> {
  const versions = sources.map((_, index) => `${index + 1}.0.0`)
  const result: Record<string, string> = {
    [`${base}/r/versions.json`]: JSON.stringify({ schemaVersion: 1, latest: versions.at(-1), channels: { next: versions.at(-1) }, versions: versions.map(version => ({ version, channel: "next", releasedAt: "2026-09-18", manifest: `/r/versions/${version}.json` })) }),
  }
  for (const [index, content] of sources.entries()) {
    const version = versions[index]
    const payload = JSON.stringify({ name: "button", type: "registry:ui", description: "Fixture", files: paths[index] === null ? [] : [{ path: paths[index], type: "registry:ui", content }] })
    const hash = createHash("sha256").update(payload).digest()
    const path = `/r/content/${hash.toString("hex")}.json`
    result[base + path] = payload
    result[`${base}/r/versions/${version}.json`] = JSON.stringify({ schemaVersion: 1, version, channel: "next", releasedAt: "2026-09-18", items: [{ name: "button", type: "registry:ui", description: "Fixture", version, registryVersion: version, integrity: `sha256-${hash.toString("base64")}`, content: path, changelog: "/r/changelog/button.json" }] })
  }
  return result
}

async function fixture(t: TestContext, sources = [original, upstream], paths?: (string | null)[]) {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-update-"))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  await mkdir(join(cwd, "src"))
  const base = "https://update-fixture.invalid"
  const routes = registry(base, sources, paths)
  const fetchImpl: FetchLike = async url => ({ ok: url in routes, status: url in routes ? 200 : 404, text: async () => routes[url] ?? "Not found" })
  const options = { cwd, registry: base, fetchImpl, install: false, agentRules: false }
  await addComponents(["button"], { ...options, registryVersion: "1.0.0" })
  return { cwd, options }
}

async function tracked(cwd: string) {
  return Object.fromEntries(await Promise.all([sourcePath, basePath, manifestPath, recordPath].map(async path => [path, existsSync(join(cwd, path)) ? await readFile(join(cwd, path), "utf8") : null])))
}

test("unresolved update conflicts survive repeated versions and partial manual edits without rewriting evidence", async t => {
  const { cwd, options } = await fixture(t, [original, upstream, upstream.replace("pageSize = 10", "pageSize = 25")])
  await writeFile(join(cwd, sourcePath), local)
  const first = await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })
  assert.equal(first.conflicts, 1)
  assert.equal(first.merged, 1)
  const marked = await readFile(join(cwd, sourcePath), "utf8")
  assert.match(marked, /<<<<<<< local \(logic2b:[a-f0-9-]+\)\nexport const title = 'Strategic customers'/)
  assert.equal(await readFile(join(cwd, basePath), "utf8"), upstream)
  const before = await tracked(cwd)
  for (const version of ["2.0.0", "3.0.0"]) {
    const repeat = await updateComponents(["button"], { ...options, registryVersion: version })
    assert.equal(repeat.conflicts, 1)
    assert.equal(repeat.merged + repeat.updated + repeat.keptLocal, 0)
    assert.deepEqual(await tracked(cwd), before)
  }
  await writeFile(join(cwd, sourcePath), marked.replace("Strategic customers", "Partially edited resolution").replace(/^<<<<<<< local.*\n/m, ""))
  const partiallyEdited = await tracked(cwd)
  assert.equal((await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })).conflicts, 1)
  assert.deepEqual(await tracked(cwd), partiallyEdited)
})

test("explicit resolution clears tracked conflict metadata and preserves customization on repeat and later upstream update", async t => {
  const { cwd, options } = await fixture(t, [original, upstream, upstream.replace("pageSize = 10", "pageSize = 25")])
  await writeFile(join(cwd, sourcePath), local)
  await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })
  await writeFile(join(cwd, sourcePath), local)
  const repeat = await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })
  assert.equal(repeat.conflicts, 0)
  assert.equal(repeat.keptLocal, 1)
  assert.equal(existsSync(join(cwd, recordPath)), false)
  assert.equal(await readFile(join(cwd, sourcePath), "utf8"), local)
  const later = await updateComponents(["button"], { ...options, registryVersion: "3.0.0" })
  assert.equal(later.conflicts, 0)
  assert.equal(later.merged, 1)
  assert.equal(await readFile(join(cwd, sourcePath), "utf8"), local.replace("pageSize = 10", "pageSize = 25"))
})

test("literal merge-marker examples are preserved and do not keep resolved updates blocked", async t => {
  const example = "/*\n<<<<<<< local\nExample local text\n=======\nExample remote text\n>>>>>>> registry\n*/\n"
  const { cwd, options } = await fixture(t, [example + original, example + upstream])
  await writeFile(join(cwd, sourcePath), example + local)
  assert.equal((await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })).conflicts, 1)
  assert.ok((await readFile(join(cwd, sourcePath), "utf8")).startsWith(example))
  await writeFile(join(cwd, sourcePath), example + local)
  assert.equal((await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })).conflicts, 0)
  assert.equal(await readFile(join(cwd, sourcePath), "utf8"), example + local)
})

test("a conflict record prepared before an interrupted source write can be retried", async t => {
  const { cwd, options } = await fixture(t)
  await writeFile(join(cwd, sourcePath), local)
  const oldTag = randomUUID()
  await writeFile(join(cwd, recordPath), JSON.stringify({ schemaVersion: 1, files: [{ path: "ui/button.tsx", tag: oldTag, conflicts: 1 }] }))
  const result = await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })
  assert.equal(result.conflicts, 1)
  assert.equal(result.merged, 1)
  assert.notEqual(JSON.parse(await readFile(join(cwd, recordPath), "utf8")).files[0].tag, oldTag)
})

test("registry-valid long and colon paths produce readable conflict records through resolution", async t => {
  for (const path of [`ui/${"a".repeat(100)}/${"b".repeat(100)}/${"c".repeat(100)}.tsx`, "ui/valid:name.tsx"]) {
    const { cwd, options } = await fixture(t, [original, upstream], [path, path])
    const target = join(cwd, "src/components", path)
    await writeFile(target, local)
    assert.equal((await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })).conflicts, 1)
    const record = await readFile(join(cwd, recordPath), "utf8")
    assert.equal(JSON.parse(record).files[0].path, path)
    const marked = await readFile(target, "utf8")
    assert.equal((await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })).conflicts, 1)
    assert.equal(await readFile(target, "utf8"), marked)
    assert.equal(await readFile(join(cwd, recordPath), "utf8"), record)
    await writeFile(target, local)
    const resolved = await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })
    assert.equal(resolved.conflicts, 0)
    assert.equal(resolved.keptLocal, 1)
    assert.equal(existsSync(join(cwd, recordPath)), false)
  }
})

test("upstream file removal or rename cannot bypass a recorded conflict in the installed item", async t => {
  for (const nextPath of [null, "ui/renamed-button.tsx"]) {
    const { cwd, options } = await fixture(t, [original, upstream, upstream], ["ui/button.tsx", "ui/button.tsx", nextPath])
    await writeFile(join(cwd, sourcePath), local)
    assert.equal((await updateComponents(["button"], { ...options, registryVersion: "2.0.0" })).conflicts, 1)
    const before = await tracked(cwd)
    const repeat = await updateComponents(["button"], { ...options, registryVersion: "3.0.0" })
    assert.equal(repeat.conflicts, 1)
    assert.equal(repeat.updated + repeat.merged, 0)
    assert.deepEqual(await tracked(cwd), before)
    assert.equal(existsSync(join(cwd, "src/components/ui/renamed-button.tsx")), false)
  }
})

test("malformed, oversized and linked update-conflict records reject before source/base/manifest changes", async t => {
  const { cwd, options } = await fixture(t)
  await writeFile(join(cwd, sourcePath), local)
  for (const record of ["not JSON", JSON.stringify({ schemaVersion: 2, files: [] }), JSON.stringify({ schemaVersion: 1, files: [{ path: "ui/button.tsx", tag: "invalid", conflicts: 1 }] }), JSON.stringify({ schemaVersion: 1, files: [{ path: "../outside", tag: randomUUID(), conflicts: 1 }] }), " ".repeat(128 * 1024 + 1)]) {
    await writeFile(join(cwd, recordPath), record)
    const before = await tracked(cwd)
    await assert.rejects(updateComponents(["button"], { ...options, registryVersion: "2.0.0" }))
    assert.deepEqual(await tracked(cwd), before)
  }
  await rm(join(cwd, recordPath))
  await writeFile(join(cwd, "outside.json"), JSON.stringify({ schemaVersion: 1, files: [] }))
  await symlink(join(cwd, "outside.json"), join(cwd, recordPath))
  const before = await tracked(cwd)
  await assert.rejects(updateComponents(["button"], { ...options, registryVersion: "2.0.0" }))
  assert.deepEqual(await tracked(cwd), before)
  await rm(join(cwd, recordPath))
  await link(join(cwd, "outside.json"), join(cwd, recordPath))
  await assert.rejects(updateComponents(["button"], { ...options, registryVersion: "2.0.0" }))
  assert.deepEqual(await tracked(cwd), before)
})

test("actual CLI returns nonzero for new and unresolved conflicts, then zero after explicit resolution", async t => {
  const { cwd } = await fixture(t)
  let routes: Record<string, string> = {}
  const server = createServer((request, response) => {
    const content = routes[`http://${request.headers.host}${request.url}`]
    response.writeHead(content ? 200 : 404, { "content-type": "application/json" }); response.end(content ?? "Not found")
  })
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
  const port = (server.address() as { port: number }).port
  const base = `http://127.0.0.1:${port}`
  routes = registry(base, [original, upstream])
  const run = (version = "2.0.0") => new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts", "update", "button", "--cwd", cwd, "--registry", base, "--registry-version", version, "--no-install", "--no-agent-rules"], { cwd: new URL("..", import.meta.url), stdio: ["ignore", "pipe", "pipe"] })
    let stdout = "", stderr = ""
    child.stdout.on("data", chunk => { stdout += chunk }); child.stderr.on("data", chunk => { stderr += chunk })
    const timer = setTimeout(() => { child.kill(); reject(new Error("CLI update timed out.")) }, 15_000)
    child.on("error", error => { clearTimeout(timer); reject(error) })
    child.on("close", code => { clearTimeout(timer); resolve({ code, stdout, stderr }) })
  })
  await writeFile(join(cwd, sourcePath), local)
  const first = await run()
  assert.equal(first.code, 1, first.stderr)
  assert.match(first.stdout, /conflict/)
  const before = await tracked(cwd)
  const repeat = await run()
  assert.equal(repeat.code, 1, repeat.stderr)
  assert.match(repeat.stdout, /unresolved/)
  assert.deepEqual(await tracked(cwd), before)
  for (const nextPath of [null, "ui/renamed-button.tsx"]) {
    routes = registry(base, [original, upstream, upstream], ["ui/button.tsx", "ui/button.tsx", nextPath])
    const next = await run("3.0.0")
    assert.equal(next.code, 1, next.stderr)
    assert.match(next.stdout, /unresolved/)
    assert.deepEqual(await tracked(cwd), before)
  }
  await writeFile(join(cwd, sourcePath), local)
  const resolved = await run()
  assert.equal(resolved.code, 0, resolved.stderr)
  assert.equal(await readFile(join(cwd, sourcePath), "utf8"), local)
  await rm(join(cwd, basePath))
  const missingBase = await run()
  assert.equal(missingBase.code, 1, missingBase.stderr)
  assert.match(missingBase.stdout, /no install snapshot/)
})
