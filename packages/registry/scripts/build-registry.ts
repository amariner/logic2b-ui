/**
 * Generates apps/web/public/r/<name>.json from registry.ts.
 * Output follows the shadcn registry-item schema so existing tools/agents
 * that speak "shadcn registry" can consume logic2b directly.
 */
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

import { registry } from "../registry.ts"
import {
  itemChangelog,
  itemVersion,
  REGISTRY_RELEASES,
} from "../releases.ts"
import {
  REGISTRY_CHANNEL,
  REGISTRY_RELEASED_AT,
  REGISTRY_VERSION,
} from "../version.ts"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = resolve(root, "../../apps/web/public/r")
const contentDir = join(outDir, "content")
const changelogDir = join(outDir, "changelog")
const versionsDir = join(outDir, "versions")

const cssVarsSchema = z
  .object({
    theme: z.record(z.string(), z.string()).optional(),
    light: z.record(z.string(), z.string()).optional(),
    dark: z.record(z.string(), z.string()).optional(),
  })
  .optional()

const accessibilitySchema = z
  .object({
    support: z.enum(["native", "primitive", "authored", "consumer"]),
    pattern: z.string().min(1),
    primitive: z.string().min(1).optional(),
    keyboard: z.array(
      z.object({
        keys: z.array(z.string().min(1)).min(1),
        action: z.string().min(1),
      })
    ),
    aria: z.array(z.string().min(1)).min(1),
    consumer: z.array(z.string().min(1)).min(1),
    limitations: z.array(z.string().min(1)).min(1).optional(),
  })
  .optional()

const apiSchema = z
  .object({
    source: z.string().min(1),
    exports: z.array(
      z.object({
        name: z.string().min(1),
        kind: z.enum(["component", "hook", "type", "utility"]),
        description: z.string().min(1).optional(),
        propsType: z.string().min(1).optional(),
        props: z
          .array(
            z.object({
              name: z.string().min(1),
              type: z.string().min(1),
              required: z.boolean(),
              default: z.string().optional(),
              description: z.string().min(1).optional(),
            }),
          )
          .optional(),
        aliasOf: z.string().min(1).optional(),
        definition: z.string().min(1).optional(),
        signature: z.string().min(1).optional(),
      }),
    ).min(1),
  })
  .optional()

const registryItemSchema = z.object({
  $schema: z.string(),
  name: z.string().min(1),
  type: z.string(),
  title: z.string().optional(),
  description: z.string().min(1),
  dependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z
    .array(
      z.object({
        path: z.string(),
        type: z.string(),
        content: z.string().min(1),
      })
    )
    .optional(),
  cssVars: cssVarsSchema,
  css: z.record(z.string(), z.unknown()).optional(),
  categories: z.array(z.string()).optional(),
  docs: z.string().optional(),
  accessibility: accessibilitySchema,
  api: apiSchema,
})

await Promise.all(
  [outDir, contentDir, changelogDir, versionsDir].map((dir) =>
    mkdir(dir, { recursive: true })
  )
)

interface IndexEntry {
  name: string
  type: string
  title?: string
  description: string
  categories?: string[]
  version: string
  registryVersion: string
  integrity: string
  content: string
  changelog: string
  accessibility?: string
  api?: string
}

const index: IndexEntry[] = []
const payloads: {
  name: string
  activeSerialized: string
  immutableSerialized: string
  digest: string
}[] = []

for (const item of registry) {
  const files = await Promise.all(
    (item.files ?? []).map(async (file) => {
      // Consumers import from "@/registry/...". Installed files land where the
      // CLI's targetPath() + components.json aliases put them: ui/ under
      // "components/ui", blocks/ under "components/<block>", hooks/ and lib/
      // as-is under their aliases.
      const content = (await readFile(join(root, file.path), "utf8"))
        .replaceAll("@/registry/ui/", "@/components/ui/")
        .replaceAll("@/registry/blocks/", "@/components/")
        .replaceAll("@/registry/charts/", "@/components/charts/")
        .replaceAll("@/registry/hooks/", "@/hooks/")
        .replaceAll("@/registry/lib/", "@/lib/")
      return { path: file.path.replace(/^src\//, ""), type: file.type, content }
    })
  )

  const payload = registryItemSchema.parse({
    $schema: "https://ui.logic2b.com/schema/registry-item.json",
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
    registryDependencies: item.registryDependencies,
    files: files.length > 0 ? files : undefined,
    cssVars: item.cssVars,
    css: item.css,
    categories: item.categories,
    docs: item.docs,
    accessibility: item.accessibility,
    api: item.api,
  })

  // The unversioned endpoint is a mutable delivery mirror, so keep it compact.
  // The content-addressed artifact is the byte-stable integrity contract and
  // intentionally retains the established pretty-printed representation.
  const activeSerialized = JSON.stringify(payload)
  const immutableSerialized = JSON.stringify(payload, null, 2)
  const hash = createHash("sha256").update(immutableSerialized).digest()
  const digest = hash.toString("hex")
  const integrity = `sha256-${hash.toString("base64")}`
  payloads.push({
    name: item.name,
    activeSerialized,
    immutableSerialized,
    digest,
  })
  index.push({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    categories: item.categories,
    version: itemVersion(item.name),
    registryVersion: REGISTRY_VERSION,
    integrity,
    content: `/r/content/${digest}.json`,
    changelog: `/r/changelog/${item.name}.json`,
    ...(item.accessibility
      ? { accessibility: `/r/${item.name}.json#accessibility` }
      : {}),
    ...(item.api ? { api: `/r/${item.name}.json#api` } : {}),
  })
}

const versionManifest = {
  $schema: "https://ui.logic2b.com/schema/registry-version.json",
  schemaVersion: 1,
  version: REGISTRY_VERSION,
  channel: REGISTRY_CHANNEL,
  releasedAt: REGISTRY_RELEASED_AT,
  items: index,
}
const versionManifestPath = join(versionsDir, `${REGISTRY_VERSION}.json`)
const serializedVersionManifest = JSON.stringify(versionManifest, null, 2)

// A version URL is an immutable promise. Refuse to rewrite it when any item,
// dependency or metadata changed without a registry version bump.
if (existsSync(versionManifestPath)) {
  const published = await readFile(versionManifestPath, "utf8")
  if (published !== serializedVersionManifest) {
    throw new Error(
      `Registry version ${REGISTRY_VERSION} is already snapshotted with different content. ` +
        "Append a release and bump REGISTRY_VERSION before rebuilding."
    )
  }
}

for (const release of REGISTRY_RELEASES) {
  const releasePath = join(versionsDir, `${release.version}.json`)
  if (release.version !== REGISTRY_VERSION && !existsSync(releasePath)) {
    throw new Error(
      `Historical registry manifest ${release.version} is missing at ${releasePath}.`
    )
  }
}

for (const payload of payloads) {
  await writeFile(join(outDir, `${payload.name}.json`), payload.activeSerialized)
  const contentPath = join(contentDir, `${payload.digest}.json`)
  if (existsSync(contentPath)) {
    const existing = await readFile(contentPath, "utf8")
    if (existing !== payload.immutableSerialized) {
      throw new Error(`SHA-256 collision or corrupted content artifact: ${contentPath}`)
    }
  } else {
    await writeFile(contentPath, payload.immutableSerialized)
  }
  await writeFile(
    join(changelogDir, `${payload.name}.json`),
    JSON.stringify(
      {
        $schema: "https://ui.logic2b.com/schema/registry-changelog.json",
        schemaVersion: 1,
        name: payload.name,
        currentVersion: itemVersion(payload.name),
        changes: itemChangelog(payload.name),
      },
    )
  )
}

await writeFile(join(outDir, "index.json"), JSON.stringify(index))
await writeFile(versionManifestPath, serializedVersionManifest)
await writeFile(
  join(outDir, "versions.json"),
  JSON.stringify(
    {
      $schema: "https://ui.logic2b.com/schema/registry-versions.json",
      schemaVersion: 1,
      latest: REGISTRY_VERSION,
      channels: Object.fromEntries(
        REGISTRY_RELEASES.map((release) => [release.channel, release.version])
      ),
      versions: [...REGISTRY_RELEASES]
        .reverse()
        .map(({ version, channel, releasedAt }) => ({
          version,
          channel,
          releasedAt,
          manifest: `/r/versions/${version}.json`,
        })),
    }
  )
)
console.log(
  `✓ registry ${REGISTRY_VERSION} built: ${registry.length} items, immutable manifest + changelogs → ${outDir}`
)
