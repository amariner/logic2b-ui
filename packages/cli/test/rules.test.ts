import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { chmod, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test, type TestContext } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"
import { RULE_FILE_PATHS } from "@logic2b/scaffold/rules"
import { addComponents, DEFAULT_ALIASES, indexUrl, itemUrl, updateComponents, type FetchLike } from "../src/lib.ts"
import { applyAgentRulesRefresh, prepareAgentRulesRefresh, refreshAgentRules } from "../src/rules.ts"

const execute = promisify(execFile)
const tsxLoader = createRequire(import.meta.url).resolve("tsx")
const cli = fileURLToPath(new URL("../src/index.ts", import.meta.url))
const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const base = "https://rules-registry.test"

async function fixture(context: TestContext, files: Record<string, string> = {}): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-cli-rules-"))
  context.after(() => rm(cwd, { recursive: true, force: true }))
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true })
    await writeFile(join(cwd, path), content)
  }
  return cwd
}

function appFiles(extraConfig: Record<string, unknown> = {}): Record<string, string> {
  return {
    "package.json": JSON.stringify({ name: "private-consumer", dependencies: { react: "19.2.7" }, devDependencies: { vite: "8.2.2", tailwindcss: "4.3.2" }, scripts: { postinstall: "echo SHOULD_NOT_EXECUTE > install-executed" } }),
    "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } } }),
    "components.json": JSON.stringify({ aliases: DEFAULT_ALIASES, tailwind: { css: "src/styles/globals.css" }, iconLibrary: "lucide", logic2b: { registry: base }, ...extraConfig }),
    "src/styles/globals.css": "@import 'tailwindcss';\n",
  }
}

async function tree(cwd: string, prefix = ""): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const entry of await readdir(join(cwd, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) Object.assign(result, await tree(cwd, path))
    else if (entry.isFile()) result[path] = createHash("sha256").update(await readFile(join(cwd, path))).digest("hex")
  }
  return result
}

async function command(cwd: string, args: string[], preload?: string) {
  return execute(process.execPath, ["--import", tsxLoader, ...(preload ? ["--import", preload] : []), cli, ...args, "--cwd", cwd], { cwd: packageRoot, timeout: 60_000, maxBuffer: 256 * 1024 })
}

function source(name: string, content: string) {
  return { name, type: "registry:ui", description: name, files: [{ path: `ui/${name}.tsx`, type: "registry:ui", content }] }
}
function fetchRegistry(items: Record<string, ReturnType<typeof source>>, fetched?: string[]): FetchLike {
  return async (url) => {
    fetched?.push(url)
    const payload = url === indexUrl(base) ? Object.values(items) : Object.entries(items).find(([name]) => itemUrl(base, name) === url)?.[1]
    return payload === undefined ? { ok: false, status: 404, text: async () => "not found" } : { ok: true, status: 200, text: async () => JSON.stringify(payload) }
  }
}

async function initRegistry(context: TestContext): Promise<{ registry: string; preload: string }> {
  const items = [
    { name: "utils", type: "registry:lib", description: "Class helper", files: [{ path: "lib/utils.ts", type: "registry:lib", content: "export const cn = (...values: string[]) => values.join(' ')\n" }] },
    { name: "theme", type: "registry:style", description: "Theme", files: [{ path: "theme.css", type: "registry:style", content: "@import 'tailwindcss';\n:root { --primary: oklch(0.6 0.2 250); }\n.dark { --primary: oklch(0.7 0.2 250); }\n" }] },
  ]
  const routes: Record<string, string> = {
    "/r/versions.json": JSON.stringify({ schemaVersion: 1, channels: { next: "1.0.0" }, versions: [{ version: "1.0.0", manifest: "/r/versions/1.0.0.json" }] }),
  }
  const manifestItems = items.map((item) => {
    const payload = JSON.stringify(item)
    const digest = createHash("sha256").update(payload).digest()
    const content = `/r/content/${digest.toString("hex")}.json`
    routes[content] = payload
    return { name: item.name, type: item.type, description: item.description, version: "1.0.0", integrity: `sha256-${digest.toString("base64")}`, content }
  })
  routes["/r/versions/1.0.0.json"] = JSON.stringify({ schemaVersion: 1, version: "1.0.0", items: manifestItems })
  const mocks = await fixture(context, {
    "registry.mjs": `const routes = ${JSON.stringify(routes)};\nglobalThis.fetch = async (input) => {\n  const url = new URL(input);\n  if (url.origin !== ${JSON.stringify(base)}) throw new Error('Unexpected registry origin');\n  const payload = routes[url.pathname];\n  return new Response(payload ?? 'not found', { status: payload === undefined ? 404 : 200 });\n};\n`,
  })
  return { registry: base, preload: join(mocks, "registry.mjs") }
}

test("rules command appends once, preserves user instructions and performs no install", async (context) => {
  const ownInstructions = "# Our project\r\nUse the existing native controls.\r\n"
  const cwd = await fixture(context, { ...appFiles(), "AGENTS.md": ownInstructions, "DESIGN.md": "# Product design\nKeep our custom typography.\n" })
  const first = await command(cwd, ["rules"])
  const agents = await readFile(join(cwd, "AGENTS.md"), "utf8")
  assert.ok(agents.startsWith(ownInstructions))
  assert.equal((agents.match(/logic2b:rules:start/g) ?? []).length, 1)
  assert.match(agents, /logic2b inspect --json/)
  assert.match(agents, /Static review\/proposal tools are not assumed available/)
  assert.doesNotMatch(agents, /Run.*`review_ui`|advertised `compose_plan`|advertised `proposal_link`/)
  assert.match(first.stdout, /AGENTS\.md: appended/)
  const before = await tree(cwd)
  const second = await command(cwd, ["rules"])
  assert.match(second.stdout, /already current/)
  assert.deepEqual(await tree(cwd), before)
  assert.equal(Object.keys(before).some((path) => /lock|install-executed|node_modules/.test(path)), false)
})

test("rules editor formats preserve existing files and auto-refresh their managed blocks", async (context) => {
  context.mock.method(console, "log", () => {})
  const cwd = await fixture(context, { ...appFiles(), "CLAUDE.md": "# Claude project context\n" })
  await refreshAgentRules(cwd, { force: true, formats: ["agents", "claude", "cursor", "copilot"] })
  const prefix = "User instructions before our block.\r\n"
  const suffix = "\r\nUser instructions after our block.\r\n"
  for (const path of [RULE_FILE_PATHS.agents, RULE_FILE_PATHS.design, RULE_FILE_PATHS.cursor, RULE_FILE_PATHS.copilot]) {
    const content = await readFile(join(cwd, path), "utf8")
    await writeFile(join(cwd, path), `${prefix}${content}${suffix}`)
  }
  const fetchImpl = fetchRegistry({ button: source("button", "export const Button = 'registry'\n") })
  await addComponents(["button"], { cwd, registry: base, fetchImpl, install: false })
  for (const path of [RULE_FILE_PATHS.agents, RULE_FILE_PATHS.design, RULE_FILE_PATHS.cursor, RULE_FILE_PATHS.copilot]) {
    const content = await readFile(join(cwd, path), "utf8")
    assert.ok(content.startsWith(prefix), path)
    assert.ok(content.endsWith(suffix), path)
    if (path !== RULE_FILE_PATHS.design) assert.match(content, /Components: `button`/)
  }
  const claude = await readFile(join(cwd, "CLAUDE.md"), "utf8")
  assert.ok(claude.startsWith("# Claude project context\n"))
  assert.equal((claude.match(/@AGENTS\.md/g) ?? []).length, 1)
})

test("rules supports comma lists and repeated formats, rejecting empty or duplicate selections before writes", async (context) => {
  const cwd = await fixture(context, appFiles())
  const before = await tree(cwd)
  for (const args of [["--format", "claude,,cursor"], ["--format", "claude", "--format", "claude"]]) {
    await assert.rejects(() => command(cwd, ["rules", ...args]), (error: unknown) => {
      assert.match((error as { stderr: string }).stderr, /format|duplicate/i)
      return true
    })
    assert.deepEqual(await tree(cwd), before)
  }
  await command(cwd, ["rules", "--format", " claude, cursor ", "--format", "copilot"])
  for (const path of Object.values(RULE_FILE_PATHS)) assert.ok((await readFile(join(cwd, path), "utf8")).length > 0, path)
})

test("add and update refresh recorded inventory while preserving source and outside marker bytes", async (context) => {
  context.mock.method(console, "log", () => {})
  const cwd = await fixture(context, appFiles())
  const original = "export const Button = 'registry'\n"
  await addComponents(["button"], { cwd, registry: base, fetchImpl: fetchRegistry({ button: source("button", original) }), install: false })
  const prefix = "# Application policy\nKeep our local button copy.\n\n"
  const suffix = "\n# Application notes\nOwned by this app.\n"
  await writeFile(join(cwd, "AGENTS.md"), `${prefix}${await readFile(join(cwd, "AGENTS.md"), "utf8")}${suffix}`)
  await chmod(join(cwd, "AGENTS.md"), 0o600)
  await writeFile(join(cwd, "src/components/ui/button.tsx"), "export const Button = 'our custom copy'\n")
  await addComponents(["card"], { cwd, registry: base, fetchImpl: fetchRegistry({ card: source("card", "export const Card = 'card'\n") }), install: false })
  await updateComponents(["button"], { cwd, registry: base, fetchImpl: fetchRegistry({ button: source("button", original) }), install: false })
  const agents = await readFile(join(cwd, "AGENTS.md"), "utf8")
  assert.ok(agents.startsWith(prefix))
  assert.ok(agents.endsWith(suffix))
  assert.match(agents, /Components: `button` · `card`/)
  assert.equal((agents.match(/logic2b:rules:start/g) ?? []).length, 1)
  assert.equal(await readFile(join(cwd, "src/components/ui/button.tsx"), "utf8"), "export const Button = 'our custom copy'\n")
  assert.equal((await stat(join(cwd, "AGENTS.md"))).mode & 0o777, 0o600)
})

test("automatic opt-out persists on add and manual rules generation does not re-enable it", async (context) => {
  context.mock.method(console, "log", () => {})
  const cwd = await fixture(context, { "package.json": appFiles()["package.json"] })
  const fetchImpl = fetchRegistry({ button: source("button", "export const Button = 1\n"), card: source("card", "export const Card = 2\n") })
  await addComponents(["button"], { cwd, registry: base, fetchImpl, install: false, agentRules: false })
  assert.equal(JSON.parse(await readFile(join(cwd, "components.json"), "utf8")).logic2b.agentRules, false)
  await assert.rejects(() => readFile(join(cwd, "AGENTS.md")))
  await assert.rejects(() => readFile(join(cwd, "DESIGN.md")))
  await command(cwd, ["rules"])
  const ownRules = await readFile(join(cwd, "AGENTS.md"), "utf8")
  await addComponents(["card"], { cwd, registry: base, fetchImpl, install: false, agentRules: true })
  await updateComponents(["button"], { cwd, registry: base, fetchImpl, install: false })
  assert.equal(await readFile(join(cwd, "AGENTS.md"), "utf8"), ownRules)
  assert.equal(JSON.parse(await readFile(join(cwd, "components.json"), "utf8")).logic2b.agentRules, false)
})

test("opt-out preserves all other config fields and existing user documents", async (context) => {
  context.mock.method(console, "log", () => {})
  const cfg = { aliases: { ...DEFAULT_ALIASES, ui: "@/my-ui" }, logic2b: { registry: base, privateSetting: "keep" }, customOwner: { name: "our team" } }
  const cwd = await fixture(context, { ...appFiles(cfg), "AGENTS.md": "# Our own rules\n", "DESIGN.md": "# Our own design\n" })
  await addComponents(["button"], { cwd, registry: base, fetchImpl: fetchRegistry({ button: source("button", "export const Button = 1\n") }), install: false, agentRules: false })
  const saved = JSON.parse(await readFile(join(cwd, "components.json"), "utf8"))
  assert.deepEqual(saved.aliases, cfg.aliases)
  assert.deepEqual(saved.customOwner, cfg.customOwner)
  assert.equal(saved.logic2b.privateSetting, "keep")
  assert.equal(saved.logic2b.agentRules, false)
  assert.equal(await readFile(join(cwd, "AGENTS.md"), "utf8"), "# Our own rules\n")
  assert.equal(await readFile(join(cwd, "DESIGN.md"), "utf8"), "# Our own design\n")
})

test("stale existing and missing preconditions reject the full batch before any mutation", async (context) => {
  const cwd = await fixture(context, { ...appFiles(), "AGENTS.md": "# User rules\n" })
  const planned = await prepareAgentRulesRefresh(cwd)
  await writeFile(join(cwd, "DESIGN.md"), "# Design appeared after planning\n")
  const before = await tree(cwd)
  await assert.rejects(() => applyAgentRulesRefresh(planned), /appeared|changed|planning/i)
  assert.deepEqual(await tree(cwd), before)
  const second = await prepareAgentRulesRefresh(cwd)
  await writeFile(join(cwd, "AGENTS.md"), "# Agent instructions changed after planning\n")
  const changed = await tree(cwd)
  await assert.rejects(() => applyAgentRulesRefresh(second), /changed|planning/i)
  assert.deepEqual(await tree(cwd), changed)
})

test("malformed and unknown markers abort add before components or manifest are written", async (context) => {
  context.mock.method(console, "log", () => {})
  for (const content of ["# User policy\n<!-- logic2b:rules:start v1 preset=unknown registry=unknown -->\nMissing end", "<!-- logic2b:rules:start v2 preset=unknown registry=unknown -->\nOld rules\n<!-- logic2b:rules:end -->\n"]) {
    const cwd = await fixture(context, { ...appFiles(), "AGENTS.md": content })
    const before = await tree(cwd)
    await assert.rejects(() => addComponents(["button"], { cwd, registry: base, fetchImpl: fetchRegistry({ button: source("button", "export const Button = 1\n") }), install: false }), /marker|version/i)
    assert.deepEqual(await tree(cwd), before)
  }
})

test("managed targets, editor ancestors and preference files cannot use symlinks", async (context) => {
  const outside = await fixture(context, { "AGENTS.md": "PRIVATE EXTERNAL POLICY\n", "components.json": "{}", "rules/logic2b.mdc": "PRIVATE EXTERNAL RULES\n" })
  const externalBefore = await tree(outside)
  const cwd = await fixture(context, appFiles())
  await symlink(join(outside, "AGENTS.md"), join(cwd, "AGENTS.md"))
  await assert.rejects(() => prepareAgentRulesRefresh(cwd), /symlink/i)
  await rm(join(cwd, "AGENTS.md"))
  await symlink(outside, join(cwd, ".cursor"), "dir")
  await assert.rejects(() => prepareAgentRulesRefresh(cwd, { formats: ["cursor"] }), /symlink/i)
  // An unrelated, unselected editor directory is never a managed output.
  await prepareAgentRulesRefresh(cwd, { formats: ["copilot"] })
  await rm(join(cwd, "components.json"))
  await symlink(join(outside, "components.json"), join(cwd, "components.json"))
  const fetched: string[] = []
  await assert.rejects(() => addComponents(["button"], { cwd, registry: base, fetchImpl: fetchRegistry({ button: source("button", "export const Button = 1\n") }, fetched), install: false, agentRules: false }), /symlink/i)
  assert.deepEqual(fetched, [])
  assert.deepEqual(await tree(outside), externalBefore)
})

test("a replaced project root is rejected without touching its replacement", async (context) => {
  const cwd = await fixture(context, appFiles())
  const outside = await fixture(context, { "AGENTS.md": "External instructions\n" })
  const prepared = await prepareAgentRulesRefresh(cwd)
  const moved = `${cwd}-moved`
  context.after(() => rm(moved, { recursive: true, force: true }))
  await rename(cwd, moved)
  await symlink(outside, cwd, "dir")
  const before = await tree(outside)
  await assert.rejects(() => applyAgentRulesRefresh(prepared), /root changed|symlink/i)
  assert.deepEqual(await tree(outside), before)
})

test("rules rejects oversize inputs, nonregular targets and unknown formats without writes", async (context) => {
  for (const files of [{ "AGENTS.md": "x".repeat(64 * 1024 + 1) }, { "components.json": JSON.stringify({ name: "x".repeat(128 * 1024) }) }]) {
    const cwd = await fixture(context, { ...appFiles(), ...files })
    const before = await tree(cwd)
    await assert.rejects(() => command(cwd, ["rules"]), /exceeds|budget|bytes/i)
    assert.deepEqual(await tree(cwd), before)
  }
  const cwd = await fixture(context, appFiles())
  const before = await tree(cwd)
  await assert.rejects(() => command(cwd, ["rules", "--format", "not-a-format"]), /format/i)
  assert.deepEqual(await tree(cwd), before)
  await mkdir(join(cwd, "AGENTS.md"))
  await assert.rejects(() => prepareAgentRulesRefresh(cwd), /regular/i)
  await assert.rejects(() => readFile(join(cwd, "DESIGN.md")))
})

test("Node-only startup provides WebCrypto when the global is absent, including current-file hashes", async (context) => {
  const cwd = await fixture(context, { ...appFiles(), "AGENTS.md": "# Existing policy\n" })
  await command(cwd, ["rules"], `data:text/javascript,${encodeURIComponent("delete globalThis.crypto;")}`)
  const agents = await readFile(join(cwd, "AGENTS.md"), "utf8")
  assert.ok(agents.startsWith("# Existing policy\n"))
  assert.match(agents, /logic2b:rules:start v1/)
})

test("normal init creates rules and design from confirmed configured stylesheet and selected preset", async (context) => {
  const { registry, preload } = await initRegistry(context)
  const preset = encodePreset({ ...DEFAULT_CONFIG, iconLibrary: "tabler" })
  const custom = { aliases: { ...DEFAULT_ALIASES, ui: "@/custom/ui" }, tailwind: { css: "src/custom/style/global.css" }, logic2b: { registry, privateSetting: "keep" } }
  const cwd = await fixture(context, { ...appFiles(custom), "src/custom/style/global.css": "/* consumer styles */\n", "AGENTS.md": "# Consumer policy\n" })
  await command(cwd, ["init", "--registry", registry, "--registry-version", "1.0.0", "--preset", preset, "--no-install"], preload)
  const cfg = JSON.parse(await readFile(join(cwd, "components.json"), "utf8"))
  assert.equal(cfg.logic2b.preset, preset)
  assert.equal(cfg.logic2b.privateSetting, "keep")
  assert.equal(cfg.iconLibrary, "tabler")
  assert.deepEqual(cfg.aliases, custom.aliases)
  assert.equal(cfg.tailwind.css, custom.tailwind.css)
  const agents = await readFile(join(cwd, "AGENTS.md"), "utf8")
  assert.ok(agents.startsWith("# Consumer policy\n"))
  assert.match(agents, /@tabler\/icons-react/)
  assert.ok(agents.includes(`preset=${preset}`))
  assert.match(agents, /Other: `theme` · `utils`/)
  assert.ok((await readFile(join(cwd, "DESIGN.md"), "utf8")).includes(preset))
  assert.equal(await readFile(join(cwd, "src/custom/style/global.css"), "utf8"), "/* consumer styles */\n")
  assert.match(await readFile(join(cwd, "src/custom/style/theme.css"), "utf8"), /--primary/)
  assert.equal(Object.keys(await tree(cwd)).some((path) => /install-executed|lock\.json|node_modules/.test(path)), false)
})

test("normal init persists opt-out and rejects malformed owned markers before creating configuration", async (context) => {
  const { registry, preload } = await initRegistry(context)
  const files = appFiles()
  delete files["components.json"]
  const cwd = await fixture(context, { ...files, "AGENTS.md": "# Consumer instructions only\n" })
  await command(cwd, ["init", "--registry", registry, "--registry-version", "1.0.0", "--no-install", "--no-agent-rules"], preload)
  assert.equal(JSON.parse(await readFile(join(cwd, "components.json"), "utf8")).logic2b.agentRules, false)
  assert.equal(await readFile(join(cwd, "AGENTS.md"), "utf8"), "# Consumer instructions only\n")
  await assert.rejects(() => readFile(join(cwd, "DESIGN.md")))
  const malformed = await fixture(context, { ...files, "AGENTS.md": "<!-- logic2b:rules:start v1 preset=unknown registry=unknown -->" })
  const before = await tree(malformed)
  await assert.rejects(() => command(malformed, ["init", "--registry", registry, "--registry-version", "1.0.0", "--no-install"], preload), /marker/i)
  assert.deepEqual(await tree(malformed), before)
})
