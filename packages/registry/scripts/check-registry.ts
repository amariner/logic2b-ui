/**
 * Registry integrity check (used as the package `lint`). Fails loudly if:
 *  - a registryDependencies entry points at a name that doesn't exist
 *  - a declared source file is missing on disk
 *  - a component references a `@/registry/*` path with no matching item/file
 *  - two items share a name
 * Cheap to run, and it catches the mistakes a type-check can't.
 */
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { registry } from "../registry.ts"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const errors: string[] = []

const names = new Set(registry.map((i) => i.name))

// Duplicate names
const seen = new Set<string>()
for (const item of registry) {
  if (seen.has(item.name)) errors.push(`duplicate item name: "${item.name}"`)
  seen.add(item.name)
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

// Every @/registry/{ui,hooks,lib} import in a shipped file must map to an item file.
const allFilePaths = new Set(
  registry.flatMap((i) => (i.files ?? []).map((f) => f.path.replace(/^src\//, "")))
)
const importRe = /@\/registry\/(ui|hooks|lib)\/([a-z0-9-]+)/g
for (const item of registry) {
  for (const file of item.files ?? []) {
    const content = await readFile(join(root, file.path), "utf8")
    for (const m of content.matchAll(importRe)) {
      const rel = `${m[1]}/${m[2]}.${m[1] === "ui" ? "tsx" : "ts"}`
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
