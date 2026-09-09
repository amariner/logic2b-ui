import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import ts from "typescript"
import { dirname, join, relative, resolve } from "node:path"
import { test } from "node:test"
import { collectProjectSnapshot, inspectLocalProject } from "../src/inspect.ts"

async function fixture(t: { after: (fn: () => Promise<void>) => void }, files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "logic2b-inspect-"))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const [path, content] of Object.entries(files)) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), content) }
  return root
}
async function tree(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const walk = async (dir: string, prefix = "") => { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = `${prefix}${entry.name}`; if (entry.isDirectory()) await walk(join(dir, entry.name), `${path}/`); else if (entry.isFile()) result[path] = (await readFile(join(dir, entry.name))).toString("base64") } }
  await walk(root); return result
}
const config = JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } })
const components = JSON.stringify({ aliases: { ui: "@/custom/ui" }, tailwind: { css: "src/app.css" } })
const manifest = JSON.stringify({ schemaVersion: 1, registry: { url: "https://registry.invalid", resolvedVersion: "1.0.0-rc.17" }, items: { button: { files: ["ui/button.tsx"] } } })

test("collector hashes actual customized installs, preserves all bytes and emits no source or private absolute paths", async t => {
  const root = await fixture(t, { "package.json": JSON.stringify({ dependencies: { vite: "^8", react: "^19" }, scripts: { postinstall: "touch EXECUTED" } }), "tsconfig.json": config, "components.json": components, ".logic2b/manifest.json": manifest, ".logic2b/base/ui/button.tsx": "export const label='original'", "src/custom/ui/button.tsx": "export const label='customized'", "src/app.css": "@import 'tailwindcss';", ".env": "PRIVATE_ENV_VALUE", "vite.config.ts": "throw new Error('DO_NOT_EXECUTE')", "node_modules/private/index.js": "throw new Error('DO_NOT_READ')" })
  const before = await tree(root)
  const result = await inspectLocalProject({ cwd: root, capabilities: { fileWrites: false, dependencyInstall: false, browser: true } }, "full")
  assert.equal(result.context?.componentAliases.ui, "src/custom/ui")
  assert.equal(result.context?.installed[0].files[0].modified, true)
  assert.equal(result.context?.installed[0].files[0].sha256, createHash("sha256").update("export const label='customized'").digest("hex"))
  assert.ok(!JSON.stringify(result).includes("customized")); assert.ok(!JSON.stringify(result).includes("PRIVATE_ENV_VALUE")); assert.ok(!JSON.stringify(result).includes(root))
  assert.deepEqual(await tree(root), before)
  assert.deepEqual(await inspectLocalProject({ cwd: root, capabilities: { fileWrites: false, dependencyInstall: false, browser: true } }, "full"), result)
})
test("two workspace apps are reported until an explicit app-root is selected", async t => {
  const root = await fixture(t, { "package.json": '{"private":true,"workspaces":["apps/*"]}', "apps/site/package.json": '{"dependencies":{"next":"^16"}}', "apps/site/tsconfig.json": '{"compilerOptions":{"paths":{"@/*":["./*"]}}}', "apps/admin/package.json": '{"dependencies":{"vite":"^8"}}', "apps/admin/tsconfig.json": config })
  const summary = await inspectLocalProject({ cwd: root })
  assert.equal(summary.summary.framework.name, "unknown"); assert.deepEqual(summary.summary.applications, ["apps/admin", "apps/site"])
  const site = await inspectLocalProject({ cwd: root, appRoot: "apps/site" }, "full")
  assert.equal(site.summary.framework.name, "next"); assert.equal(site.context?.sourceRoot, ".")
  assert.equal(site.context?.appRoot, "apps/site")
})
test("collector follows bounded local references and inheritance without touching package-based configs", async t => {
  const root = await fixture(t, { "package.json": '{"dependencies":{"vite":"8"}}', "tsconfig.json": '{"references":[{"path":"./tsconfig.app.json"}]}', "tsconfig.app.json": '{"extends":"./config/tsconfig.base.json"}', "config/tsconfig.base.json": '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["src/*"]}}}' })
  const result = await inspectLocalProject({ cwd: root }, "full")
  assert.equal(result.context?.sourceRoot, "config/src")
})
test("escaped, excluded, duplicate and oversized inputs reject", async t => {
  const root = await fixture(t, { "package.json": "{}", "src/a.ts": "a", ".env": "SECRET" })
  for (const file of ["../outside", "/tmp/outside", ".env", "node_modules/x", ".git/config", "src"]) await assert.rejects(collectProjectSnapshot({ cwd: root, files: [file] }))
  await assert.rejects(collectProjectSnapshot({ cwd: root, appRoot: "../other" }))
  await assert.rejects(collectProjectSnapshot({ cwd: root, files: ["./src/a.ts", "src/a.ts"] }), /Duplicate/)
  await writeFile(join(root, "package.json"), " ".repeat(128 * 1024 + 1))
  await assert.rejects(collectProjectSnapshot({ cwd: root }), /budget/)
})
test("in-root file symlinks work; escaping and excluded symlink targets reject", async t => {
  const root = await fixture(t, { "package.json": "{}", "src/a.ts": "a", ".env": "SECRET" })
  const outside = await fixture(t, { "secret.ts": "PRIVATE_OUTSIDE_VALUE" })
  await symlink(join(root, "src/a.ts"), join(root, "inside.ts"))
  const snapshot = await collectProjectSnapshot({ cwd: root, files: ["inside.ts"] })
  assert.equal(snapshot.files.length, 1)
  await symlink(join(outside, "secret.ts"), join(root, "escape.ts"))
  await assert.rejects(collectProjectSnapshot({ cwd: root, files: ["escape.ts"] }), /outside/)
  await symlink(join(root, ".env"), join(root, "env.ts"))
  await assert.rejects(collectProjectSnapshot({ cwd: root, files: ["env.ts"] }), /excluded/)
  await assert.rejects(collectProjectSnapshot({ cwd: root, files: ["src/a.ts", "inside.ts"] }), /same physical file/)
  await symlink(outside, join(root, "outside-app"))
  await assert.rejects(collectProjectSnapshot({ cwd: root, appRoot: "outside-app" }), /outside/)
})
test("malformed/unknown manifests and missing selected files do not look like an empty successful install", async t => {
  const root = await fixture(t, { "package.json": "{}", ".logic2b/manifest.json": '{"schemaVersion":99,"registry":{},"items":{}}' })
  await assert.rejects(collectProjectSnapshot({ cwd: root }), /schemaVersion/)
  await writeFile(join(root, ".logic2b/manifest.json"), "{")
  await assert.rejects(collectProjectSnapshot({ cwd: root }), /Malformed JSON/)
  await rm(join(root, ".logic2b/manifest.json"))
  await assert.rejects(collectProjectSnapshot({ cwd: root, files: ["missing.ts"] }), /missing/)
})
test("CLI inspect --json returns parseable context with no writes or implicit capability claims", async t => {
  const root = await fixture(t, { "package.json": '{"dependencies":{"astro":"7","react":"19"}}' })
  const before = await tree(root)
  const cli = new URL("../src/index.ts", import.meta.url).pathname
  const result = spawnSync(process.execPath, ["--import", "tsx", cli, "inspect", "--cwd", root, "--json", "--details", "full"], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout)
  assert.equal(output.context.framework.name, "astro"); assert.equal(output.context.capabilities.fileWrites, false)
  assert.match(output.unknowns.join(" "), /capabilities were not supplied/)
  assert.deepEqual(await tree(root), before)
  const invalid = spawnSync(process.execPath, ["--import", "tsx", cli, "inspect", "--cwd", root, "--json", "--details", "everything"], { encoding: "utf8" })
  assert.notEqual(invalid.status, 0); assert.equal(invalid.stdout, "")
})


test("inherited aliases follow TypeScript when child baseUrl overrides the parent's", async t => {
  const root = await fixture(t, { "package.json": "{}", "tsconfig.json": '{"extends":"./config/tsconfig.base.json","compilerOptions":{"baseUrl":"."}}', "config/tsconfig.base.json": '{"compilerOptions":{"baseUrl":"parent-src","paths":{"@/*":["*"],"@ui":["widgets"]}}}', "app.ts": "export {}" })
  const parsed = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: diagnostic => { throw new Error(String(diagnostic.messageText)) } })!
  const context = (await inspectLocalProject({ cwd: root }, "full")).context!
  const expected = Object.fromEntries(Object.entries(parsed.options.paths!).map(([key, targets]) => [key, targets.map(target => relative(root, resolve(parsed.options.baseUrl!, target)))]))
  assert.deepEqual(context.aliases, expected)
  assert.equal(context.sourceRoot, ".")
})


test("a monorepo app's cross-root alias is withheld without reading outside or losing in-root evidence", async t => {
  const root = await fixture(t, { "package.json": '{"dependencies":{"astro":"7"}}', "tsconfig.json": '{"compilerOptions":{"paths":{"@/*":["src/*"],"@shared/*":["../../packages/shared/*"]}}}', "src/page.tsx": "export const title='page'" })
  const context = (await inspectLocalProject({ cwd: root, files: ["src/page.tsx"] }, "full")).context!
  assert.equal(context.sourceRoot, "src")
  assert.equal(context.aliases["@shared/*"], undefined)
  assert.equal(context.selectedFiles.length, 1)
  assert.match(context.unknowns.join(" "), /destination is withheld/)
})


test("workspace discovery and app selection do not follow links into dependency directories", async t => {
  const root = await fixture(t, { "package.json": "{}", "node_modules/private/package.json": '{"dependencies":{"next":"16"}}' })
  await symlink(join(root, "node_modules"), join(root, "apps"))
  await assert.rejects(collectProjectSnapshot({ cwd: root }), /excluded/)
  await assert.rejects(collectProjectSnapshot({ cwd: root, appRoot: "apps/private" }), /excluded/)
})
