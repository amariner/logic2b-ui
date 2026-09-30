import { open } from "node:fs/promises"
import { buildComposePlan, COMPOSE_LIMITS, loadComposeItems, validateComposeRequest, type ComposePlan } from "@logic2b/scaffold/compose"
import { REGISTRY_VERSION } from "@logic2b/registry/version"
import { createRegistryClient, DEFAULT_REGISTRY, type FetchLike } from "./lib.ts"

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
  const items = await loadComposeItems(request, client.index, name => client.getItem(name))
  return buildComposePlan(request, client.resolvedVersion, items)
}
