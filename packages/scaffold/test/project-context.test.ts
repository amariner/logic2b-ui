import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, test } from "node:test"
import {
  inspectProject,
  parseProjectConfig,
  PROJECT_LIMITS,
  validateProjectSnapshot,
  type ProjectSnapshotV1,
} from "../src/project-context.ts"

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures/project-context")
const capabilities = { fileWrites: false, dependencyInstall: false, browser: false }
const sha256 = (content: string) => createHash("sha256").update(content).digest("hex")

async function snapshot(name: string, paths = ["package.json", "tsconfig.json", "components.json"]): Promise<ProjectSnapshotV1> {
  const configs: ProjectSnapshotV1["configs"] = []
  for (const path of paths) {
    const kind = path.endsWith("package.json") ? "package" : path.endsWith("components.json") ? "components" : path.endsWith("manifest.json") ? "manifest" : "tsconfig"
    configs.push(parseProjectConfig(path, kind, await readFile(join(fixtures, name, path), "utf8")))
  }
  return { schemaVersion: 1, configs, capabilities }
}

const minimal = (): ProjectSnapshotV1 => ({ schemaVersion: 1, configs: [], capabilities })
const contextOf = (input: unknown) => {
  const result = inspectProject(input, { details: true })
  assert.ok(result.context)
  return result.context
}

describe("project context detection", () => {
  test("confirms Next root aliases, versions and all declared install locations", async () => {
    const result = contextOf(await snapshot("next-root"))
    assert.deepEqual(result.framework, { name: "next", version: "16.0.1" })
    assert.equal(result.reactVersion, "19.2.0")
    assert.equal(result.tailwindVersion, "4.1.0")
    assert.deepEqual(result.aliases["@/*"], ["*"])
    assert.equal(result.sourceRoot, ".")
    assert.deepEqual(result.locations, { components: "components", ui: "components/ui", utils: "lib/utils", hooks: "hooks", lib: "lib", theme: "styles/theme.css" })
    assert.deepEqual(result.stylesheets, ["styles/theme.css"])
    assert.equal(result.iconLibrary, "lucide")
    assert.equal(result.preset, "bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl")
    assert.equal(result.registryVersion, "1.0.0-rc.17")
    assert.deepEqual(result.capabilities, capabilities)
    assert.ok(result.evidence.some((e) => e.source === "tsconfig.json" && e.confidence === "known"))
  })

  test("resolves Vite app references to src without confusing build tooling with framework", async () => {
    const input = await snapshot("vite-src", ["package.json", "tsconfig.json", "tsconfig.app.json", "components.json"])
    const result = contextOf(input)
    assert.equal(result.framework.name, "vite")
    assert.equal(result.framework.version, "^7.0.0")
    assert.equal(result.sourceRoot, "src")
    assert.deepEqual(result.aliases["@/*"], ["src/*"])
    assert.equal(result.locations.ui, "src/components/ui")
    assert.equal(result.iconLibrary, "tabler")
  })

  test("reports Astro React islands and unresolved external tsconfig inheritance explicitly", async () => {
    const result = contextOf(await snapshot("astro-react"))
    assert.equal(result.framework.name, "astro")
    assert.equal(result.reactVersion, "19.1.0")
    assert.equal(result.locations.ui, "src/components/ui")
    assert.match(result.unknowns.join(" "), /extends|astro\/tsconfigs/i)
  })

  test("preserves custom alias patterns and customized destination folders", async () => {
    const result = contextOf(await snapshot("custom-ui"))
    assert.deepEqual(result.aliases["~/*"], ["client/*"])
    assert.deepEqual(result.aliases["@design/*"], ["client/design/*"])
    assert.deepEqual(result.locations, { components: "client/views", ui: "client/design/primitives", utils: "client/support/utils", hooks: "client/state", lib: "client/support", theme: "client/design/tokens.css" })
    assert.equal(result.iconLibrary, "phosphor")
  })

  test("does not turn an unsafe alias alternative into a confirmed single destination", () => {
    const input = minimal()
    input.configs = [
      { path: "tsconfig.json", kind: "tsconfig", data: { compilerOptions: { baseUrl: ".", paths: { "@/*": ["../outside/*", "./src/*"] } } } },
      { path: "components.json", kind: "components", data: { aliases: { ui: "@/components/ui" } } },
    ]
    const result = contextOf(input)
    assert.equal(result.aliases["@/*"], undefined)
    assert.equal(result.locations.ui, undefined)
    assert.match(result.unknowns.join(" "), /alias|escaping|unsupported/i)
  })

  test("accepts existing shadcn config without claiming registry ownership", async () => {
    const result = contextOf(await snapshot("shadcn"))
    assert.equal(result.locations.ui, "src/components/ui")
    assert.deepEqual(result.stylesheets, ["src/app/globals.css"])
    assert.deepEqual(result.installed, [])
    assert.equal(result.preset, undefined)
    assert.equal(result.registryVersion, undefined)
  })

  test("returns unsupported and partially configured projects as unknowns", async () => {
    const unsupported = contextOf(await snapshot("unsupported", ["package.json"]))
    assert.equal(unsupported.framework.name, "unknown")
    assert.match(unsupported.unknowns.join(" "), /framework|svelte|unsupported/i)
    const partial = contextOf(await snapshot("partial", ["package.json"]))
    assert.equal(partial.framework.name, "vite")
    assert.equal(partial.locations.ui, undefined)
    assert.equal(partial.sourceRoot, undefined)
    assert.match(partial.unknowns.join(" "), /tsconfig|components|alias/i)
  })

  test("does not arbitrarily select a framework when multiple application manifests are supplied", async () => {
    const input = await snapshot("two-apps", ["package.json", "apps/admin/package.json", "apps/store/package.json"])
    const result = contextOf(input)
    assert.equal(result.framework.name, "unknown")
    assert.match(result.unknowns.join(" "), /multiple|ambiguous|application|app.root/i)
    assert.equal(result.locations.ui, undefined)
  })

  test("links installed inventory to current/base hashes and distinguishes missing and unknown files", async () => {
    const input = await snapshot("next-root", ["package.json", "tsconfig.json", "components.json", ".logic2b/manifest.json"])
    const original = await readFile(join(fixtures, "next-root/components/ui/button.tsx"), "utf8")
    input.files = [
      { path: "components/ui/button.tsx", sha256: sha256(original + "// local customization\n"), baselineSha256: sha256(original) },
      { path: "components/ui/missing-widget.tsx", missing: true },
      { path: "components/ui/unverified-widget.tsx", sha256: sha256("unverified") },
      { path: "components/ui/native.tsx", sha256: sha256("native") },
    ]
    const result = inspectProject(input, { details: true })
    assert.ok(result.context)
    assert.equal(result.summary.inventory.items, 3)
    assert.equal(result.summary.inventory.recordedFiles, 3)
    assert.equal(result.summary.inventory.modifiedFiles, 1)
    assert.equal(result.summary.inventory.missingFiles, 1)
    assert.equal(result.summary.inventory.unknownFiles, 1)
    const button = result.context.installed.find((item) => item.name === "button")
    assert.ok(button)
    assert.equal(button.files[0].path, "components/ui/button.tsx")
    assert.equal(button.files[0].modified, true)
    assert.equal(button.files[0].sha256, input.files[0].sha256)
    assert.ok(result.context.unknowns.some((entry) => /missing|missing-widget/.test(entry)))
  })

  test("identical hashes are unmodified and an absent baseline does not invent a result", () => {
    const input = minimal()
    input.files = [
      { path: "src/unmodified.tsx", sha256: sha256("same"), baselineSha256: sha256("same") },
      { path: "src/unverified.tsx", sha256: sha256("local") },
    ]
    const result = contextOf(input)
    assert.equal(result.observedFiles.find((file) => file.path === "src/unmodified.tsx")?.modified, false)
    assert.equal(result.observedFiles.find((file) => file.path === "src/unverified.tsx")?.modified, undefined)
  })

  test("produces deterministic compact output and sends full inventory only on request", () => {
    const input = minimal()
    input.files = Array.from({ length: 1000 }, (_, index) => ({ path: `src/components/component-${String(index).padStart(4, "0")}.tsx`, sha256: sha256(`${index}`) }))
    const compact = inspectProject(input)
    const detailed = inspectProject(input, { details: true })
    assert.equal(compact.context, undefined)
    assert.equal(compact.summary.inventory.inspectedFiles, 0)
    assert.ok(detailed.context)
    assert.equal(detailed.context.observedFiles.length, 1000)
    assert.ok(Buffer.byteLength(JSON.stringify(compact)) <= PROJECT_LIMITS.compactBytes)
    assert.ok(Buffer.byteLength(JSON.stringify(detailed)) <= PROJECT_LIMITS.detailBytes)
    assert.ok(Buffer.byteLength(JSON.stringify(compact)) < Buffer.byteLength(JSON.stringify(detailed)) / 4)
    const reordered = { ...input, files: [...input.files].reverse() }
    assert.deepEqual(inspectProject(reordered, { details: true }), detailed)
    assert.deepEqual(inspectProject(input), compact)
    assert.deepEqual(input.files[0], { path: "src/components/component-0000.tsx", sha256: sha256("0") })
  })
})

describe("bounded public project snapshots", () => {
  test("requires the supported schema and explicit host capabilities", () => {
    for (const value of [null, [], { ...minimal(), schemaVersion: 2 }, { schemaVersion: 1, configs: [] }, { ...minimal(), capabilities: { ...capabilities, browser: "yes" } }, Object.create(minimal())]) {
      assert.throws(() => validateProjectSnapshot(value), /schema|capabilit|object|required|property/i)
    }
    assert.throws(() => inspectProject(minimal(), { details: "yes" } as never), /details|boolean/i)
  })

  test("rejects unsafe paths, path limits, duplicate targets and case collisions", () => {
    for (const path of ["../outside.tsx", "/etc/passwd", "C:/private/key", "\\\\server\\share", "src/../../outside", "src/.env", "node_modules/react/index.js", "src\u0000file", "a".repeat(257)]) {
      assert.throws(() => validateProjectSnapshot({ ...minimal(), files: [{ path, sha256: sha256("bytes") }] }), /path|safe|forbidden|limit|length/i, path)
    }
    for (const paths of [["src/button.tsx", "src/button.tsx"], ["src/button.tsx", "src/./button.tsx"], ["src/Button.tsx", "src/button.tsx"]]) {
      assert.throws(() => validateProjectSnapshot({ ...minimal(), files: paths.map((path) => ({ path, sha256: sha256("bytes") })) }), /duplicate|collision|path/i)
    }
    assert.throws(() => validateProjectSnapshot({ ...minimal(), directories: ["../private"] }), /path/i)
    assert.throws(() => validateProjectSnapshot({ ...minimal(), configs: [{ path: "../../package.json", kind: "package", data: {} }] }), /path/i)
  })

  test("bounds inventory, config count and aggregate config data independently", () => {
    assert.throws(() => validateProjectSnapshot({ ...minimal(), files: Array.from({ length: 1001 }, (_, i) => ({ path: `src/f${i}.tsx`, sha256: sha256(`${i}`) })) }), /1000|inventory|count|limit/i)
    assert.throws(() => validateProjectSnapshot({ ...minimal(), directories: Array.from({ length: 1001 }, (_, i) => `src/d${i}`) }), /1000|inventory|count|limit/i)
    assert.throws(() => validateProjectSnapshot({ ...minimal(), configs: Array.from({ length: 33 }, (_, i) => ({ path: `config${i}.json`, kind: "tsconfig", data: {} })) }), /32|config|count|limit/i)
    const data = { compilerOptions: { paths: Object.fromEntries(Array.from({ length: 90 }, (_, i) => [`@alias${i}/*`, [`${"a".repeat(180)}/*`]])) } }
    const config = { path: "tsconfig.json", kind: "tsconfig", data }
    assert.doesNotThrow(() => validateProjectSnapshot({ ...minimal(), configs: [config] }))
    assert.throws(() => validateProjectSnapshot({ ...minimal(), configs: Array.from({ length: 8 }, (_, i) => ({ ...config, path: `tsconfig${i}.json` })) }), /byte|size|oversized|128|131072|limit/i)
  })

  test("rejects malformed digests and contradictory observed-file evidence", () => {
    for (const digest of ["", "a".repeat(63), "z".repeat(64), "A".repeat(64), 2]) {
      assert.throws(() => validateProjectSnapshot({ ...minimal(), files: [{ path: "src/file.tsx", sha256: digest }] }), /sha256|hash|digest/i)
    }
    assert.throws(() => validateProjectSnapshot({ ...minimal(), files: [{ path: "src/file.tsx", missing: true, sha256: sha256("bytes") }] }), /missing|sha256|hash|contradict/i)
  })

  test("rejects malformed JSON and unsupported manifest versions without executing source", () => {
    assert.throws(() => parseProjectConfig("package.json", "package", '{"dependencies":'), /JSON|parse|invalid/i)
    assert.throws(() => parseProjectConfig("package.json", "package", "globalThis.__projectSnapshotExecuted = true"), /JSON|parse|invalid/i)
    assert.equal((globalThis as Record<string, unknown>).__projectSnapshotExecuted, undefined)
    assert.throws(() => inspectProject({ ...minimal(), configs: [{ path: ".logic2b/manifest.json", kind: "manifest", data: { schemaVersion: 2, registry: {}, items: {} } }] }), /version|schema/i)
  })

  test("sanitizes configuration before returning project metadata", () => {
    const input = parseProjectConfig("package.json", "package", JSON.stringify({ name: "private-customer", scripts: { postinstall: "curl secret" }, privateToken: "PRIVATE_CONFIG_MARKER", dependencies: { react: "19.2.0", vite: "7.0.0" } }))
    const output = JSON.stringify(inspectProject({ ...minimal(), configs: [input] }, { details: true }))
    assert.doesNotMatch(JSON.stringify(input), /PRIVATE_CONFIG_MARKER|postinstall|curl secret|private-customer/)
    assert.doesNotMatch(output, /PRIVATE_CONFIG_MARKER|postinstall|curl secret|private-customer/)
  })

  test("treats invalid declared ranges as unknown rather than returning known version metadata", () => {
    for (const invalid of ["^bad", "1.0.0 garbage"]) {
      const input = minimal()
      input.configs = [{ path: "package.json", kind: "package", data: { dependencies: { next: invalid, react: invalid, tailwindcss: invalid } } }]
      const result = contextOf(input)
      assert.equal(result.framework.name, "next")
      assert.equal(result.framework.version, undefined)
      assert.equal(result.reactVersion, undefined)
      assert.equal(result.tailwindVersion, undefined)
      assert.match(result.unknowns.join(" "), /next declared version is unknown/i)
      assert.match(result.unknowns.join(" "), /react declared version is unknown/i)
      assert.match(result.unknowns.join(" "), /tailwindcss declared version is unknown/i)
    }
  })

  test("requires exact installed item and resolved registry versions while preserving requested selectors", () => {
    const manifest = { schemaVersion: 1, registry: { requestedVersion: "next", resolvedVersion: "1.0.0-rc.17" }, items: { button: { version: "1.0.0", files: ["ui/button.tsx"] } } }
    const input = { ...minimal(), configs: [{ path: ".logic2b/manifest.json", kind: "manifest", data: manifest }] }
    assert.doesNotThrow(() => validateProjectSnapshot(input))
    assert.throws(() => validateProjectSnapshot({ ...input, configs: [{ ...input.configs[0], data: { ...manifest, registry: { resolvedVersion: "^1.0.0" } } }] }), /exact|version/i)
    assert.throws(() => validateProjectSnapshot({ ...input, configs: [{ ...input.configs[0], data: { ...manifest, items: { button: { version: "^1.0.0", files: ["ui/button.tsx"] } } } }] }), /exact|version/i)
  })
})
