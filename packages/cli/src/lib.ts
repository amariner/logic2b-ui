import { refreshLocalRules } from "./rules.ts"
import { spawnSync } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { constants, existsSync, readFileSync } from "node:fs"
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { maxSatisfying, validRange } from "semver"
import { transformIconItems } from "@logic2b/scaffold"
import { ICON_LIBRARIES, type IconLibrary } from "@logic2b/tokens"

import { merge3 } from "./merge.ts"

export const DEFAULT_REGISTRY = "https://ui.logic2b.com"
export const FETCH_TIMEOUT_MS = 15_000

export interface RegistryFile {
  path: string
  type: string
  content: string
}

export interface AccessibilityContract {
  support: "native" | "primitive" | "authored" | "consumer"
  pattern: string
  primitive?: string
  keyboard: { keys: string[]; action: string }[]
  aria: string[]
  consumer: string[]
  limitations?: string[]
}

export interface ApiContract {
  source: string
  exports: {
    name: string
    kind: "component" | "hook" | "type" | "utility"
    description?: string
    propsType?: string
    props?: {
      name: string
      type: string
      required: boolean
      default?: string
      description?: string
    }[]
    aliasOf?: string
    definition?: string
    signature?: string
  }[]
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
  accessibility?: AccessibilityContract
  api?: ApiContract
  /** Resolution metadata supplied by a version-aware registry client. */
  _registry?: {
    registryVersion?: string
    itemVersion?: string
    integrity?: string
  }
}

export interface RegistryIndexItem {
  name: string
  type: string
  title?: string
  description: string
  categories?: string[]
  version?: string
  registryVersion?: string
  integrity?: string
  content?: string
  changelog?: string
  accessibility?: string
  api?: string
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>

export interface Aliases {
  components: string
  ui: string
  utils: string
  hooks: string
  lib: string
}

export interface Config {
  registry: string
  registryVersion?: string
  srcDir: string
  cssPath: string
  aliases: Aliases
  iconLibrary: IconLibrary
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
  registryOverride?: string,
  registryVersionOverride?: string,
): Promise<Config> {
  const configPath = join(cwd, "components.json")
  const srcDir = existsSync(join(cwd, "src")) ? "src" : "."

  let registry = registryOverride ?? DEFAULT_REGISTRY
  let registryVersion = registryVersionOverride
  let aliases = { ...DEFAULT_ALIASES }
  let cssPath = detectCssPath(cwd, srcDir)
  let iconLibrary: IconLibrary = "lucide"

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
    if (!registryVersionOverride) registryVersion = cfg.logic2b?.version
    aliases = { ...aliases, ...(cfg.aliases ?? {}) }
    cssPath = cfg.tailwind?.css ?? cssPath
    if (cfg.iconLibrary !== undefined) {
      if (typeof cfg.iconLibrary !== "string" || !(cfg.iconLibrary in ICON_LIBRARIES)) {
        throw new Error(
          `components.json "iconLibrary" must be one of: ${Object.keys(ICON_LIBRARIES).join(", ")}.`,
        )
      }
      iconLibrary = cfg.iconLibrary as IconLibrary
    }
  }

  return { registry, registryVersion, srcDir, cssPath, aliases, iconLibrary }
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
  if (item.name !== name) {
    throw new Error(
      `Registry item "${name}" returned the mismatched name "${item.name}".`,
    )
  }
  if (item.files !== undefined && !Array.isArray(item.files)) {
    throw new Error(`Registry item "${name}" has a malformed "files" array.`)
  }
  for (const file of (item.files ?? []) as unknown[]) {
    if (
      !looksLikeConfig(file) ||
      typeof file.path !== "string" ||
      typeof file.type !== "string" ||
      typeof file.content !== "string"
    ) {
      throw new Error(`Registry item "${name}" contains a malformed file.`)
    }
    assertSafeRegistryPath(file.path)
  }
  return item as unknown as RegistryItem
}

export function assertSafeRegistryPath(path: string): void {
  const segments = path.split("/")
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe registry file path "${path}".`)
  }
}

async function fetchJsonText(
  url: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<{ data: unknown; text: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetchImpl(url, { signal: controller.signal }) as Response
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
    return { data: JSON.parse(text), text }
  } catch {
    throw new Error(
      `Expected JSON from ${url} but got something else (is the registry URL correct?).`
    )
  }
}

export async function fetchJson(
  url: string,
  fetchImpl?: FetchLike,
): Promise<unknown> {
  return (await fetchJsonText(url, fetchImpl)).data
}

export function itemUrl(registry: string, name: string): string {
  return `${registry.replace(/\/$/, "")}/r/${encodeURIComponent(name)}.json`
}

export function indexUrl(registry: string): string {
  return `${registry.replace(/\/$/, "")}/r/index.json`
}

export function versionsUrl(registry: string): string {
  return `${registry.replace(/\/$/, "")}/r/versions.json`
}

function absoluteRegistryUrl(registry: string, reference: string): string {
  const registryUrl = new URL(`${registry.replace(/\/$/, "")}/`)
  const resolved = new URL(reference, registryUrl)
  if (
    resolved.origin !== registryUrl.origin ||
    !resolved.pathname.startsWith("/r/")
  ) {
    throw new Error(
      `Registry reference must stay under ${registryUrl.origin}/r/.`,
    )
  }
  return resolved.toString()
}

export async function fetchItem(
  registry: string,
  name: string,
  fetchImpl?: FetchLike,
): Promise<RegistryItem> {
  const url = itemUrl(registry, name)
  try {
    return validateItem(name, await fetchJson(url, fetchImpl))
  } catch (err) {
    if (err instanceof Error && err.message.includes("HTTP 404")) {
      throw new Error(`Component "${name}" not found in the registry (${url}).`)
    }
    throw err
  }
}

export interface RegistryVersionEntry {
  version: string
  channel: string
  releasedAt: string
  manifest: string
}

export interface RegistryVersionManifest {
  schemaVersion: 1
  version: string
  channel: string
  releasedAt: string
  items: RegistryIndexItem[]
}

export interface RegistrySelection {
  requested: string
  resolved: string
  manifest: RegistryVersionManifest
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Resolve an exact version, semver range or published channel to one immutable manifest. */
export async function resolveRegistryVersion(
  registry: string,
  requested: string,
  fetchImpl?: FetchLike,
): Promise<RegistrySelection> {
  const raw = await fetchJson(versionsUrl(registry), fetchImpl)
  if (!isObject(raw) || !Array.isArray(raw.versions) || !isObject(raw.channels)) {
    throw new Error("Registry versions index is malformed.")
  }
  const versions = raw.versions as RegistryVersionEntry[]
  if (
    versions.some(
      (entry) =>
        !isObject(entry) ||
        typeof entry.version !== "string" ||
        typeof entry.manifest !== "string",
    )
  ) {
    throw new Error("Registry versions index contains a malformed release.")
  }

  const channels = raw.channels as Record<string, unknown>
  const channelVersion = channels[requested]
  const range = typeof channelVersion === "string" ? channelVersion : requested
  if (!validRange(range, { includePrerelease: true })) {
    throw new Error(
      `Invalid registry version "${requested}". Use an exact semver, range or published channel.`,
    )
  }
  const resolved = maxSatisfying(
    versions.map((entry) => entry.version),
    range,
    { includePrerelease: true },
  )
  if (!resolved) {
    throw new Error(
      `No published registry version satisfies "${requested}". Available: ${versions.map((entry) => entry.version).join(", ")}.`,
    )
  }
  const release = versions.find((entry) => entry.version === resolved)!
  const manifestRaw = await fetchJson(
    absoluteRegistryUrl(registry, release.manifest),
    fetchImpl,
  )
  if (
    !isObject(manifestRaw) ||
    manifestRaw.schemaVersion !== 1 ||
    manifestRaw.version !== resolved ||
    !Array.isArray(manifestRaw.items)
  ) {
    throw new Error(`Registry manifest ${resolved} is malformed.`)
  }
  return {
    requested,
    resolved,
    manifest: manifestRaw as unknown as RegistryVersionManifest,
  }
}

export interface RegistryClient {
  registry: string
  requestedVersion?: string
  resolvedVersion?: string
  index: RegistryIndexItem[]
  getItem(name: string): Promise<RegistryItem>
}

function attachRegistryMeta(
  item: RegistryItem,
  entry: RegistryIndexItem | undefined,
  registryVersion: string | undefined,
): RegistryItem {
  if (!entry && !registryVersion) return item
  return {
    ...item,
    _registry: {
      registryVersion: registryVersion ?? entry?.registryVersion,
      itemVersion: entry?.version,
      integrity: entry?.integrity,
    },
  }
}

/** One operation-scoped client so version selection and its manifest are fetched once. */
export async function createRegistryClient(
  registry: string,
  requestedVersion?: string,
  fetchImpl?: FetchLike,
): Promise<RegistryClient> {
  if (!requestedVersion) {
    const rawIndex = await fetchJson(indexUrl(registry), fetchImpl)
    if (!Array.isArray(rawIndex)) throw new Error("Registry index is malformed.")
    const index = rawIndex as RegistryIndexItem[]
    const byName = new Map(index.map((entry) => [entry.name, entry]))
    return {
      registry,
      index,
      async getItem(name) {
        return attachRegistryMeta(
          await fetchItem(registry, name, fetchImpl),
          byName.get(name),
          undefined,
        )
      },
    }
  }

  const selection = await resolveRegistryVersion(
    registry,
    requestedVersion,
    fetchImpl,
  )
  const index = selection.manifest.items
  const byName = new Map(index.map((entry) => [entry.name, entry]))
  return {
    registry,
    requestedVersion,
    resolvedVersion: selection.resolved,
    index,
    async getItem(name) {
      const entry = byName.get(name)
      if (!entry) {
        throw new Error(
          `Component "${name}" is not present in registry ${selection.resolved}.`,
        )
      }
      if (!entry.content || !entry.integrity) {
        throw new Error(
          `Registry manifest entry "${name}" has no content/integrity contract.`,
        )
      }
      const url = absoluteRegistryUrl(registry, entry.content)
      const { data, text } = await fetchJsonText(url, fetchImpl)
      const actual = `sha256-${createHash("sha256").update(text).digest("base64")}`
      if (actual !== entry.integrity) {
        throw new Error(
          `Integrity check failed for "${name}" in registry ${selection.resolved}.`,
        )
      }
      return attachRegistryMeta(
        validateItem(name, data),
        entry,
        selection.resolved,
      )
    },
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

/** Where the registry content of an installed file is snapshotted at install
 *  time — the "base" side of update's three-way merge. Keyed by registry
 *  path, so it never collides with project files. */
export function basePath(cwd: string, registryPath: string): string {
  return join(cwd, ".logic2b", "base", registryPath)
}

async function writeBase(cwd: string, registryPath: string, content: string) {
  const target = basePath(cwd, registryPath)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content)
}

export interface InstalledItemRecord {
  version?: string
  integrity?: string
  files: string[]
}

export interface InstallManifest {
  schemaVersion: 1
  registry: {
    url: string
    requestedVersion?: string
    resolvedVersion?: string
  }
  items: Record<string, InstalledItemRecord>
}

export function installManifestPath(cwd: string): string {
  return join(cwd, ".logic2b", "manifest.json")
}

export async function readInstallManifest(
  cwd: string,
): Promise<InstallManifest | null> {
  const path = installManifestPath(cwd)
  if (!existsSync(path)) return null
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(path, "utf8"))
  } catch (err) {
    throw new Error(
      `.logic2b/manifest.json is not valid JSON (${err instanceof Error ? err.message : err}).`,
    )
  }
  if (
    !isObject(raw) ||
    raw.schemaVersion !== 1 ||
    !isObject(raw.registry) ||
    typeof raw.registry.url !== "string" ||
    !isObject(raw.items)
  ) {
    throw new Error(".logic2b/manifest.json is malformed.")
  }
  return raw as unknown as InstallManifest
}

async function writeInstallManifest(
  cwd: string,
  manifest: InstallManifest,
): Promise<void> {
  const path = installManifestPath(cwd)
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}`
  await writeFile(temp, JSON.stringify(manifest, null, 2))
  await rename(temp, path)
}

async function recordResolvedItems(
  cwd: string,
  client: RegistryClient,
  resolved: Map<string, RegistryItem>,
): Promise<void> {
  const previous = await readInstallManifest(cwd)
  const items: Record<string, InstalledItemRecord> = {
    ...(previous?.items ?? {}),
  }
  for (const item of resolved.values()) {
    items[item.name] = {
      version: item._registry?.itemVersion,
      integrity: item._registry?.integrity,
      files: (item.files ?? []).map((file) => file.path).sort(),
    }
  }
  await writeInstallManifest(cwd, {
    schemaVersion: 1,
    registry: {
      url: client.registry,
      requestedVersion: client.requestedVersion,
      resolvedVersion: client.resolvedVersion,
    },
    items: Object.fromEntries(
      Object.entries(items).sort(([a], [b]) => a.localeCompare(b)),
    ),
  })
}

export async function installedItemNames(cwd: string): Promise<string[]> {
  const manifest = await readInstallManifest(cwd)
  return manifest ? Object.keys(manifest.items).sort() : []
}

export async function addComponents(
  names: string[],
  opts: {
    registry?: string
    registryVersion?: string
    cwd?: string
    overwrite?: boolean
    install?: boolean
    agentRules?: boolean
    fetchImpl?: FetchLike
    client?: RegistryClient
  }
): Promise<Map<string, RegistryItem>> {
  const { resolve } = await import("node:path")
  const cwd = resolve(opts.cwd ?? process.cwd())
  const config = await loadConfig(cwd, opts.registry, opts.registryVersion)
  const client =
    opts.client ??
    (await createRegistryClient(
      config.registry,
      config.registryVersion,
      opts.fetchImpl,
    ))

  const resolved = transformIconItems(
    await resolveGraph(names, (name) => client.getItem(name)),
    config.iconLibrary,
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
      await writeBase(cwd, file.path, file.content)
      console.log(`  write ${target}`)
      written++
    }
  }

  await recordResolvedItems(cwd, client, resolved)
  if (opts.agentRules !== false && config.registry.replace(/\/$/, "") === DEFAULT_REGISTRY) await refreshLocalRules(cwd)
  console.log(`\n✓ ${written} file(s) written, ${skipped} skipped.`)
  if (client.resolvedVersion) {
    console.log(
      `✓ registry ${client.resolvedVersion} (${client.requestedVersion}) recorded in .logic2b/manifest.json.`
    )
  }
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

export interface UpdateSummary {
  updated: number
  merged: number
  conflicts: number
  unchanged: number
  keptLocal: number
  noBase: number
  resolvedVersion?: string
}

interface UpdateConflict { path: string; tag: string; conflicts: number }
const UPDATE_CONFLICT_BYTES = 128 * 1024
const conflictPath = (cwd: string) => join(cwd, ".logic2b", "update-conflicts.json")

function validateUpdateConflict(entry: unknown): UpdateConflict {
  if (!isObject(entry) || Object.keys(entry).sort().join() !== "conflicts,path,tag" || typeof entry.path !== "string" || typeof entry.tag !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(entry.tag) || !Number.isInteger(entry.conflicts) || (entry.conflicts as number) < 1 || (entry.conflicts as number) > 10000) throw new Error("Malformed update conflict entry; preserve it for inspection.")
  // Match the registry's path contract in both directions. The serialized
  // record has a total byte limit; a separate shorter path limit would make
  // valid installed files produce records that their own reader rejects.
  assertSafeRegistryPath(entry.path)
  return entry as unknown as UpdateConflict
}

/** Track only markers created by this updater. Ordinary source containing
 * marker examples must not be mistaken for an unresolved Logic2b update. */
async function readUpdateConflicts(cwd: string): Promise<Map<string, UpdateConflict>> {
  let handle
  try { handle = await open(conflictPath(cwd), constants.O_RDONLY | constants.O_NOFOLLOW) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map(); throw error }
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > UPDATE_CONFLICT_BYTES) throw new Error("Update conflict record is not a bounded regular file.")
    const buffer = Buffer.alloc(UPDATE_CONFLICT_BYTES + 1)
    let size = 0
    while (size < buffer.length) { const chunk = await handle.read(buffer, size, buffer.length - size, null); if (!chunk.bytesRead) break; size += chunk.bytesRead }
    if (size > UPDATE_CONFLICT_BYTES) throw new Error("Update conflict record exceeds 128 KiB.")
    const raw: unknown = JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(buffer.subarray(0, size)))
    if (!isObject(raw) || Object.keys(raw).sort().join() !== "files,schemaVersion" || raw.schemaVersion !== 1 || !Array.isArray(raw.files) || raw.files.length > 512) throw new Error("Malformed update conflict record; preserve it for inspection.")
    const result = new Map<string, UpdateConflict>()
    for (const rawEntry of raw.files) {
      const entry = validateUpdateConflict(rawEntry)
      if (result.has(entry.path)) throw new Error("Duplicate update conflict entry; preserve it for inspection.")
      result.set(entry.path, entry)
    }
    return result
  } finally { await handle.close() }
}

async function writeUpdateConflicts(cwd: string, entries: Map<string, UpdateConflict>) {
  const path = conflictPath(cwd)
  if (entries.size === 0) { await unlink(path).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }); return }
  const content = JSON.stringify({ schemaVersion: 1, files: [...entries.values()].map(validateUpdateConflict).sort((a, b) => a.path.localeCompare(b.path)) }, null, 2)
  if (entries.size > 512 || Buffer.byteLength(content) > UPDATE_CONFLICT_BYTES) throw new Error("Update conflict record exceeds its limit; resolve existing conflicts first.")
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  try { await writeFile(temporary, content, { flag: "wx", mode: 0o600 }); await rename(temporary, path) }
  finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }) }
}

/**
 * Pull upstream changes into installed files without clobbering local edits:
 * a three-way merge of base (install-time snapshot), local file and current
 * registry content. Files installed before bases existed fall back to a
 * warning when they differ from the registry.
 */
export async function updateComponents(
  names: string[],
  opts: {
    registry?: string
    registryVersion?: string
    cwd?: string
    install?: boolean
    agentRules?: boolean
    fetchImpl?: FetchLike
  }
): Promise<UpdateSummary> {
  const { resolve } = await import("node:path")
  const cwd = resolve(opts.cwd ?? process.cwd())
  const config = await loadConfig(cwd, opts.registry, opts.registryVersion)
  const client = await createRegistryClient(
    config.registry,
    config.registryVersion,
    opts.fetchImpl,
  )

  const resolved = transformIconItems(
    await resolveGraph(names, (name) => client.getItem(name)),
    config.iconLibrary,
  )

  const summary: UpdateSummary = {
    updated: 0,
    merged: 0,
    conflicts: 0,
    unchanged: 0,
    keptLocal: 0,
    noBase: 0,
    resolvedVersion: client.resolvedVersion,
  }
  const npmDeps = new Set<string>()
  const unresolved = await readUpdateConflicts(cwd)
  const checkedPaths = new Set<string>()
  const previous = unresolved.size ? await readInstallManifest(cwd) : null
  for (const item of resolved.values()) {
    for (const file of item.files ?? []) checkedPaths.add(file.path)
    // A renamed/removed upstream file still belongs to the installed item.
    // Keep inspecting its conflict until the consumer explicitly resolves it.
    const installed = previous?.items[item.name]
    if (installed) {
      if (!Array.isArray(installed.files)) throw new Error("Installed item paths are malformed; preserve the manifest and conflict record for inspection.")
      for (const path of installed.files) {
        if (typeof path !== "string") throw new Error("Installed item paths are malformed; preserve the manifest and conflict record for inspection.")
        assertSafeRegistryPath(path)
        checkedPaths.add(path)
      }
    }
  }
  let cleared = false
  // Refuse the whole requested update while a previous merge remains open.
  // This runs before source/base/manifest writes, including when a different
  // upstream version is requested. The record is written before its markers
  // are published, so a failed source write can be retried safely as well.
  for (const path of checkedPaths) {
    const entry = unresolved.get(path)
    if (!entry) continue
    const target = targetPath(config, cwd, { path, type: "registry:file", content: "" })
    const local = existsSync(target) ? await readFile(target, "utf8") : ""
    if (local.includes(`logic2b:${entry.tag}`)) {
      summary.conflicts += entry.conflicts
      console.log(`  ! ${target} has ${entry.conflicts} unresolved update conflict(s); resolve the tagged markers before updating again.`)
    } else { unresolved.delete(path); cleared = true }
  }
  if (summary.conflicts > 0) {
    console.log(`\n⚠ ${summary.conflicts} unresolved conflict(s); no files, snapshots or install manifest were changed.`)
    return summary
  }
  if (cleared) await writeUpdateConflicts(cwd, unresolved)

  for (const item of resolved.values()) {
    for (const dep of item.dependencies ?? []) npmDeps.add(dep)
    for (const file of item.files ?? []) {
      const target = targetPath(config, cwd, file)
      if (!existsSync(target)) continue // not installed — update touches nothing new
      const local = await readFile(target, "utf8")
      const remote = file.content
      const bPath = basePath(cwd, file.path)

      if (local === remote) {
        summary.unchanged++
        await writeBase(cwd, file.path, remote) // heal a missing/stale base
        continue
      }
      if (!existsSync(bPath)) {
        summary.noBase++
        console.log(
          `  ! ${target} differs but has no install snapshot (pre-0.4 install) — ` +
            `left untouched. Re-add with --overwrite to take the registry version.`
        )
        continue
      }
      const base = await readFile(bPath, "utf8")
      if (local === base) {
        await writeFile(target, remote)
        await writeBase(cwd, file.path, remote)
        summary.updated++
        console.log(`  update ${target}`)
        continue
      }
      if (remote === base) {
        summary.keptLocal++ // registry unchanged; local edits stay
        continue
      }
      const tag = randomUUID()
      const { merged, conflicts } = merge3(base, local, remote, { local: `local (logic2b:${tag})`, remote: `registry (logic2b:${tag})` })
      if (conflicts > 0) {
        // Prefixes remain standard merge markers; the tag identifies this
        // updater's own unresolved work even if its contents are hand-edited.
        unresolved.set(file.path, { path: file.path, tag, conflicts })
        await writeUpdateConflicts(cwd, unresolved)
      }
      await writeFile(target, merged)
      await writeBase(cwd, file.path, remote)
      summary.merged++
      if (conflicts > 0) {
        summary.conflicts += conflicts
        console.log(`  merge ${target} — ${conflicts} conflict(s), look for <<<<<<< markers`)
      } else {
        console.log(`  merge ${target} — local edits kept`)
      }
    }
  }

  await recordResolvedItems(cwd, client, resolved)
  if (opts.agentRules !== false && config.registry.replace(/\/$/, "") === DEFAULT_REGISTRY) await refreshLocalRules(cwd)
  const parts = [
    `${summary.updated} updated`,
    `${summary.merged} merged`,
    `${summary.unchanged} already current`,
  ]
  if (summary.keptLocal > 0) parts.push(`${summary.keptLocal} kept local (registry unchanged)`)
  if (summary.noBase > 0) parts.push(`${summary.noBase} skipped (no snapshot)`)
  console.log(`\n✓ ${parts.join(", ")}.`)
  if (summary.conflicts > 0) {
    console.log(`⚠ ${summary.conflicts} conflict(s) need manual resolution.`)
  }
  if (npmDeps.size > 0 && (summary.updated > 0 || summary.merged > 0) && opts.install !== false) {
    installDeps(cwd, [...npmDeps].sort())
  }
  return summary
}
