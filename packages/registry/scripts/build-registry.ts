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

const cssVarsSchema = z
  .object({
    theme: z.record(z.string(), z.string()).optional(),
    light: z.record(z.string(), z.string()).optional(),
    dark: z.record(z.string(), z.string()).optional(),
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
})

await mkdir(outDir, { recursive: true })

const index: {
  name: string
  type: string
  title?: string
  description: string
  categories?: string[]
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
  })

  await writeFile(join(outDir, `${item.name}.json`), JSON.stringify(payload, null, 2))
  index.push({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    categories: item.categories,
  })
}

await writeFile(join(outDir, "index.json"), JSON.stringify(index, null, 2))
console.log(`✓ registry built: ${registry.length} items → ${outDir}`)
