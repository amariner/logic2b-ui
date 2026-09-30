import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { buildScaffoldPlan } from "../src/scaffold.ts"
import type { FetchLike } from "../src/registry.ts"
import { DEFAULT_CONFIG, ICON_LIBRARIES, encodePreset, type IconLibrary } from "@logic2b/tokens"
import { runTool } from "../src/tools.ts"
import { verifyCompositionBrowsers } from "./composition-browser.mts"
import type { CompositionProjectPlan } from "@logic2b/scaffold/compose-project"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const registryDir = join(repoRoot, "apps/web/public/r")

// Serve the committed registry (versions, manifests, content-addressed
// payloads) so plans resolve the default channel exactly like production.
const fetchImpl: FetchLike = async (input) => {
  const url = new URL(input)
  if (!url.pathname.startsWith("/r/")) return { ok: false, status: 404, text: async () => "Not found" }
  const registryPath = decodeURIComponent(url.pathname.slice(3))
  if (
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

const cases = [
  ...(["next", "vite", "astro"] as const).map(framework => ({ directory: `${framework}-composition`, framework, starter: "auth" as const, name: `verify-${framework}-composition`, preset: encodePreset({ ...DEFAULT_CONFIG, iconLibrary: "tabler" }), iconLibrary: "tabler" as const, composition: true })),
  { directory: "next", framework: "next", starter: "marketing", name: "verify-next", preset: undefined, iconLibrary: "lucide" as const },
  { directory: "vite-dashboard", framework: "vite", starter: "dashboard", name: "verify-vite", preset: undefined, iconLibrary: "lucide" as const },
  { directory: "astro", framework: "astro", starter: "auth", name: "verify-astro", preset: undefined, iconLibrary: "lucide" as const },
  ...(["tabler", "phosphor", "hugeicons"] as const).map((iconLibrary: IconLibrary) => ({
    directory: `vite-${iconLibrary}`,
    framework: "vite" as const,
    starter: "marketing" as const,
    name: `verify-${iconLibrary}`,
    preset: encodePreset({ ...DEFAULT_CONFIG, iconLibrary }),
    iconLibrary,
  })),
] as const

const root = await mkdtemp(join(tmpdir(), "logic2b-scaffolds-"))
const compositionsOnly = process.argv.includes("--compositions-only")
const selectedCases = compositionsOnly ? cases.filter(entry => "composition" in entry) : cases
let passed = false

function kib(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

try {
  await writeFile(
    join(root, "pnpm-workspace.yaml"),
    'packages:\n  - "apps/*"\nallowBuilds:\n  esbuild: true\n  sharp: true\n'
  )
  await writeFile(
    join(root, "package.json"),
    JSON.stringify(
      { name: "logic2b-scaffold-verification", private: true, packageManager: "pnpm@11.10.0" },
      null,
      2
    )
  )

  for (const entry of selectedCases) {
    const target = join(root, "apps", entry.directory)
    const composition = "composition" in entry
    const result = composition ? await runTool("compose_plan", { stack: entry.framework, preset: entry.preset, output: "project", requirements: [
      { id: "browse", route: "/customers", task: "browse-customers", roles: ["list"], requiredStates: ["loading", "empty", "no-results", "error", "permission-denied"], actions: ["create", "edit", "retry"] },
      { id: "edit", route: "/customers", task: "edit-customer", roles: ["primary-form"], requiredStates: ["validation-error", "submitting", "error", "unsaved-changes"], actions: ["save", "cancel"] },
      { id: "new", route: "/new", task: "create-customer", roles: ["primary-form"], requiredStates: ["submitting"], actions: ["save"] },
    ] }, { base: "https://ui.logic2b.com", fetchImpl }) : undefined
    if (result?.isError) throw new Error(`Composition failed: ${JSON.stringify(result.content)}`)
    const plan = composition ? result!.structuredContent!.project as CompositionProjectPlan | null : await buildScaffoldPlan({
      base: "https://ui.logic2b.com",
      framework: entry.framework,
      starter: entry.starter,
      name: entry.name,
      preset: entry.preset,
      fetchImpl,
    })
    if (!plan) throw new Error("Grounded customer composition has no source output.")
    for (const path of ["AGENTS.md", "DESIGN.md"]) if (!plan.files.some(file => file.path === path)) throw new Error(`${entry.directory} is missing ${path}.`)
    if (entry.iconLibrary !== "lucide") {
      const generatedManifest = JSON.parse(
        plan.files.find((file) => file.path === "package.json")!.content,
      )
      const source = plan.files
        .filter((file) => /\.[cm]?[jt]sx?$/.test(file.path))
        .map((file) => file.content)
        .join("\n")
      const expectedPackage = ICON_LIBRARIES[entry.iconLibrary].package
      if (plan.iconLibrary !== entry.iconLibrary) {
        throw new Error(`${entry.directory} lost its ${entry.iconLibrary} preset selection.`)
      }
      if (!generatedManifest.dependencies[expectedPackage]) {
        throw new Error(`${entry.directory} package.json is missing ${expectedPackage}.`)
      }
      if (generatedManifest.dependencies["lucide-react"] || source.includes("lucide-react")) {
        throw new Error(`${entry.directory} retained a Lucide dependency or source import.`)
      }
      if (!source.includes(expectedPackage)) {
        throw new Error(`${entry.directory} did not emit a ${expectedPackage} source import.`)
      }
    }
    for (const file of plan.files) {
      const path = join(target, file.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, file.content)
    }
    console.log(`✓ materialized ${entry.directory}: ${entry.framework}/${composition ? "customer-composition" : entry.starter} (${plan.files.length} files)`)
  }

  const install = spawnSync("pnpm", ["install", "--frozen-lockfile=false"], {
    cwd: root,
    stdio: "inherit",
  })
  if (install.status !== 0) throw new Error(`pnpm install failed (${install.status})`)

  const build = spawnSync("pnpm", ["-r", "--workspace-concurrency=1", "run", "build"], {
    cwd: root,
    stdio: "inherit",
  })
  if (build.status !== 0) throw new Error(`starter build failed (${build.status})`)

  if (!compositionsOnly) {
    const viteAssets = join(root, "apps/vite-dashboard/dist/assets")
    const javascript = await Promise.all(
      (await readdir(viteAssets))
        .filter((name) => name.endsWith(".js"))
        .map(async (name) => ({ name, bytes: (await stat(join(viteAssets, name))).size })),
    )
    const entry = javascript.find(({ name }) => /^index-[^.]+\.js$/.test(name))
    const charts = javascript.find(({ name }) => /^charts-[^.]+\.js$/.test(name))
    const largest = javascript.reduce((a, b) => (a.bytes > b.bytes ? a : b))
    if (!entry || !charts) {
      throw new Error("Vite dashboard did not preserve separate entry and charts chunks.")
    }
    if (javascript.length > 4) {
      throw new Error(`Vite dashboard emitted ${javascript.length} JavaScript chunks (budget: 4).`)
    }
    if (entry.bytes > 225 * 1024) {
      throw new Error(`Vite dashboard entry is ${kib(entry.bytes)} (budget: 225 KiB).`)
    }
    if (largest.bytes > 450 * 1024) {
      throw new Error(
        `Vite dashboard chunk ${largest.name} is ${kib(largest.bytes)} (budget: 450 KiB).`,
      )
    }

    console.log(
      `✓ Vite dashboard budget: ${javascript.length} chunks, ${kib(entry.bytes)} entry, ${kib(largest.bytes)} max`,
    )
  }
  if (process.argv.includes("--browser")) {
    const evidence = process.env.LOGIC2B_COMPOSITION_EVIDENCE_DIR ? resolve(process.env.LOGIC2B_COMPOSITION_EVIDENCE_DIR) : join(await mkdtemp(join(tmpdir(), "logic2b-composition-evidence-")), "evidence")
    await verifyCompositionBrowsers(root, evidence)
  }
  passed = true
  console.log(`✓ all scaffold and customer composition plans install and build (${root})`)
} finally {
  if (passed) await rm(root, { recursive: true, force: true })
  else console.error(`Scaffold verification kept at ${root}`)
}
