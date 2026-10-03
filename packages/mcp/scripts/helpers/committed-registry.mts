import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { FetchLike } from "../../src/registry.ts"

const registryDir = fileURLToPath(new URL("../../../../apps/web/public/r/", import.meta.url))

/** Serve the committed immutable registry without remote requests. */
export const committedRegistryFetch: FetchLike = async (input) => {
  const url = new URL(input)
  if (!url.pathname.startsWith("/r/")) return { ok: false, status: 404, text: async () => "Not found" }
  const registryPath = decodeURIComponent(url.pathname.slice(3))
  if (!registryPath.endsWith(".json") || registryPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    return { ok: false, status: 404, text: async () => "Not found" }
  }
  try {
    const content = await readFile(join(registryDir, registryPath), "utf8")
    return { ok: true, status: 200, text: async () => content }
  } catch {
    return { ok: false, status: 404, text: async () => "Not found" }
  }
}
