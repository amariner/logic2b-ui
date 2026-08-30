import { maxSatisfying, validRange } from "semver"

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

export const DEFAULT_REGISTRY =
  (typeof process !== "undefined"
    ? process.env?.LOGIC2B_REGISTRY?.replace(/\/$/, "")
    : undefined) ?? "https://ui.logic2b.com"

export const FETCH_TIMEOUT_MS = 15_000

export interface IndexItem {
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

export interface RegistryFile {
  path: string
  type: string
  content: string
}

export type RegistryItem = Omit<IndexItem, "accessibility" | "api"> & {
  dependencies?: string[]
  registryDependencies?: string[]
  files?: RegistryFile[]
  accessibility?: AccessibilityContract
  api?: ApiContract
}

export interface RegistryVersionEntry {
  version: string
  channel: string
  releasedAt: string
  manifest: string
}

export interface RegistryVersions {
  schemaVersion: 1
  latest: string
  channels: Record<string, string>
  versions: RegistryVersionEntry[]
}

export interface RegistryVersionManifest {
  schemaVersion: 1
  version: string
  channel: string
  releasedAt: string
  items: IndexItem[]
}

export interface RegistryChangelogEntry {
  version: string
  releasedAt: string
  kind: string
  summary: string
}

export interface RegistryChangelog {
  schemaVersion: 1
  name: string
  currentVersion: string
  changes: RegistryChangelogEntry[]
}

export interface RegistryClient {
  base: string
  requestedVersion?: string
  resolvedVersion?: string
  index: IndexItem[]
  getItem(name: string): Promise<RegistryItem>
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>

export function indexUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/r/index.json`
}

export function itemUrl(base: string, name: string): string {
  return `${base.replace(/\/$/, "")}/r/${encodeURIComponent(name)}.json`
}

export function versionsUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/r/versions.json`
}

export function changelogUrl(base: string, name: string): string {
  return `${base.replace(/\/$/, "")}/r/changelog/${encodeURIComponent(name)}.json`
}

function absoluteRegistryUrl(base: string, reference: string): string {
  const registry = new URL(`${base.replace(/\/$/, "")}/`)
  const resolved = new URL(reference, registry)
  if (resolved.origin !== registry.origin || !resolved.pathname.startsWith("/r/")) {
    throw new Error(`Registry reference must stay under ${registry.origin}/r/.`)
  }
  return resolved.toString()
}

export function demosIndexUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/r/demos/index.json`
}

export function demoUrl(base: string, name: string): string {
  return `${base.replace(/\/$/, "")}/r/demos/${encodeURIComponent(name)}.json`
}

export interface DemoIndexEntry {
  item: string
  demos: string[]
}

export interface DemoEntry {
  name: string
  item: string
  content: string
}

export async function fetchDemoIndex(
  base: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<DemoIndexEntry[]> {
  const data = await fetchJson(demosIndexUrl(base), fetchImpl)
  if (!Array.isArray(data)) {
    throw new Error("Demo index is malformed (expected an array).")
  }
  return data as DemoIndexEntry[]
}

export async function fetchDemo(
  base: string,
  name: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<DemoEntry> {
  const data = await fetchJson(demoUrl(base, name), fetchImpl)
  if (typeof data !== "object" || data === null) {
    throw new Error(`Demo "${name}" is malformed.`)
  }
  return data as DemoEntry
}

export function isChart(item: IndexItem): boolean {
  return item.categories?.includes("charts") ?? false
}

/** Human-facing kind, used to group results and drive the `kind` filter. */
export function kindOf(item: IndexItem): "component" | "block" | "chart" | "theme" {
  if (item.type === "registry:theme") return "theme"
  if (item.type === "registry:block") return isChart(item) ? "chart" : "block"
  return "component"
}

export interface FilterOptions {
  kind?: "component" | "block" | "chart" | "theme"
  category?: string
}

export function filterIndex(
  items: IndexItem[],
  { kind, category }: FilterOptions = {}
): IndexItem[] {
  return items.filter((item) => {
    if (kind && kindOf(item) !== kind) return false
    if (category && !(item.categories ?? []).includes(category)) return false
    return true
  })
}

/** Score how well an item matches a free-text query. Higher is better; 0 = no
 *  match. Name and title hits weigh more than description hits, and an exact
 *  name match wins outright. */
export function scoreItem(item: IndexItem, query: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 1
  const name = item.name.toLowerCase()
  const title = (item.title ?? "").toLowerCase()
  const description = item.description.toLowerCase()

  if (name === q) return 1000
  let score = 0
  for (const term of q.split(/\s+/)) {
    if (!term) continue
    if (name.includes(term)) score += 10
    if (title.includes(term)) score += 6
    if (description.includes(term)) score += 3
  }
  return score
}

export function searchIndex(
  items: IndexItem[],
  query: string,
  limit = 20
): IndexItem[] {
  return items
    .map((item) => ({ item, score: scoreItem(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((entry) => entry.item)
}

async function fetchJsonText(
  url: string,
  fetchImpl: FetchLike
): Promise<{ data: unknown; text: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`Request failed: ${url} (HTTP ${res.status})`)
    }
    const text = await res.text()
    try {
      return { data: JSON.parse(text), text }
    } catch {
      throw new Error(`Expected JSON from ${url} but got something else.`)
    }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJson(url: string, fetchImpl: FetchLike): Promise<unknown> {
  return (await fetchJsonText(url, fetchImpl)).data
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
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

function validateItem(name: string, data: unknown): RegistryItem {
  if (!isObject(data) || typeof data.name !== "string" || typeof data.type !== "string") {
    throw new Error(`Registry item "${name}" is malformed.`)
  }
  if (data.name !== name) {
    throw new Error(
      `Registry item "${name}" returned the mismatched name "${data.name}".`
    )
  }
  if (data.files !== undefined && !Array.isArray(data.files)) {
    throw new Error(`Registry item "${name}" has a malformed "files" array.`)
  }
  for (const file of (data.files ?? []) as unknown[]) {
    if (
      !isObject(file) ||
      typeof file.path !== "string" ||
      typeof file.type !== "string" ||
      typeof file.content !== "string"
    ) {
      throw new Error(`Registry item "${name}" contains a malformed file.`)
    }
    assertSafeRegistryPath(file.path)
  }
  return data as unknown as RegistryItem
}

async function sha256Integrity(text: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  )
  let binary = ""
  for (const byte of digest) binary += String.fromCharCode(byte)
  return `sha256-${btoa(binary)}`
}

export async function fetchIndex(
  base: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<IndexItem[]> {
  const data = await fetchJson(indexUrl(base), fetchImpl)
  if (!Array.isArray(data)) {
    throw new Error("Registry index is malformed (expected an array).")
  }
  return data as IndexItem[]
}

export async function fetchItem(
  base: string,
  name: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<RegistryItem> {
  const data = await fetchJson(itemUrl(base, name), fetchImpl)
  return validateItem(name, data)
}

export async function fetchRegistryVersions(
  base: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<RegistryVersions> {
  const data = await fetchJson(versionsUrl(base), fetchImpl)
  if (
    !isObject(data) ||
    data.schemaVersion !== 1 ||
    !Array.isArray(data.versions) ||
    !isObject(data.channels)
  ) {
    throw new Error("Registry versions index is malformed.")
  }
  return data as unknown as RegistryVersions
}

export async function resolveRegistryVersion(
  base: string,
  requested: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<{ requested: string; resolved: string; manifest: RegistryVersionManifest }> {
  const versions = await fetchRegistryVersions(base, fetchImpl)
  const range = versions.channels[requested] ?? requested
  if (!validRange(range, { includePrerelease: true })) {
    throw new Error(
      `Invalid registry version "${requested}". Use an exact semver, range or published channel.`
    )
  }
  const resolved = maxSatisfying(
    versions.versions.map((entry) => entry.version),
    range,
    { includePrerelease: true }
  )
  if (!resolved) {
    throw new Error(
      `No published registry version satisfies "${requested}". Available: ${versions.versions.map((entry) => entry.version).join(", ")}.`
    )
  }
  const release = versions.versions.find((entry) => entry.version === resolved)!
  const data = await fetchJson(
    absoluteRegistryUrl(base, release.manifest),
    fetchImpl
  )
  if (
    !isObject(data) ||
    data.schemaVersion !== 1 ||
    data.version !== resolved ||
    !Array.isArray(data.items)
  ) {
    throw new Error(`Registry manifest ${resolved} is malformed.`)
  }
  return {
    requested,
    resolved,
    manifest: data as unknown as RegistryVersionManifest,
  }
}

export async function createRegistryClient(
  base: string,
  requestedVersion?: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<RegistryClient> {
  if (!requestedVersion) {
    const index = await fetchIndex(base, fetchImpl)
    return {
      base,
      index,
      getItem: (name) => fetchItem(base, name, fetchImpl),
    }
  }
  const selection = await resolveRegistryVersion(base, requestedVersion, fetchImpl)
  const index = selection.manifest.items
  const byName = new Map(index.map((entry) => [entry.name, entry]))
  return {
    base,
    requestedVersion,
    resolvedVersion: selection.resolved,
    index,
    async getItem(name) {
      const entry = byName.get(name)
      if (!entry) {
        throw new Error(
          `Component "${name}" is not present in registry ${selection.resolved}.`
        )
      }
      if (!entry.content || !entry.integrity) {
        throw new Error(`Registry manifest entry "${name}" has no integrity contract.`)
      }
      const { data, text } = await fetchJsonText(
        absoluteRegistryUrl(base, entry.content),
        fetchImpl
      )
      if ((await sha256Integrity(text)) !== entry.integrity) {
        throw new Error(
          `Integrity check failed for "${name}" in registry ${selection.resolved}.`
        )
      }
      const item = validateItem(name, data)
      return {
        ...item,
        version: entry.version,
        registryVersion: selection.resolved,
        integrity: entry.integrity,
        content: entry.content,
        changelog: entry.changelog,
      }
    },
  }
}

export async function fetchChangelog(
  base: string,
  name: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<RegistryChangelog> {
  const data = await fetchJson(changelogUrl(base, name), fetchImpl)
  if (
    !isObject(data) ||
    data.schemaVersion !== 1 ||
    data.name !== name ||
    !Array.isArray(data.changes)
  ) {
    throw new Error(`Registry changelog "${name}" is malformed.`)
  }
  return data as unknown as RegistryChangelog
}
