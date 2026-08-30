import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const benchmarkDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const repoDir = resolve(benchmarkDir, "../..")
const generatedDir = resolve(benchmarkDir, "generated/registry")

const files = [
  ["blocks/stats.tsx", "src/blocks/stats-01-animated/stats.tsx"],
  ["hooks/use-count-up.ts", "src/hooks/use-count-up.ts"],
  ["lib/utils.ts", "src/lib/utils.ts"],
  ["ui/card.tsx", "src/ui/card.tsx"],
  ["ui/motion.tsx", "src/ui/motion.tsx"],
]

await rm(generatedDir, { recursive: true, force: true })

for (const [target, source] of files) {
  const targetPath = resolve(generatedDir, target)
  let contents = await readFile(
    resolve(repoDir, "packages/registry", source),
    "utf8"
  )
  contents = contents.replaceAll(/(["'])@\/registry\/([^"']+)\1/g, (_, quote, item) => {
    let rewritten = relative(dirname(targetPath), resolve(generatedDir, item))
    if (!rewritten.startsWith(".")) rewritten = `./${rewritten}`
    return `${quote}${rewritten}${quote}`
  })
  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, contents)
}

console.log(`Prepared ${files.length} registry source files in generated/registry`)
