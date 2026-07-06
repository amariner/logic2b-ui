/**
 * Generates apps/web/public/r/<name>.json from registry.ts.
 * Output follows the shadcn registry-item schema so existing tools/agents
 * that speak "shadcn registry" can consume logic2b directly.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

import { registry } from "../registry.ts"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = resolve(root, "../../apps/web/public/r")

const registryItemSchema = z.object({
  $schema: z.string(),
  name: z.string().min(1),
  type: z.string(),
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
    .min(1),
})

await mkdir(outDir, { recursive: true })

const index: { name: string; type: string; description: string }[] = []

for (const item of registry) {
  const files = await Promise.all(
    item.files.map(async (file) => {
      // Consumers import from "@/registry/..."; installed files live in "@/..."
      const content = (await readFile(join(root, file.path), "utf8")).replaceAll(
        "@/registry/",
        "@/"
      )
      return { path: file.path.replace(/^src\//, ""), type: file.type, content }
    })
  )

  const payload = registryItemSchema.parse({
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: item.name,
    type: item.type,
    description: item.description,
    dependencies: item.dependencies,
    registryDependencies: item.registryDependencies,
    files,
  })

  await writeFile(join(outDir, `${item.name}.json`), JSON.stringify(payload, null, 2))
  index.push({ name: item.name, type: item.type, description: item.description })
}

await writeFile(join(outDir, "index.json"), JSON.stringify(index, null, 2))
console.log(`✓ registry built: ${registry.length} items → ${outDir}`)
