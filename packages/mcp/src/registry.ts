import { REGISTRY_DEFAULT_CHANNEL } from "@logic2b/scaffold/package-selectors"
import { maxSatisfying, valid as validVersion, validRange } from "semver"

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

/** Channel resolved when a caller omits `version`. Shared beta policy. */
export const DEFAULT_REGISTRY_CHANNEL: string = REGISTRY_DEFAULT_CHANNEL

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

/** Manifest entry: every field the verified reader depends on is required. */
export type ManifestItem = IndexItem & {
  version: string
  integrity: string
  content: string
}

export interface RegistryVersionManifest {
  schemaVersion: 1
  version: string
  channel: string
  releasedAt: string
  items: ManifestItem[]
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

/**
 * One release-scoped reader. The selector (explicit or the default channel)
 * is resolved exactly once when the client is created; every later read uses
 * that manifest's content-addressed payloads and verifies their SHA-256.
 */
export interface RegistryClient {
  base: string
  /** The selector that was resolved: the caller's, or the default channel. */
  requestedVersion: string
  /** The exact published release every read of this client comes from. */
  resolvedVersion: string
  index: ManifestItem[]
  getItem(name: string): Promise<RegistryItem>
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>

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
  const data = await fetchJson(demosIndexUrl(base), fetchImpl, "Demo index")
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
  const data = await fetchJson(demoUrl(base, name), fetchImpl, `Demo "${name}"`)
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

export function filterIndex<T extends IndexItem>(
  items: T[],
  { kind, category }: FilterOptions = {}
): T[] {
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

export function searchIndex<T extends IndexItem>(
  items: T[],
  query: string,
  limit = 20
): T[] {
  return items
    .map((item) => ({ item, score: scoreItem(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((entry) => entry.item)
}

/**
 * Fetch one JSON document with a timeout. `label` names the document in
 * errors so a failed verified read says what was missing, never what it
 * might have substituted.
 */
export async function fetchJsonText(
  url: string,
  fetchImpl: FetchLike,
  label = "Registry document"
): Promise<{ data: unknown; text: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    let res: Awaited<ReturnType<FetchLike>>
    try {
      res = await fetchImpl(url, { signal: controller.signal })
    } catch (error) {
      const reason =
        controller.signal.aborted
          ? `timed out after ${FETCH_TIMEOUT_MS} ms`
          : error instanceof Error
            ? error.message
            : String(error)
      throw new Error(`${label} could not be fetched from ${url}: ${reason}.`)
    }
    if (!res.ok) {
      throw new Error(`${label} is unavailable: HTTP ${res.status} from ${url}.`)
    }
    const text = await res.text()
    try {
      return { data: JSON.parse(text), text }
    } catch {
      throw new Error(`${label} at ${url} is not valid JSON.`)
    }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJson(url: string, fetchImpl: FetchLike, label: string): Promise<unknown> {
  return (await fetchJsonText(url, fetchImpl, label)).data
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
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

export function validateItem(name: string, data: unknown): RegistryItem {
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
  if (data.registryDependencies !== undefined && !isStringArray(data.registryDependencies)) {
    throw new Error(`Registry item "${name}" has malformed "registryDependencies".`)
  }
  if (data.dependencies !== undefined && !isStringArray(data.dependencies)) {
    throw new Error(`Registry item "${name}" has malformed "dependencies".`)
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

function validateVersions(data: unknown): RegistryVersions {
  if (
    !isObject(data) ||
    data.schemaVersion !== 1 ||
    typeof data.latest !== "string" ||
    !Array.isArray(data.versions) ||
    !isObject(data.channels)
  ) {
    throw new Error("Registry versions index is malformed.")
  }
  for (const [channel, target] of Object.entries(data.channels)) {
    if (typeof target !== "string") {
      throw new Error(`Registry versions index has a malformed "${channel}" channel.`)
    }
  }
  for (const entry of data.versions as unknown[]) {
    if (
      !isObject(entry) ||
      typeof entry.version !== "string" ||
      !validVersion(entry.version, { includePrerelease: true }) ||
      typeof entry.channel !== "string" ||
      typeof entry.releasedAt !== "string" ||
      typeof entry.manifest !== "string"
    ) {
      throw new Error("Registry versions index contains a malformed release.")
    }
  }
  return data as unknown as RegistryVersions
}

function validateManifest(resolved: string, data: unknown): RegistryVersionManifest {
  if (
    !isObject(data) ||
    data.schemaVersion !== 1 ||
    data.version !== resolved ||
    typeof data.channel !== "string" ||
    typeof data.releasedAt !== "string" ||
    !Array.isArray(data.items)
  ) {
    throw new Error(`Registry manifest ${resolved} is malformed.`)
  }
  const names = new Set<string>()
  for (const entry of data.items as unknown[]) {
    if (
      !isObject(entry) ||
      typeof entry.name !== "string" ||
      typeof entry.type !== "string" ||
      typeof entry.description !== "string" ||
      typeof entry.version !== "string" ||
      typeof entry.integrity !== "string" ||
      !entry.integrity.startsWith("sha256-") ||
      typeof entry.content !== "string"
    ) {
      throw new Error(
        `Registry manifest ${resolved} contains an item without a complete integrity contract.`
      )
    }
    if (names.has(entry.name)) {
      throw new Error(`Registry manifest ${resolved} lists "${entry.name}" twice.`)
    }
    names.add(entry.name)
  }
  return data as unknown as RegistryVersionManifest
}

export async function fetchRegistryVersions(
  base: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<RegistryVersions> {
  return validateVersions(
    await fetchJson(versionsUrl(base), fetchImpl, "Registry versions index")
  )
}

/**
 * Resolve an exact version, semver range or published channel to one
 * immutable manifest. The versions index is read once here; the returned
 * manifest is the only catalog a client built from it will ever consult.
 */
export async function resolveRegistryVersion(
  base: string,
  requested: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<{ requested: string; resolved: string; manifest: RegistryVersionManifest }> {
  const versions = await fetchRegistryVersions(base, fetchImpl)
  const range = versions.channels[requested] ?? requested
  if (!validRange(range, { includePrerelease: true })) {
    throw new Error(
      `Invalid registry version "${requested}". Use an exact semver, range or published channel (${Object.keys(versions.channels).sort().join(", ") || "none published"}).`
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
    fetchImpl,
    `Registry manifest ${resolved}`
  )
  return { requested, resolved, manifest: validateManifest(resolved, data) }
}

/**
 * Create a release-scoped reader. An omitted or blank selector resolves the
 * default channel. Every read goes through the resolved manifest and its
 * SHA-256 verified content-addressed payloads; a failed verified read is an
 * error, never a fallback to the mutable `/r/*.json` mirrors.
 */
export async function createRegistryClient(
  base: string,
  requestedVersion?: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<RegistryClient> {
  const requested = requestedVersion?.trim() || DEFAULT_REGISTRY_CHANNEL
  const selection = await resolveRegistryVersion(base, requested, fetchImpl)
  const index = selection.manifest.items
  const byName = new Map(index.map((entry) => [entry.name, entry]))
  return {
    base,
    requestedVersion: requested,
    resolvedVersion: selection.resolved,
    index,
    async getItem(name) {
      const entry = byName.get(name)
      if (!entry) {
        throw new Error(
          `Component "${name}" is not present in registry ${selection.resolved}. Use list_components or search_components with the same version to find published names.`
        )
      }
      const { data, text } = await fetchJsonText(
        absoluteRegistryUrl(base, entry.content),
        fetchImpl,
        `Registry item "${name}" content for ${selection.resolved}`
      )
      if ((await sha256Integrity(text)) !== entry.integrity) {
        throw new Error(
          `Integrity check failed for "${name}" in registry ${selection.resolved}: the payload at ${entry.content} does not match ${entry.integrity}.`
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
  const data = await fetchJson(changelogUrl(base, name), fetchImpl, `Registry changelog "${name}"`)
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
