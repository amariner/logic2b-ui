/**
 * Legacy, unverified registry readers.
 *
 * `/r/index.json` and `/r/<name>.json` are shadcn-compatible mirrors that the
 * site republishes on every deploy. They carry no release version and no
 * integrity contract, so two reads can disagree and nothing proves a payload
 * matches a published manifest. No MCP tool reads them: every tool resolves a
 * release through `createRegistryClient` in `registry.ts` and never falls
 * back here when a verified read fails. These helpers remain only for
 * explicit compatibility callers that accept those weaker guarantees.
 */
import { fetchJsonText, validateItem, type FetchLike, type IndexItem, type RegistryItem } from "./registry.ts"

export function indexUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/r/index.json`
}

export function itemUrl(base: string, name: string): string {
  return `${base.replace(/\/$/, "")}/r/${encodeURIComponent(name)}.json`
}

/** Read the mutable catalog mirror. Not versioned, not integrity-checked. */
export async function fetchUnverifiedIndex(
  base: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<IndexItem[]> {
  const { data } = await fetchJsonText(indexUrl(base), fetchImpl, "Registry index")
  if (!Array.isArray(data)) {
    throw new Error("Registry index is malformed (expected an array).")
  }
  return data as IndexItem[]
}

/** Read one mutable item mirror. Structure is validated; bytes are not verified. */
export async function fetchUnverifiedItem(
  base: string,
  name: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<RegistryItem> {
  const { data } = await fetchJsonText(itemUrl(base, name), fetchImpl, `Registry item "${name}"`)
  return validateItem(name, data)
}
