import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, test, type TestContext } from "node:test"
import ts from "typescript"
import { collectProjectSnapshot } from "../src/project-collector.ts"
import { inspectProject } from "../src/project-context.ts"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const fixtures = join(packageRoot, "test/fixtures/project-context")
const capabilities = { fileWrites: false, dependencyInstall: false, browser: false }
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex")

async function directory(t: TestContext, fixture?: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "logic2b-project-context-"))
  t.after(async () => rm(root, { recursive: true, force: true }))
  if (fixture) await cp(join(fixtures, fixture), root, { recursive: true })
  return root
}

async function write(root: string, path: string, content: string): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true })
  await writeFile(join(root, path), content)
}

async function fingerprint(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  async function visit(directory: string): Promise<void> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const path = join(directory, entry.name)
      const stat = await lstat(path)
      const metadata = `${stat.mode}:${stat.size}:${stat.mtimeMs}`
      result[relative(root, path)] = `${metadata}:${entry.isFile() ? hash(await readFile(path)) : entry.isSymbolicLink() ? "symlink" : "directory"}`
      if (entry.isDirectory()) await visit(path)
    }
  }
  await visit(root)
  return result
}

async function context(root: string, options: Parameters<typeof collectProjectSnapshot>[1] = { capabilities }) {
  const snapshot = await collectProjectSnapshot(root, options)
  const result = inspectProject(snapshot, { details: true })
  assert.ok(result.context)
  return { snapshot, result: result.context }
}

function boundedCollector(root: string, options: Record<string, unknown> = {}): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    import { collectProjectSnapshot } from './src/project-collector.ts';
    try {
      await collectProjectSnapshot(${JSON.stringify(root)}, ${JSON.stringify({ capabilities, ...options })});
      console.error('unexpected collection success');
      process.exitCode = 2;
    } catch (error) {
      process.stdout.write(String(error?.message ?? error));
    }
  `], { cwd: packageRoot, encoding: "utf8", timeout: 5000 })
}

describe("local project collector", () => {
  test("collects all eight acceptance families without writes and returns deterministic snapshots", async (t) => {
    for (const family of ["next-root", "vite-src", "astro-react", "two-apps", "custom-ui", "shadcn", "unsupported", "partial"]) {
      const root = await directory(t, family)
      const before = await fingerprint(root)
      const first = await collectProjectSnapshot(root, { capabilities })
      const second = await collectProjectSnapshot(root, { capabilities })
      assert.deepEqual(first, second, family)
      assert.deepEqual(await fingerprint(root), before, family)
      assert.equal(first.schemaVersion, 1)
      assert.deepEqual(first.capabilities, capabilities)
      assert.doesNotMatch(JSON.stringify(first), new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    }
  })

  test("hashes explicitly selected sources as inert bytes and collects installed baselines only on demand", async (t) => {
    const root = await directory(t, "next-root")
    const file = "components/ui/button.tsx"
    const baseline = await readFile(join(root, file))
    await write(root, file, `${baseline.toString()}\n// Customer-specific label\n`)
    const compact = await collectProjectSnapshot(root, { capabilities })
    assert.ok(!compact.files || compact.files.length === 0)
    const { snapshot, result } = await context(root, { capabilities, inventory: true })
    const observed = snapshot.files?.find((entry) => entry.path === file)
    assert.ok(observed)
    assert.equal(observed.sha256, hash(await readFile(join(root, file))))
    assert.equal(observed.baselineSha256, hash(baseline))
    assert.equal(result.installed.find((item) => item.name === "button")?.files[0].modified, true)
    assert.equal(snapshot.files?.find((entry) => entry.path.endsWith("missing-widget.tsx"))?.missing, true)
    assert.doesNotMatch(JSON.stringify(snapshot), /Customer-specific label|Save customer/)
    const marker = join(root, "SOURCE_EXECUTED")
    await write(root, "src/malicious.ts", `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "executed")`)
    const selected = await collectProjectSnapshot(root, { capabilities, files: ["src/malicious.ts"] })
    assert.equal(selected.files?.[0].sha256, hash(await readFile(join(root, "src/malicious.ts"))))
    await assert.rejects(() => lstat(marker), /ENOENT/)
  })

  test("hashes the installed theme sibling while preserving a customized native stylesheet entry", async (t) => {
    const root = await directory(t, "shadcn")
    const theme = ":root { --primary: oklch(0.5 0.1 240); }\n"
    await write(root, "src/app/globals.css", "@import 'tailwindcss';\n/* PRIVATE_NATIVE_ENTRY_MARKER */\nbody { margin: 0; }\n")
    await write(root, "src/app/theme.css", theme)
    await write(root, ".logic2b/base/theme.css", theme)
    await write(root, ".logic2b/manifest.json", JSON.stringify({ schemaVersion: 1, registry: { resolvedVersion: "1.0.0-rc.17" }, items: { theme: { files: ["theme.css"] } } }))
    const before = await fingerprint(root)
    const { snapshot, result } = await context(root, { capabilities, inventory: true })
    assert.equal(result.locations.theme, "src/app/globals.css")
    assert.deepEqual(result.stylesheets, ["src/app/globals.css"])
    assert.deepEqual(snapshot.files, [{ path: "src/app/theme.css", sha256: hash(theme), baselineSha256: hash(theme) }])
    assert.deepEqual(result.installed[0].files, [{ path: "src/app/theme.css", sha256: hash(theme), modified: false }])
    assert.equal(result.observedFiles.some((file) => file.path === "src/app/globals.css"), false)
    assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_NATIVE_ENTRY_MARKER/)
    assert.deepEqual(await fingerprint(root), before)
  })

  test("chooses only an explicitly selected monorepo app and uses app-relative paths", async (t) => {
    const root = await directory(t, "two-apps")
    const ambiguous = await context(root)
    assert.equal(ambiguous.result.framework.name, "unknown")
    assert.match(ambiguous.result.unknowns.join(" "), /multiple|ambiguous|application|app.root/i)
    const admin = await context(root, { capabilities, appRoot: "apps/admin" })
    assert.equal(admin.result.framework.name, "next")
    assert.deepEqual(admin.result.aliases["@/*"], ["*"])
    assert.ok(admin.snapshot.configs.some((entry) => entry.path === "package.json"))
    assert.ok(admin.snapshot.configs.every((entry) => !entry.path.startsWith("apps/")))
    const store = await context(root, { capabilities, appRoot: "apps/store" })
    assert.equal(store.result.framework.name, "vite")
    assert.equal(store.result.sourceRoot, "src")
    for (const appRoot of ["../outside", "/etc", "node_modules/react", "apps/admin/../store"]) {
      await assert.rejects(() => collectProjectSnapshot(root, { capabilities, appRoot }), /path|root|safe|forbidden/i)
    }
  })

  test("matches TypeScript's inherited baseUrl and paths origins, including JSONC", async (t) => {
    const root = await directory(t, "tsconfig-inheritance")
    const parsed = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (diagnostic) => assert.fail(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")) })
    assert.ok(parsed)
    const oracle = ts.resolveModuleName("@/design/primitives/button", join(root, "client/app.tsx"), parsed.options, ts.sys).resolvedModule
    assert.ok(oracle)
    const result = (await context(root)).result
    const target = relative(root, oracle.resolvedFileName).replaceAll("\\", "/")
    assert.equal(`${result.locations.ui}/button.tsx`, target)
    assert.deepEqual(result.aliases["@/*"], ["client/*"])
    assert.ok((await context(root)).snapshot.configs.some((entry) => entry.path === "config/base.json"))

    // Without baseUrl, paths are relative to their declaring parent tsconfig.
    await write(root, "config/base.json", JSON.stringify({ compilerOptions: { paths: { "@/*": ["../client/*"] } } }))
    const noBase = (await context(root)).result
    assert.deepEqual(noBase.aliases["@/*"], ["client/*"])
    assert.equal(noBase.locations.ui, "client/design/primitives")

    // A child's baseUrl overrides its parent and is relative to the child.
    await write(root, "config/base.json", JSON.stringify({ compilerOptions: { baseUrl: "..", paths: { "@/*": ["./*"] } } }))
    await write(root, "tsconfig.json", JSON.stringify({ extends: "./config/base.json", compilerOptions: { baseUrl: "./client" } }))
    const overridden = (await context(root)).result
    assert.deepEqual(overridden.aliases["@/*"], ["client/*"])
    assert.equal(overridden.locations.ui, "client/design/primitives")
  })

  test("matches TypeScript's longest-prefix choice for overlapping wildcard import patterns", async (t) => {
    const root = await directory(t, "partial")
    await write(root, "tsconfig.json", JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@*/components/ui": ["./client/general"], "@/components/*": ["./client/special/*"] } } }))
    await write(root, "components.json", JSON.stringify({ aliases: { ui: "@/components/ui" } }))
    await write(root, "client/general/index.ts", "export const marker = 'general'")
    await write(root, "client/special/ui/index.ts", "export const marker = 'specific'")
    const parsed = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (diagnostic) => assert.fail(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")) })
    assert.ok(parsed)
    const oracle = ts.resolveModuleName("@/components/ui", join(root, "client/app.tsx"), parsed.options, ts.sys).resolvedModule
    assert.ok(oracle)
    assert.equal(relative(root, oracle.resolvedFileName).replaceAll("\\", "/"), "client/special/ui/index.ts")
    assert.equal((await context(root)).result.locations.ui, "client/special/ui")
  })

  test("preserves TypeScript's declaration-order ties or exposes the resulting alias ambiguity", async (t) => {
    const root = await directory(t, "partial")
    await write(root, "components.json", JSON.stringify({ aliases: { ui: "@/components/ui" } }))
    await write(root, "client/general/components/ui/index.ts", "export const marker = 'general'")
    await write(root, "client/special/components/index.ts", "export const marker = 'specific'")
    const broad = ["@/*", ["./client/general/*"]] as const
    const suffix = ["@/*/ui", ["./client/special/*"]] as const
    for (const entries of [[broad, suffix], [suffix, broad]]) {
      await write(root, "tsconfig.json", JSON.stringify({ compilerOptions: { baseUrl: ".", paths: Object.fromEntries(entries) } }))
      const parsed = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (diagnostic) => assert.fail(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")) })
      assert.ok(parsed)
      const oracle = ts.resolveModuleName("@/components/ui", join(root, "client/app.tsx"), parsed.options, ts.sys).resolvedModule
      assert.ok(oracle)
      const result = (await context(root)).result
      const expected = relative(root, dirname(oracle.resolvedFileName)).replaceAll("\\", "/")
      if (result.locations.ui !== undefined) assert.equal(result.locations.ui, expected)
      else assert.match(result.unknowns.join(" "), /alias.*ui|ambiguous|ambiguity|unambiguous/i)
    }
  })

  test("resolves local references but exposes package extends and cycles as unknowns", async (t) => {
    const root = await directory(t, "vite-src")
    const referenced = await context(root)
    assert.equal(referenced.result.locations.ui, "src/components/ui")
    assert.ok(referenced.snapshot.configs.some((entry) => entry.path === "tsconfig.app.json"))
    await write(root, "tsconfig.app.json", JSON.stringify({ extends: "@private/config", compilerOptions: {} }))
    const external = await context(root)
    assert.equal(external.result.locations.ui, undefined)
    assert.match(external.result.unknowns.join(" "), /extends|@private\/config/i)
    await write(root, "tsconfig.app.json", JSON.stringify({ extends: "./tsconfig.app.json" }))
    const cyclic = await context(root)
    assert.match(cyclic.result.unknowns.join(" "), /cycle|cyclic|circular/i)
  })

  test("does not confirm destinations when an escaping baseUrl changes path interpretation", async (t) => {
    const root = await directory(t, "vite-src")
    await write(root, "tsconfig.app.json", JSON.stringify({ compilerOptions: { baseUrl: "../outside", paths: { "@/*": ["./src/*"] } } }))
    const result = (await context(root)).result
    assert.equal(result.aliases["@/*"], undefined)
    assert.equal(result.locations.ui, undefined)
    assert.match(result.unknowns.join(" "), /baseUrl|root|escaping/i)
  })

  test("keeps inherited path interpretation unknown when an external config could supply baseUrl", async (t) => {
    const root = await directory(t, "vite-src")
    await write(root, "tsconfig.app.json", JSON.stringify({ extends: "@private/config", compilerOptions: { paths: { "@/*": ["./src/*"] } } }))
    const result = (await context(root)).result
    assert.equal(result.aliases["@/*"], undefined)
    assert.equal(result.locations.ui, undefined)
    assert.match(result.unknowns.join(" "), /extends|inherited|unknown/i)
    await write(root, "tsconfig.app.json", JSON.stringify({ extends: "@private/config", compilerOptions: { baseUrl: ".", paths: { "@/*": ["./src/*"] } } }))
    assert.equal((await context(root)).result.locations.ui, "src/components/ui")
    await write(root, "tsconfig.app.json", JSON.stringify({ extends: "./missing-base.json", compilerOptions: { paths: { "@/*": ["./src/*"] } } }))
    const missing = (await context(root)).result
    assert.equal(missing.aliases["@/*"], undefined)
    assert.equal(missing.locations.ui, undefined)
    assert.match(missing.unknowns.join(" "), /missing|unknown/i)
  })

  test("does not retain earlier inherited aliases across a later unknown extends entry", async (t) => {
    const root = await directory(t, "vite-src")
    await write(root, "config/known.json", JSON.stringify({ compilerOptions: { baseUrl: "..", paths: { "@/*": ["./src/*"] } } }))
    await write(root, "tsconfig.app.json", JSON.stringify({ extends: ["./config/known.json", "@private/config"] }))
    const result = (await context(root)).result
    assert.equal(result.aliases["@/*"], undefined)
    assert.equal(result.locations.ui, undefined)
    assert.match(result.unknowns.join(" "), /extends|inherited|unknown/i)
  })

  test("excludes dependency and secret directories from automatic inventory and rejects explicit forbidden reads", async (t) => {
    const root = await directory(t, "partial")
    await write(root, ".env", "PRIVATE_ENV_MARKER=secret")
    await write(root, "node_modules/evil/package.json", "malformed PRIVATE_DEPENDENCY_MARKER")
    await write(root, ".git/config", "PRIVATE_GIT_MARKER")
    const snapshot = await collectProjectSnapshot(root, { capabilities, inventory: true })
    assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_ENV_MARKER|PRIVATE_DEPENDENCY_MARKER|PRIVATE_GIT_MARKER|node_modules|\.env|\.git/)
    for (const path of [".env", ".env.local", "node_modules/evil/package.json", ".git/config", "../outside", "/etc/passwd"]) {
      await assert.rejects(() => collectProjectSnapshot(root, { capabilities, files: [path] }), /path|safe|forbidden|secret/i)
    }
  })

  test("sanitizes private config fields and never reads or executes framework config source", async (t) => {
    const root = await directory(t, "partial")
    await write(root, "package.json", JSON.stringify({ name: "PRIVATE_PACKAGE_NAME", scripts: { postinstall: "PRIVATE_SCRIPT_MARKER" }, dependencies: { vite: "7.0.0", react: "19.2.0" }, secrets: { token: "PRIVATE_SECRET_MARKER" } }))
    await write(root, "vite.config.ts", "throw new Error('PRIVATE_EXECUTION_MARKER')")
    await write(root, "components.json", JSON.stringify({ $schema: "https://private.example/PRIVATE_URL_MARKER", tailwind: { css: "src/style.css" }, privateToken: "PRIVATE_COMPONENT_MARKER", aliases: { ui: "@/ui" } }))
    const snapshot = await collectProjectSnapshot(root, { capabilities })
    assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_/)
    assert.ok(snapshot.configs.every((entry) => entry.path !== "vite.config.ts"))
  })

  test("rejects malformed JSON, unknown manifests and oversized raw configurations", async (t) => {
    const root = await directory(t, "partial")
    await write(root, "components.json", '{"aliases":')
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities }), /JSON|parse|invalid/i)
    await rm(join(root, "components.json"))
    await write(root, ".logic2b/manifest.json", JSON.stringify({ schemaVersion: 99, registry: {}, items: {} }))
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities }), /schema|version/i)
    await rm(join(root, ".logic2b"), { recursive: true })
    await write(root, "package.json", JSON.stringify({ ignoredSecret: "x".repeat(131073), dependencies: { vite: "7.0.0" } }))
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities }), /byte|size|oversized|limit|131072|128/i)
  })

  test("bounds aggregate raw config reads even if each file is individually below the limit", async (t) => {
    const root = await directory(t, "partial")
    const padding = "x".repeat(50000)
    await write(root, "package.json", JSON.stringify({ ignored: padding, dependencies: { vite: "7.0.0", react: "19.2.0" } }))
    await write(root, "tsconfig.json", JSON.stringify({ ignored: padding, compilerOptions: {} }))
    await write(root, "components.json", JSON.stringify({ ignored: padding, aliases: {} }))
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities }), /byte|size|oversized|aggregate|limit|131072|128/i)
  })

  test("counts existing configurations rather than absent optional probes against the 32-entry limit", async (t) => {
    const root = await directory(t, "partial")
    const references = Array.from({ length: 30 }, (_, index) => ({ path: `./tsconfig.${index}.json` }))
    for (let index = 0; index < references.length; index++) await write(root, `tsconfig.${index}.json`, JSON.stringify({ compilerOptions: {} }))
    await write(root, "tsconfig.json", JSON.stringify({ references }))
    assert.equal((await collectProjectSnapshot(root, { capabilities })).configs.length, 32)
    await write(root, "tsconfig.30.json", JSON.stringify({ compilerOptions: {} }))
    await write(root, "tsconfig.json", JSON.stringify({ references: [...references, { path: "./tsconfig.30.json" }] }))
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities }), /32|config|count|limit/i)
  })

  test("bounds selected source hashes by per-file size, aggregate bytes and total inventory", async (t) => {
    const root = await directory(t, "partial")
    await write(root, "too-large.tsx", "x".repeat(1024 * 1024 + 1))
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities, files: ["too-large.tsx"] }), /file|byte|size|MiB|limit/i)
    const files = Array.from({ length: 5 }, (_, index) => `source${index}.tsx`)
    for (const path of files) await write(root, path, "x".repeat(1024 * 1024))
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities, files }), /total|byte|MiB|limit/i)
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities, files: Array.from({ length: 1001 }, (_, index) => `file${index}.tsx`) }), /1000|inventory|count|limit/i)
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities, files: ["x".repeat(257)] }), /path|256|length|character/i)
  })

  test("rejects escaping configuration, file and app-root symlinks", async (t) => {
    const outside = await directory(t, "partial")
    const root = await directory(t, "partial")
    await symlink(join(outside, "package.json"), join(root, "components.json"))
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities }), /symlink|root|escape|unsafe/i)
    await rm(join(root, "components.json"))
    await symlink(outside, join(root, "linked"), "dir")
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities, files: ["linked/package.json"] }), /symlink|root|escape|unsafe/i)
    await assert.rejects(() => collectProjectSnapshot(root, { capabilities, appRoot: "linked" }), /symlink|root|escape|unsafe/i)
  })

  test("rejects case collisions and duplicate normalized requested files", async (t) => {
    const root = await directory(t, "partial")
    await write(root, "src/Button.tsx", "export const Button = 1")
    for (const files of [["src/Button.tsx", "src/Button.tsx"], ["src/Button.tsx", "src/./Button.tsx"], ["src/Button.tsx", "src/button.tsx"]]) {
      await assert.rejects(() => collectProjectSnapshot(root, { capabilities, files }), /duplicate|collision|path/i)
    }
  })

  test("rejects FIFOs promptly before reading or hashing bytes", async (t) => {
    if (process.platform === "win32") return
    const root = await directory(t, "partial")
    execFileSync("mkfifo", [join(root, "components.json")])
    const config = boundedCollector(root)
    assert.equal(config.error, undefined, String(config.error))
    assert.equal(config.status, 0, String(config.stderr))
    assert.match(String(config.stdout), /regular|special|file|FIFO/i)
    await rm(join(root, "components.json"))
    execFileSync("mkfifo", [join(root, "pipe.tsx")])
    const selected = boundedCollector(root, { files: ["pipe.tsx"] })
    assert.equal(selected.error, undefined, String(selected.error))
    assert.equal(selected.status, 0, String(selected.stderr))
    assert.match(String(selected.stdout), /regular|special|file|FIFO/i)
  })

  test("handles concurrent selected-file replacement without escaping the root or hanging", async (t) => {
    const root = await directory(t, "partial")
    const outside = await directory(t)
    await write(outside, "secret.tsx", "OUTSIDE_SOURCE_MUST_NEVER_BE_HASHED")
    await write(root, "selected.tsx", "inside")
    let done = false
    const swapping = (async () => {
      for (let index = 0; index < 30 && !done; index++) {
        await rm(join(root, "swap.tsx"), { force: true })
        await symlink(join(outside, "secret.tsx"), join(root, "swap.tsx"))
        await rename(join(root, "swap.tsx"), join(root, "selected.tsx"))
        await write(root, "replacement.tsx", "inside")
        await rename(join(root, "replacement.tsx"), join(root, "selected.tsx"))
      }
    })()
    const outsideHash = hash("OUTSIDE_SOURCE_MUST_NEVER_BE_HASHED")
    try {
      for (let index = 0; index < 10; index++) {
        try {
          const snapshot = await collectProjectSnapshot(root, { capabilities, files: ["selected.tsx"] })
          assert.notEqual(snapshot.files?.[0]?.sha256, outsideHash)
        } catch (error) {
          assert.match(String(error), /symlink|unsafe|changed|race|root|ENOENT|ELOOP|escape|regular|special/i)
        }
      }
    } finally {
      done = true
      await swapping
    }
  })
})
