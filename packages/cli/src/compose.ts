import { open, mkdir, lstat, writeFile, realpath } from "node:fs/promises"
import { buildComposePlan, COMPOSE_LIMITS, loadComposeItems, validateComposeRequest, type ComposePlan } from "@logic2b/scaffold/compose"
import { REGISTRY_VERSION } from "@logic2b/registry/version"
import { createRegistryClient, DEFAULT_REGISTRY, type FetchLike } from "./lib.ts"
import { addCompositionProject, type CompositionAsset } from "@logic2b/scaffold/compose-project"
import { dirname, resolve, sep } from "node:path"

export async function readComposeRequest(path: string): Promise<unknown> {
  const handle = await open(path, "r")
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > COMPOSE_LIMITS.bytes) throw new Error("Composition request must be a JSON file up to 65536 bytes.")
    const buffer = Buffer.alloc(COMPOSE_LIMITS.bytes + 1)
    let offset = 0
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null)
      if (!bytesRead) break
      offset += bytesRead
    }
    if (offset > COMPOSE_LIMITS.bytes) throw new Error("Composition request exceeds 65536 bytes.")
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, offset))) }
    catch { throw new Error("Composition request must be UTF-8 JSON; source is never executed.") }
  } finally { await handle.close() }
}

export async function composeLocal(raw: unknown, { registry = DEFAULT_REGISTRY, version, fetchImpl }: { registry?: string; version?: string; fetchImpl?: FetchLike } = {}): Promise<ComposePlan> {
  const request = validateComposeRequest(raw)
  const client = await createRegistryClient(registry, version ?? request.version ?? REGISTRY_VERSION, fetchImpl)
  if (!client.resolvedVersion) throw new Error("Composition requires an immutable registry release.")
  const cache = new Map<string, CompositionAsset>()
  const getItem = async (name: string): Promise<CompositionAsset> => {
    if (!cache.has(name)) {
      const item = await client.getItem(name)
      cache.set(name, { ...item, version: item._registry?.itemVersion, integrity: item._registry?.integrity })
    }
    return cache.get(name)!
  }
  const items = await loadComposeItems(request, client.index, getItem)
  return addCompositionProject(request, buildComposePlan(request, client.resolvedVersion, items), { base: registry, getItem })
}

/** Explicit new-project materialization. Existing destinations always reject;
 * no installation, app execution or synthesis is performed here. */
export async function applyCompositionProject(plan: ComposePlan, destination: string): Promise<void> {
  if (!plan.project) throw new Error("Composition has no grounded project output; resolve the reported gaps before apply.")
  const root = resolve(destination)
  const paths = new Set<string>()
  for (const file of plan.project.files) {
    const target = resolve(root, file.path)
    if (!file.path || file.path.includes("\\") || file.path.includes("\0") || file.path.split("/").some(part => !part || part === "." || part === "..") || !target.startsWith(root + sep) || paths.has(target)) throw new Error("Composition project contains unsafe or duplicate paths.")
    paths.add(target)
  }
  await mkdir(root, { mode: 0o700 }) // exclusive; parent must already exist
  const identity = await lstat(root)
  for (const file of plan.project.files) {
    const current = await lstat(root)
    if (current.isSymbolicLink() || current.ino !== identity.ino || current.dev !== identity.dev) throw new Error("Composition destination changed during apply. Inspect the partially written new directory.")
    const target = resolve(root, file.path)
    await mkdir(dirname(target), { recursive: true })
    if (await realpath(dirname(target)) !== dirname(target)) throw new Error("Composition destination contains a linked parent. Inspect the partially written new directory.")
    await writeFile(target, file.content, { flag: "wx" })
  }
}
