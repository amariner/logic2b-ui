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
}

export interface RegistryFile {
  path: string
  type: string
  content: string
}

export interface RegistryItem extends IndexItem {
  dependencies?: string[]
  registryDependencies?: string[]
  files?: RegistryFile[]
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>

export function indexUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/r/index.json`
}

export function itemUrl(base: string, name: string): string {
  return `${base.replace(/\/$/, "")}/r/${name}.json`
}

export function demosIndexUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/r/demos/index.json`
}

export function demoUrl(base: string, name: string): string {
  return `${base.replace(/\/$/, "")}/r/demos/${name}.json`
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

async function fetchJson(
  url: string,
  fetchImpl: FetchLike
): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`Request failed: ${url} (HTTP ${res.status})`)
    }
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`Expected JSON from ${url} but got something else.`)
    }
  } finally {
    clearTimeout(timer)
  }
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
  if (typeof data !== "object" || data === null) {
    throw new Error(`Registry item "${name}" is malformed.`)
  }
  return data as RegistryItem
}
