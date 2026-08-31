import {
  applyPresetToCss,
  decodePreset,
  encodePreset,
  type ThemeConfig,
} from "@logic2b/tokens"

export const DEFAULT_REGISTRY = "https://ui.logic2b.com"
export const FETCH_TIMEOUT_MS = 15_000

export const COMMAND_IDS = [
  "logic2b.refreshRegistry",
  "logic2b.searchRegistry",
  "logic2b.installItem",
  "logic2b.installItems",
  "logic2b.initializeWorkspace",
  "logic2b.applyPreset",
  "logic2b.openCreate",
  "logic2b.openDocumentation",
] as const

export type RegistryKind = "component" | "block" | "chart"

export interface RegistryIndexItem {
  name: string
  type: string
  title?: string
  description: string
  categories?: string[]
}

export interface RegistryGroup {
  kind: RegistryKind
  label: string
  items: RegistryIndexItem[]
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function normalizeRegistryUrl(raw: string): string {
  const value = raw.trim()
  if (!value) throw new Error("Registry URL cannot be empty.")

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`Registry URL is invalid: ${value}`)
  }
  const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]", "::1"])
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && localHostnames.has(url.hostname))
  ) {
    throw new Error("Registry URL must use HTTPS (HTTP is allowed only for localhost).")
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Registry URL cannot contain credentials, a query or a fragment.")
  }
  return url.toString().replace(/\/$/, "")
}

export function registryIndexUrl(registry: string): string {
  return `${normalizeRegistryUrl(registry)}/r/index.json`
}

export function validateRegistryIndex(value: unknown): RegistryIndexItem[] {
  if (!Array.isArray(value)) {
    throw new Error("Registry index is malformed (expected an array).")
  }
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Registry item ${index + 1} is malformed.`)
    }
    const { name, type, title, description, categories } = entry
    if (
      typeof name !== "string" ||
      !/^[a-z0-9][a-z0-9-]*$/.test(name) ||
      typeof type !== "string" ||
      typeof description !== "string" ||
      (title !== undefined && typeof title !== "string") ||
      (categories !== undefined &&
        (!Array.isArray(categories) ||
          !categories.every((category) => typeof category === "string")))
    ) {
      throw new Error(`Registry item ${index + 1} has an invalid contract.`)
    }
    return {
      name,
      type,
      description,
      ...(title === undefined ? {} : { title }),
      ...(categories === undefined ? {} : { categories: [...categories] }),
    }
  })
}

export async function fetchRegistryIndex(
  registry: string,
  fetchImpl: FetchLike = fetch as FetchLike,
): Promise<RegistryIndexItem[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetchImpl(registryIndexUrl(registry), {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Registry returned HTTP ${response.status}.`)
    }
    return validateRegistryIndex(await response.json())
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Registry request timed out after ${FETCH_TIMEOUT_MS / 1000}s.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function registryKind(item: RegistryIndexItem): RegistryKind | null {
  if (item.type === "registry:ui") return "component"
  if (item.type !== "registry:block") return null
  return item.categories?.includes("charts") ? "chart" : "block"
}

function matchesQuery(item: RegistryIndexItem, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = [
    item.name,
    item.title ?? "",
    item.description,
    ...(item.categories ?? []),
  ]
    .join(" ")
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export function groupRegistryItems(
  items: RegistryIndexItem[],
  query = "",
): RegistryGroup[] {
  const definitions: Array<{ kind: RegistryKind; label: string }> = [
    { kind: "component", label: "Components" },
    { kind: "block", label: "Blocks" },
    { kind: "chart", label: "Charts" },
  ]
  return definitions.flatMap(({ kind, label }) => {
    const grouped = items
      .filter((item) => registryKind(item) === kind && matchesQuery(item, query))
      .sort((a, b) => a.name.localeCompare(b.name))
    return grouped.length === 0 ? [] : [{ kind, label, items: grouped }]
  })
}

export function documentationUrl(
  registry: string,
  item: RegistryIndexItem,
): string {
  const base = normalizeRegistryUrl(registry)
  const kind = registryKind(item)
  if (kind === "component") return `${base}/docs/components/${item.name}`
  if (kind === "chart") {
    const category = item.categories?.find((value) => value.startsWith("charts-"))
    return `${base}/charts/${category?.slice("charts-".length) ?? "area"}`
  }
  if (kind === "block") {
    return `${base}/blocks/${item.categories?.[0] ?? "application"}/${item.name}`
  }
  return `${base}/r/${encodeURIComponent(item.name)}.json`
}

export function themePathFromCssEntry(cssEntry: string): string {
  const normalized = cssEntry.replaceAll("\\", "/")
  const segments = normalized.split("/")
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes(":") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`components.json has an unsafe Tailwind CSS path: ${cssEntry}`)
  }
  return [...segments.slice(0, -1), "theme.css"].join("/")
}

export interface PresetProjectPatch {
  config: string
  themeCss: string
  themePath: string
  presetId: string
  preset: ThemeConfig
}

export function applyPresetToProject(
  configText: string,
  themeCss: string,
  requestedPreset: string,
): PresetProjectPatch {
  const preset = decodePreset(requestedPreset.trim())
  if (!preset) {
    throw new Error("Preset id is invalid. Copy a preset from ui.logic2b.com/create.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(configText)
  } catch (error) {
    throw new Error(
      `components.json is not valid JSON (${error instanceof Error ? error.message : error}).`,
    )
  }
  if (!isRecord(parsed)) throw new Error("components.json must be a JSON object.")

  const tailwind = isRecord(parsed.tailwind) ? { ...parsed.tailwind } : {}
  if (typeof tailwind.css !== "string") {
    throw new Error('components.json must define "tailwind.css" before applying a preset.')
  }
  const logic2b = isRecord(parsed.logic2b) ? { ...parsed.logic2b } : {}
  const presetId = encodePreset(preset)
  tailwind.baseColor = preset.base
  logic2b.preset = presetId

  return {
    config: `${JSON.stringify(
      {
        ...parsed,
        tailwind,
        iconLibrary: preset.iconLibrary,
        logic2b,
      },
      null,
      2,
    )}\n`,
    themeCss: applyPresetToCss(themeCss, preset),
    themePath: themePathFromCssEntry(tailwind.css),
    presetId,
    preset,
  }
}
