import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

export const DEFAULT_REGISTRY = "https://ui.logic2b.com"
export const FETCH_TIMEOUT_MS = 15_000

export interface RegistryFile {
  path: string
  type: string
  content: string
}

export interface RegistryItem {
  name: string
  type: string
  title?: string
  description: string
  dependencies?: string[]
  registryDependencies?: string[]
  files?: RegistryFile[]
  docs?: string
}

export interface Aliases {
  components: string
  ui: string
  utils: string
  hooks: string
  lib: string
}

export interface Config {
  registry: string
  srcDir: string
  cssPath: string
  aliases: Aliases
}

export const DEFAULT_ALIASES: Aliases = {
  components: "@/components",
  ui: "@/components/ui",
  utils: "@/lib/utils",
  hooks: "@/hooks",
  lib: "@/lib",
}

/** Best guess at where the project's Tailwind entry stylesheet lives. */
export function detectCssPath(cwd: string, srcDir: string): string {
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

export function looksLikeConfig(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null
}

export async function loadConfig(
  cwd: string,
  registryOverride?: string
): Promise<Config> {
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
export function aliasToDir(cwd: string, srcDir: string, alias: string): string {
  const rel = alias.replace(/^@\//, "").replace(/^~\//, "")
  return srcDir === "." ? join(cwd, rel) : join(cwd, srcDir, rel)
}

export function validateItem(name: string, data: unknown): RegistryItem {
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

export async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timed out after ${FETCH_TIMEOUT_MS / 1000}s fetching ${url}`)
    }
    throw new Error(
      `Network error fetching ${url}: ${err instanceof Error ? err.message : err}`
    )
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

export function itemUrl(registry: string, name: string): string {
  return `${registry.replace(/\/$/, "")}/r/${name}.json`
}

export function indexUrl(registry: string): string {
  return `${registry.replace(/\/$/, "")}/r/index.json`
}

export async function fetchItem(
  registry: string,
  name: string
): Promise<RegistryItem> {
  const url = itemUrl(registry, name)
  try {
    return validateItem(name, await fetchJson(url))
  } catch (err) {
    if (err instanceof Error && err.message.includes("HTTP 404")) {
      throw new Error(`Component "${name}" not found in the registry (${url}).`)
    }
    throw err
  }
}

export function targetPath(
  config: Config,
  cwd: string,
  file: RegistryFile
): string {
  const { srcDir, aliases } = config
  // Registry file paths: "ui/button.tsx", "blocks/login-01/x.tsx",
  // "charts/chart-area-01.tsx", "hooks/use-mobile.ts", "lib/utils.ts", "theme.css".
  if (file.path.startsWith("ui/")) {
    return join(aliasToDir(cwd, srcDir, aliases.ui), file.path.slice(3))
  }
  if (file.path.startsWith("blocks/")) {
    return join(aliasToDir(cwd, srcDir, aliases.components), file.path.slice(7))
  }
  if (file.path.startsWith("charts/")) {
    return join(aliasToDir(cwd, srcDir, aliases.components), file.path)
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

/** Breadth-first resolution of an item and its registry dependencies.
 *  `getItem` is injected so callers (and tests) control how items are fetched. */
export async function resolveGraph(
  names: string[],
  getItem: (name: string) => Promise<RegistryItem>
): Promise<Map<string, RegistryItem>> {
  const resolved = new Map<string, RegistryItem>()
  const queue = [...names]
  while (queue.length > 0) {
    const name = queue.shift()!
    if (resolved.has(name)) continue
    const item = await getItem(name)
    resolved.set(name, item)
    queue.push(...(item.registryDependencies ?? []))
  }
  return resolved
}

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun"

/** Detect the project's package manager: the `packageManager` field wins,
 *  then the lockfile, then npm. */
export function detectPackageManager(cwd: string): PackageManager {
  const pkgPath = join(cwd, "package.json")
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        packageManager?: string
      }
      const declared = pkg.packageManager?.split("@")[0]
      if (declared === "pnpm" || declared === "npm" || declared === "yarn" || declared === "bun") {
        return declared
      }
    } catch {
      // Malformed package.json — fall through to lockfile detection.
    }
  }
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn"
  if (existsSync(join(cwd, "bun.lock")) || existsSync(join(cwd, "bun.lockb"))) return "bun"
  return "npm"
}

/** The install invocation for a set of packages, per package manager. */
export function installCommand(pm: PackageManager, deps: string[]): string[] {
  const verb = pm === "npm" ? "install" : "add"
  return [pm, verb, ...deps]
}

/** Run the package manager to install deps; false (with the manual command
 *  printed) when the install can't run or fails. */
function installDeps(cwd: string, deps: string[]): boolean {
  const manual = () =>
    console.log(`\nInstall the required dependencies:\n\n  npm install ${deps.join(" ")}\n`)
  if (!existsSync(join(cwd, "package.json"))) {
    console.log("\nNo package.json here — skipping dependency install.")
    manual()
    return false
  }
  const pm = detectPackageManager(cwd)
  const [cmd, ...args] = installCommand(pm, deps)
  console.log(`\nInstalling dependencies with ${pm}…\n`)
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit" })
  if (res.status !== 0) {
    console.log(`\n✗ ${pm} exited with ${res.status ?? "an error"}.`)
    manual()
    return false
  }
  return true
}

export async function addComponents(
  names: string[],
  opts: { registry?: string; cwd?: string; overwrite?: boolean; install?: boolean }
): Promise<Map<string, RegistryItem>> {
  const { resolve } = await import("node:path")
  const cwd = resolve(opts.cwd ?? process.cwd())
  const config = await loadConfig(cwd, opts.registry)

  const resolved = await resolveGraph(names, (name) =>
    fetchItem(config.registry, name)
  )

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
    const deps = [...npmDeps].sort()
    if (opts.install === false) {
      console.log(`\nInstall the required dependencies:\n\n  npm install ${deps.join(" ")}\n`)
    } else {
      installDeps(cwd, deps)
    }
  }
  return resolved
}
