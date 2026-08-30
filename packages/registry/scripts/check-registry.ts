/**
 * Registry integrity check (used as the package `lint`). Fails loudly if:
 *  - a registryDependencies entry points at a name that doesn't exist
 *  - a declared source file is missing on disk
 *  - a component references a `@/registry/*` path with no matching item/file
 *  - two items share a name
 * Cheap to run, and it catches the mistakes a type-check can't.
 */
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { isDeepStrictEqual } from "node:util"

import { registry } from "../registry.ts"
import { ACCESSIBILITY_CONTRACTS } from "../accessibility.ts"
import { API_CONTRACTS } from "../api.generated.ts"
import { itemChangelog, REGISTRY_RELEASES } from "../releases.ts"
import { REGISTRY_VERSION } from "../version.ts"
import { apiGeneratedPath, generatedApiSource } from "./generate-api.ts"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const publicRegistry = resolve(root, "../../apps/web/public/r")
const errors: string[] = []

const names = new Set(registry.map((i) => i.name))
const uiItems = registry.filter((item) => item.type === "registry:ui")

const committedApi = await readFile(apiGeneratedPath, "utf8").catch(() => "")
if (committedApi !== (await generatedApiSource())) {
  errors.push("generated API contracts drifted; run pnpm generate:api")
}
if (Object.keys(API_CONTRACTS).length !== uiItems.length) {
  errors.push("generated API contracts do not cover every UI item")
}

for (const item of registry) {
  const contract = item.accessibility
  if (item.type === "registry:ui" && !contract) {
    errors.push(`UI item "${item.name}" has no accessibility contract`)
  }
  if (item.type !== "registry:ui" && contract) {
    errors.push(`non-UI item "${item.name}" unexpectedly has an accessibility contract`)
  }
  if (!contract) continue
  if (!contract.pattern.trim() || contract.aria.length === 0 || contract.consumer.length === 0) {
    errors.push(`"${item.name}" has an incomplete accessibility contract`)
  }
  for (const interaction of contract.keyboard) {
    if (interaction.keys.length === 0 || !interaction.action.trim()) {
      errors.push(`"${item.name}" has an incomplete keyboard interaction`)
    }
  }
}
for (const item of registry) {
  const api = item.api
  if (item.type === "registry:ui" && !api) {
    errors.push(`UI item "${item.name}" has no generated API contract`)
  }
  if (item.type !== "registry:ui" && api) {
    errors.push(`non-UI item "${item.name}" unexpectedly has an API contract`)
  }
  if (!api) continue
  if (api.source !== item.files?.find((file) => file.type === "registry:ui")?.path) {
    errors.push(`"${item.name}" API source does not match its registry file`)
  }
  if (api.exports.length === 0) {
    errors.push(`"${item.name}" API contract has no public exports`)
  }
  const exportNames = new Set<string>()
  for (const exported of api.exports) {
    if (exportNames.has(exported.name)) {
      errors.push(`"${item.name}" API repeats export "${exported.name}"`)
    }
    exportNames.add(exported.name)
    const propNames = new Set<string>()
    for (const prop of exported.props ?? []) {
      if (!prop.type.trim()) {
        errors.push(`"${item.name}" ${exported.name}.${prop.name} has no type`)
      }
      if (propNames.has(prop.name)) {
        errors.push(`"${item.name}" ${exported.name} repeats prop "${prop.name}"`)
      }
      if (prop.required && prop.default !== undefined) {
        errors.push(`"${item.name}" ${exported.name}.${prop.name} is required with a default`)
      }
      propNames.add(prop.name)
    }
  }
}
for (const name of Object.keys(ACCESSIBILITY_CONTRACTS)) {
  const item = registry.find((candidate) => candidate.name === name)
  if (!item) errors.push(`accessibility contract references unknown item "${name}"`)
  else if (item.type !== "registry:ui") {
    errors.push(`accessibility contract "${name}" does not target a UI item`)
  }
}

const releaseVersions = new Set<string>()
for (const release of REGISTRY_RELEASES) {
  if (releaseVersions.has(release.version)) {
    errors.push(`duplicate registry release: "${release.version}"`)
  }
  releaseVersions.add(release.version)
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(release.version)) {
    errors.push(`registry release is not semver: "${release.version}"`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(release.releasedAt)) {
    errors.push(`registry release has invalid date: "${release.releasedAt}"`)
  }
  for (const change of release.changes) {
    if (change.items !== "*") {
      for (const name of change.items) {
        if (!names.has(name)) {
          errors.push(`release ${release.version} references unknown item "${name}"`)
        }
      }
    }
  }
}
if (REGISTRY_RELEASES.at(-1)?.version !== REGISTRY_VERSION) {
  errors.push("REGISTRY_VERSION must match the last append-only release")
}

// Duplicate names
const seen = new Set<string>()
for (const item of registry) {
  if (itemChangelog(item.name).length === 0) {
    errors.push(`"${item.name}" has no machine-readable changelog entry`)
  }
  if (seen.has(item.name)) errors.push(`duplicate item name: "${item.name}"`)
  seen.add(item.name)
}

// Generated version/integrity contract stays in lock-step with the source.
const generatedIndexPath = join(publicRegistry, "index.json")
const generatedManifestPath = join(
  publicRegistry,
  "versions",
  `${REGISTRY_VERSION}.json`,
)
if (!existsSync(generatedIndexPath) || !existsSync(generatedManifestPath)) {
  errors.push("generated registry version manifests are missing; run pnpm build")
} else {
  const generatedIndexText = await readFile(generatedIndexPath, "utf8")
  const generatedIndex = JSON.parse(generatedIndexText) as {
    name: string
    integrity?: string
    content?: string
    changelog?: string
    accessibility?: string
    api?: string
  }[]
  if (generatedIndexText !== JSON.stringify(generatedIndex)) {
    errors.push("generated active registry index is not compact JSON")
  }
  const generatedNames = new Set(generatedIndex.map((entry) => entry.name))
  if (generatedNames.size !== names.size || [...names].some((name) => !generatedNames.has(name))) {
    errors.push("generated registry index names do not match registry.ts")
  }
  for (const entry of generatedIndex) {
    const payloadPath = join(publicRegistry, `${entry.name}.json`)
    if (!existsSync(payloadPath)) {
      errors.push(`generated payload missing for "${entry.name}"`)
      continue
    }
    const payload = await readFile(payloadPath, "utf8")
    const parsedPayload = JSON.parse(payload) as {
      accessibility?: unknown
      api?: unknown
    }
    if (payload !== JSON.stringify(parsedPayload)) {
      errors.push(`generated active payload is not compact for "${entry.name}"`)
    }
    const sourceItem = registry.find((item) => item.name === entry.name)
    if (sourceItem?.accessibility) {
      if (entry.accessibility !== `/r/${entry.name}.json#accessibility`) {
        errors.push(`generated accessibility reference drift for "${entry.name}"`)
      }
      if (!parsedPayload.accessibility) {
        errors.push(`generated accessibility payload missing for "${entry.name}"`)
      }
    }
    if (sourceItem?.api) {
      if (entry.api !== `/r/${entry.name}.json#api`) {
        errors.push(`generated API reference drift for "${entry.name}"`)
      }
      if (!parsedPayload.api) {
        errors.push(`generated API payload missing for "${entry.name}"`)
      }
    }
    const contentPath = entry.content?.startsWith("/r/")
      ? join(publicRegistry, entry.content.slice(3))
      : ""
    if (!contentPath || !existsSync(contentPath)) {
      errors.push(`content-addressed payload missing for "${entry.name}"`)
    } else {
      const immutablePayload = await readFile(contentPath, "utf8")
      const hash = createHash("sha256").update(immutablePayload).digest()
      const expectedIntegrity = `sha256-${hash.toString("base64")}`
      if (entry.integrity !== expectedIntegrity) {
        errors.push(`generated integrity drift for "${entry.name}"`)
      }
      if (!isDeepStrictEqual(JSON.parse(immutablePayload), parsedPayload)) {
        errors.push(`active and content-addressed payload semantics differ for "${entry.name}"`)
      }
    }
    const changelogPath = entry.changelog?.startsWith("/r/")
      ? join(publicRegistry, entry.changelog.slice(3))
      : ""
    if (!changelogPath || !existsSync(changelogPath)) {
      errors.push(`generated changelog missing for "${entry.name}"`)
    }
  }
  const manifest = JSON.parse(
    await readFile(generatedManifestPath, "utf8"),
  ) as { version?: string; items?: unknown[] }
  if (
    manifest.version !== REGISTRY_VERSION ||
    manifest.items?.length !== registry.length
  ) {
    errors.push(`generated manifest ${REGISTRY_VERSION} is malformed or stale`)
  }
}

for (const item of registry) {
  // registryDependencies resolve
  for (const dep of item.registryDependencies ?? []) {
    if (!names.has(dep)) {
      errors.push(`"${item.name}" depends on "${dep}", which is not in the registry`)
    }
  }
  // declared files exist
  for (const file of item.files ?? []) {
    if (!existsSync(join(root, file.path))) {
      errors.push(`"${item.name}" declares missing file: ${file.path}`)
    }
  }
}

// Every @/registry/{ui,hooks,lib,charts} import in a shipped file must map to an item file.
const allFilePaths = new Set(
  registry.flatMap((i) => (i.files ?? []).map((f) => f.path.replace(/^src\//, "")))
)
const importRe = /@\/registry\/(ui|hooks|lib|charts)\/([a-z0-9-]+)/g
for (const item of registry) {
  for (const file of item.files ?? []) {
    const content = await readFile(join(root, file.path), "utf8")
    for (const m of content.matchAll(importRe)) {
      const rel = `${m[1]}/${m[2]}.${m[1] === "hooks" || m[1] === "lib" ? "ts" : "tsx"}`
      if (!allFilePaths.has(rel)) {
        errors.push(`"${item.name}" imports ${m[0]} but no item ships ${rel}`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`✗ registry check failed (${errors.length}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`✓ registry check passed: ${registry.length} items, all deps & files resolve`)
