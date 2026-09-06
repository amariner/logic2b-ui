/**
 * Reproducible 60–90 second walkthrough of the maintenance loop the beta
 * promises: choose a preset, generate a starter from the versioned registry,
 * customize it locally, detect theme drift and correct it without losing the
 * local work. Runs the same MCP tools against the committed registry fixture
 * and fails when any step stops behaving as documented.
 *
 *   pnpm --filter @logic2b/mcp demo:walkthrough
 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { CLI_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"

import type { FetchLike } from "../src/registry.ts"
import { runTool } from "../src/tools.ts"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const registryDir = join(repoRoot, "apps/web/public/r")
const base = "https://ui.logic2b.com"
const started = Date.now()

const fetchImpl: FetchLike = async (input) => {
  const url = new URL(input)
  const registryPath = decodeURIComponent(url.pathname.slice(3))
  if (
    !url.pathname.startsWith("/r/") ||
    !registryPath.endsWith(".json") ||
    registryPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return { ok: false, status: 404, text: async () => "Not found" }
  }
  try {
    const content = await readFile(join(registryDir, registryPath), "utf8")
    return { ok: true, status: 200, text: async () => content }
  } catch {
    return { ok: false, status: 404, text: async () => "Not found" }
  }
}

function step(title: string) {
  const seconds = ((Date.now() - started) / 1000).toFixed(1).padStart(5)
  console.log(`\n[${seconds}s] ${title}`)
}

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

async function call<T = Record<string, any>>(name: string, args: Record<string, unknown>): Promise<T> {
  const result = await runTool(name, args, { base, fetchImpl })
  if (result.isError) fail(`${name}: ${result.content[0]?.text}`)
  return result.structuredContent as T
}

const root = await mkdtemp(join(tmpdir(), "logic2b-walkthrough-"))
let passed = false
try {
  step("1. Pick a theme in /create: blue accent, xl radius, Tabler icons")
  const preset = encodePreset({ ...DEFAULT_CONFIG, theme: "blue", radius: "xl", iconLibrary: "tabler" })
  console.log(`   preset id ${preset}`)
  console.log(`   equivalent CLI: npx ${CLI_PACKAGE_SELECTOR} init --template vite --starter marketing --preset ${preset}`)

  step("2. Generate the marketing starter from the versioned registry (MCP scaffold_plan)")
  const plan = await call("scaffold_plan", { framework: "vite", starter: "marketing", name: "acme-site", preset })
  console.log(`   resolved registry ${plan.registryVersion} (requested "${plan.requestedVersion}")`)
  console.log(`   ${plan.files.length} files, ${plan.items.length} verified items, icons: ${plan.iconLibrary}`)
  for (const file of plan.files as { path: string; content: string }[]) {
    const target = join(root, file.path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, file.content)
  }
  const components = JSON.parse(await readFile(join(root, "components.json"), "utf8"))
  if (components.logic2b?.version !== plan.registryVersion || components.logic2b?.preset !== preset) {
    fail("components.json does not record the resolved version and preset")
  }
  const manifest = JSON.parse(await readFile(join(root, ".logic2b/manifest.json"), "utf8"))
  console.log(`   components.json pins registry ${components.logic2b.version}; .logic2b/manifest.json records ${Object.keys(manifest.items ?? manifest).length} items with integrity`)

  step("3. Customize locally: brand rule outside the token blocks, a hand-tuned --primary, custom copy")
  const projectFiles = (plan.files as { path: string }[]).filter((file) => !file.path.startsWith(".logic2b/"))
  const themePath = projectFiles.find((file) => file.path.endsWith("theme.css"))?.path
  if (!themePath) fail("scaffold has no theme.css")
  const original = await readFile(join(root, themePath), "utf8")
  const customRule = "\n/* acme brand */\n.acme-hero { letter-spacing: -0.02em; }\n"
  const drifted = original.replace(/--primary: [^;]+;/, "--primary: oklch(0.42 0.2 262.881);") + customRule
  if (drifted === original + customRule) fail("could not hand-tune --primary")
  await writeFile(join(root, themePath), drifted)
  const hero = projectFiles.find((file) => /hero/.test(file.path))?.path
  if (hero) {
    const source = await readFile(join(root, hero), "utf8")
    await writeFile(join(root, hero), `${source}\n// acme: custom copy lives here and is never touched by theme tools\n`)
  }
  console.log(`   edited ${themePath}${hero ? ` and ${hero}` : ""}`)

  step("4. Detect drift against the exact preset (MCP lint_theme)")
  const lint = await call("lint_theme", { css: drifted, preset })
  const drift = lint.issues.filter((issue: { category: string }) => issue.category === "preset")
  console.log(`   valid: ${lint.valid}, clean: ${lint.clean}, preset issues: ${drift.length}`)
  for (const issue of drift.slice(0, 3)) console.log(`   - ${issue.code} ${issue.token ?? ""}: ${issue.message}`)
  if (lint.clean || !drift.some((issue: { token?: string }) => issue.token === "primary")) {
    fail("lint_theme did not report the hand-tuned --primary as preset drift")
  }

  step("5. Correct it without losing the brand rule (MCP apply_preset on the local css)")
  const applied = await call("apply_preset", { preset, css: drifted })
  const corrected: string = applied.file.content
  if (!corrected.includes(".acme-hero")) fail("apply_preset dropped the custom rule outside the token blocks")
  await writeFile(join(root, themePath), corrected)
  const relint = await call("lint_theme", { css: corrected, preset })
  console.log(`   after correction: valid ${relint.valid}, clean ${relint.clean}, issues ${relint.issues.length}`)
  if (!relint.clean) fail("theme still drifts after apply_preset")
  if (hero && !(await readFile(join(root, hero), "utf8")).includes("acme: custom copy")) fail("custom copy was lost")

  step("6. Reproduce it anywhere")
  console.log(`   npx ${CLI_PACKAGE_SELECTOR} init --preset ${preset} --template vite --starter marketing`)
  console.log(`   npx ${CLI_PACKAGE_SELECTOR} add button --registry-version ${plan.registryVersion}`)
  passed = true
  console.log(`\n✓ walkthrough completed in ${((Date.now() - started) / 1000).toFixed(1)}s (registry ${plan.registryVersion}, ${plan.files.length} files, drift detected and corrected, local edits preserved)`)
} finally {
  if (passed) await rm(root, { recursive: true, force: true })
  else console.error(`Walkthrough workspace kept at ${root}`)
}
