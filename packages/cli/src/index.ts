#!/usr/bin/env node
import { Command } from "commander"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

const DEFAULT_REGISTRY = "https://ui.logic2b.com"
const FETCH_TIMEOUT_MS = 15_000

interface RegistryFile {
  path: string
  type: string
  content: string
}

interface RegistryItem {
  name: string
  type: string
  title?: string
  description: string
  dependencies?: string[]
  registryDependencies?: string[]
  files?: RegistryFile[]
  docs?: string
}

interface Aliases {
  components: string
  ui: string
  utils: string
  hooks: string
  lib: string
}

interface Config {
  registry: string
  srcDir: string
  cssPath: string
  aliases: Aliases
}

const DEFAULT_ALIASES: Aliases = {
  components: "@/components",
  ui: "@/components/ui",
  utils: "@/lib/utils",
  hooks: "@/hooks",
  lib: "@/lib",
}

/** Best guess at where the project's Tailwind entry stylesheet lives. */
function detectCssPath(cwd: string, srcDir: string): string {
  const candidates = [
    "src/styles/globals.css",
    "src/styles/global.css",
    "src/app/globals.css",
    "app/globals.css",
    "src/index.css",
    "styles/globals.css",
    "src/styles/tailwind.css",
  ]
  for (const c of candidates) {
    if (existsSync(join(cwd, c))) return c
  }
  return srcDir === "src" ? "src/styles/globals.css" : "styles/globals.css"
}

function looksLikeConfig(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null
}

async function loadConfig(cwd: string, registryOverride?: string): Promise<Config> {
  const configPath = join(cwd, "components.json")
  const srcDir = existsSync(join(cwd, "src")) ? "src" : "."

  let registry = registryOverride ?? DEFAULT_REGISTRY
  let aliases = { ...DEFAULT_ALIASES }
  let cssPath = detectCssPath(cwd, srcDir)

  if (existsSync(configPath)) {
    let raw: unknown
    try {
      raw = JSON.parse(await readFile(configPath, "utf8"))
    } catch (err) {
      throw new Error(
        `components.json is not valid JSON (${err instanceof Error ? err.message : err}). Fix it or delete it and re-run "logic2b init".`
      )
    }
    if (!looksLikeConfig(raw)) {
      throw new Error("components.json must be a JSON object.")
    }
    const cfg = raw as Record<string, any>
    if (!registryOverride) registry = cfg.logic2b?.registry ?? registry
    aliases = { ...aliases, ...(cfg.aliases ?? {}) }
    cssPath = cfg.tailwind?.css ?? cssPath
  }

  return { registry, srcDir, cssPath, aliases }
}

/** Turn an import alias ("@/components/ui") into an absolute filesystem dir.
 *  "@" is the srcDir root, matching the "@/*" tsconfig path convention. */
function aliasToDir(cwd: string, srcDir: string, alias: string): string {
  const rel = alias.replace(/^@\//, "").replace(/^~\//, "")
  return srcDir === "." ? join(cwd, rel) : join(cwd, srcDir, rel)
}

function validateItem(name: string, data: unknown): RegistryItem {
  if (!looksLikeConfig(data)) {
    throw new Error(`Registry item "${name}" is malformed (expected an object).`)
  }
  const item = data as Record<string, unknown>
  if (typeof item.name !== "string" || typeof item.type !== "string") {
    throw new Error(`Registry item "${name}" is missing "name"/"type".`)
  }
  if (item.files !== undefined && !Array.isArray(item.files)) {
    throw new Error(`Registry item "${name}" has a malformed "files" array.`)
  }
  return item as unknown as RegistryItem
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timed out after ${FETCH_TIMEOUT_MS / 1000}s fetching ${url}`)
    }
    throw new Error(`Network error fetching ${url}: ${err instanceof Error ? err.message : err}`)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    throw new Error(`Request failed: ${url} (HTTP ${res.status})`)
  }
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `Expected JSON from ${url} but got something else (is the registry URL correct?).`
    )
  }
}

async function fetchItem(registry: string, name: string): Promise<RegistryItem> {
  const url = `${registry.replace(/\/$/, "")}/r/${name}.json`
  try {
    return validateItem(name, await fetchJson(url))
  } catch (err) {
    if (err instanceof Error && err.message.includes("HTTP 404")) {
      throw new Error(`Component "${name}" not found in the registry (${url}).`)
    }
    throw err
  }
}

function targetPath(config: Config, cwd: string, file: RegistryFile): string {
  const { srcDir, aliases } = config
  // Registry file paths: "ui/button.tsx", "blocks/login-01/x.tsx",
  // "hooks/use-mobile.ts", "lib/utils.ts", "theme.css".
  if (file.path.startsWith("ui/")) {
    return join(aliasToDir(cwd, srcDir, aliases.ui), file.path.slice(3))
  }
  if (file.path.startsWith("blocks/")) {
    return join(aliasToDir(cwd, srcDir, aliases.components), file.path.slice(7))
  }
  if (file.path.startsWith("hooks/")) {
    return join(aliasToDir(cwd, srcDir, aliases.hooks), file.path.slice(6))
  }
  if (file.path === "lib/utils.ts") {
    return `${aliasToDir(cwd, srcDir, aliases.utils)}.ts`
  }
  if (file.path.startsWith("lib/")) {
    return join(aliasToDir(cwd, srcDir, aliases.lib), file.path.slice(4))
  }
  if (file.path.endsWith(".css")) {
    // Theme stylesheet — sits next to the project's configured Tailwind entry.
    return join(cwd, dirname(config.cssPath), file.path)
  }
  return join(cwd, srcDir, file.path)
}

async function resolveGraph(
  registry: string,
  names: string[]
): Promise<Map<string, RegistryItem>> {
  const resolved = new Map<string, RegistryItem>()
  const queue = [...names]
  while (queue.length > 0) {
    const name = queue.shift()!
    if (resolved.has(name)) continue
    const item = await fetchItem(registry, name)
    resolved.set(name, item)
    queue.push(...(item.registryDependencies ?? []))
  }
  return resolved
}

async function addComponents(
  names: string[],
  opts: { registry?: string; cwd?: string; overwrite?: boolean }
) {
  const cwd = resolve(opts.cwd ?? process.cwd())
  const config = await loadConfig(cwd, opts.registry)

  const resolved = await resolveGraph(config.registry, names)

  const npmDeps = new Set<string>()
  let written = 0
  let skipped = 0

  for (const item of resolved.values()) {
    for (const dep of item.dependencies ?? []) npmDeps.add(dep)
    for (const file of item.files ?? []) {
      const target = targetPath(config, cwd, file)
      if (existsSync(target) && !opts.overwrite) {
        console.log(`  skip  ${target} (exists — use --overwrite)`)
        skipped++
        continue
      }
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, file.content)
      console.log(`  write ${target}`)
      written++
    }
  }

  console.log(`\n✓ ${written} file(s) written, ${skipped} skipped.`)
  if (npmDeps.size > 0) {
    console.log(`\nInstall the required dependencies:\n`)
    console.log(`  npm install ${[...npmDeps].join(" ")}\n`)
  }
  return resolved
}

const program = new Command()

program
  .name("logic2b")
  .description("Add logic2b ui components to your project.")
  .version("0.2.0")

program
  .command("init")
  .description("Create components.json, install cn(), and write the logic2b theme.")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())
    const srcDir = existsSync(join(cwd, "src")) ? "src" : "."
    const cssPath = detectCssPath(cwd, srcDir)
    const configPath = join(cwd, "components.json")

    if (!existsSync(configPath)) {
      await writeFile(
        configPath,
        JSON.stringify(
          {
            $schema: "https://ui.logic2b.com/schema.json",
            style: "default",
            tailwind: { css: cssPath, baseColor: "neutral", cssVariables: true },
            aliases: DEFAULT_ALIASES,
            logic2b: { registry: opts.registry },
          },
          null,
          2
        )
      )
      console.log(`✓ created ${configPath} (css: ${cssPath})`)
    } else {
      console.log(`components.json already exists, leaving it untouched.`)
    }

    // Install cn() and the design system so components look like logic2b.
    await addComponents(["utils", "theme"], { registry: opts.registry, cwd })

    const themeTarget = join(dirname(cssPath), "theme.css")
    console.log(
      `\nDesign system installed → ${themeTarget}\n` +
        `  • Fresh project: make ${themeTarget} your app's stylesheet entry.\n` +
        `  • Existing globals.css: it already @imports tailwindcss, so either\n` +
        `    replace your entry with theme.css or copy its :root/.dark tokens over.\n` +
        `  • Dark mode is class-based — toggle ".dark" on <html>.`
    )
  })

program
  .command("add")
  .description("Add one or more components (resolves registry dependencies).")
  .argument("[components...]", "component names, e.g. button card dialog")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL")
  .option("-o, --overwrite", "overwrite existing files", false)
  .option("-a, --all", "add every component in the registry", false)
  .action(async (components: string[], opts) => {
    let names = components
    if (opts.all) {
      const cwd = resolve(opts.cwd ?? process.cwd())
      const config = await loadConfig(cwd, opts.registry)
      const index = (await fetchJson(
        `${config.registry.replace(/\/$/, "")}/r/index.json`
      )) as { name: string; type: string }[]
      names = index
        .filter((i) => i.type === "registry:ui")
        .map((i) => i.name)
      console.log(`Adding all ${names.length} components…\n`)
    }
    if (names.length === 0) {
      throw new Error("Nothing to add. Pass component names or use --all.")
    }
    await addComponents(names, opts)
  })

program
  .command("diff")
  .description("Show which installed components differ from the registry.")
  .argument("[components...]", "components to check (default: all installed)")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL")
  .action(async (components: string[], opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())
    const config = await loadConfig(cwd, opts.registry)

    let names = components
    if (names.length === 0) {
      const index = (await fetchJson(
        `${config.registry.replace(/\/$/, "")}/r/index.json`
      )) as { name: string; type: string }[]
      names = index.filter((i) => i.type === "registry:ui").map((i) => i.name)
    }

    let changed = 0
    let checked = 0
    for (const name of names) {
      const item = await fetchItem(config.registry, name)
      for (const file of item.files ?? []) {
        const target = targetPath(config, cwd, file)
        if (!existsSync(target)) continue
        checked++
        const local = await readFile(target, "utf8")
        if (local !== file.content) {
          changed++
          console.log(`  ~ ${target}  (differs from registry)`)
        }
      }
    }
    if (checked === 0) {
      console.log("No installed components found to compare.")
    } else if (changed === 0) {
      console.log(`✓ ${checked} file(s) checked — all up to date.`)
    } else {
      console.log(
        `\n${changed} file(s) differ. Run "logic2b add <name> --overwrite" to update.`
      )
    }
  })

program
  .command("list")
  .description("List all components available in the registry.")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (opts) => {
    const items = (await fetchJson(
      `${opts.registry.replace(/\/$/, "")}/r/index.json`
    )) as { name: string; description: string }[]
    for (const item of items) {
      console.log(`${item.name.padEnd(16)} ${item.description}`)
    }
  })

program.parseAsync().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
