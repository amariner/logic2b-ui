import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { buildScaffoldPlan } from "../src/scaffold.ts"
import type { FetchLike } from "../src/registry.ts"
import { DEFAULT_CONFIG, ICON_LIBRARIES, encodePreset, type IconLibrary } from "@logic2b/tokens"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const registryDir = join(repoRoot, "apps/web/public/r")

const fetchImpl: FetchLike = async (input) => {
  const url = new URL(input)
  if (url.pathname === "/r/index.json") {
    return {
      ok: true,
      status: 200,
      text: async () => readFile(join(registryDir, "index.json"), "utf8"),
    }
  }
  const match = url.pathname.match(/^\/r\/([a-z0-9-]+)\.json$/)
  if (!match) return { ok: false, status: 404, text: async () => "Not found" }
  try {
    const content = await readFile(join(registryDir, `${match[1]}.json`), "utf8")
    return { ok: true, status: 200, text: async () => content }
  } catch {
    return { ok: false, status: 404, text: async () => "Not found" }
  }
}

const cases = [
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

  for (const entry of cases) {
    const target = join(root, "apps", entry.directory)
    const plan = await buildScaffoldPlan({
      base: "https://ui.logic2b.com",
      framework: entry.framework,
      starter: entry.starter,
      name: entry.name,
      preset: entry.preset,
      fetchImpl,
    })
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
    console.log(`✓ materialized ${entry.directory}: ${entry.framework}/${entry.starter} (${plan.files.length} files)`)
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

  passed = true
  console.log(
    `✓ Vite dashboard budget: ${javascript.length} chunks, ${kib(entry.bytes)} entry, ${kib(largest.bytes)} max`,
  )
  console.log(`✓ all scaffold plans install and build (${root})`)
} finally {
  if (passed) await rm(root, { recursive: true, force: true })
  else console.error(`Scaffold verification kept at ${root}`)
}
