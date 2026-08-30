import { readFile, readdir, stat } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const appDir = dirname(dirname(fileURLToPath(import.meta.url)))
const assetDir = join(appDir, "dist/client/_astro")
const registryDir = join(appDir, "public/r")
const tokenDir = join(appDir, "public/tokens/default")
const docsOgDir = join(appDir, "public/og/docs")

const budgets = {
  maxBrowserChunk: 350 * 1024,
  totalBrowserJs: 2 * 1024 * 1024,
  maxRegistryItem: 32 * 1024,
  registryIndex: 96 * 1024,
  activeRegistry: 750 * 1024,
  versionManifest: 128 * 1024,
  changelogs: 128 * 1024,
  portableTokens: 32 * 1024,
  maxDocsOgImage: 64 * 1024,
  totalDocsOgImages: 4 * 1024 * 1024,
}

async function filesIn(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await filesIn(path, predicate)))
    else if (predicate(entry.name)) files.push({ path, size: (await stat(path)).size })
  }
  return files
}

function kib(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

function largest(files) {
  return [...files].sort((a, b) => b.size - a.size)[0]
}

let jsFiles
let registryFiles
let tokenFiles
let docsOgFiles
try {
  jsFiles = await filesIn(assetDir, (name) => name.endsWith(".js"))
  registryFiles = await filesIn(registryDir, (name) => name.endsWith(".json"))
  tokenFiles = await filesIn(tokenDir, () => true)
  docsOgFiles = await filesIn(docsOgDir, (name) => name.endsWith(".png"))
} catch (error) {
  console.error("Bundle budgets need a built site. Run `pnpm build` first.")
  throw error
}

const indexPath = join(registryDir, "index.json")
const indexSize = (await stat(indexPath)).size
const rootRegistryFiles = registryFiles.filter(
  (file) => dirname(file.path) === registryDir
)
const currentItems = rootRegistryFiles.filter(
  (file) => !file.path.endsWith("/index.json") && !file.path.endsWith("/versions.json")
)
const activeRegistry = rootRegistryFiles.reduce((sum, file) => sum + file.size, 0)
const historicalFiles = registryFiles.filter(
  (file) => dirname(file.path) !== registryDir
)
const changelogFiles = registryFiles.filter((file) =>
  file.path.includes("/r/changelog/")
)
const changelogSize = changelogFiles.reduce((sum, file) => sum + file.size, 0)
const currentVersion = JSON.parse(
  await readFile(join(registryDir, "versions.json"), "utf8")
).latest
const currentVersionManifest = join(
  registryDir,
  "versions",
  `${currentVersion}.json`
)
const currentVersionManifestSize = (await stat(currentVersionManifest)).size
const totalJs = jsFiles.reduce((sum, file) => sum + file.size, 0)
const totalRegistryStorage = registryFiles.reduce((sum, file) => sum + file.size, 0)
const totalPortableTokens = tokenFiles.reduce((sum, file) => sum + file.size, 0)
const largestJs = largest(jsFiles)
const largestRegistry = largest(currentItems)
const largestDocsOg = largest(docsOgFiles)
const totalDocsOg = docsOgFiles.reduce((sum, file) => sum + file.size, 0)
const violations = []

if (largestJs.size > budgets.maxBrowserChunk) {
  violations.push(
    `largest browser chunk ${kib(largestJs.size)} > ${kib(budgets.maxBrowserChunk)} (${largestJs.path})`
  )
}
if (totalJs > budgets.totalBrowserJs) {
  violations.push(
    `total browser JS ${kib(totalJs)} > ${kib(budgets.totalBrowserJs)}`
  )
}
if (largestRegistry.size > budgets.maxRegistryItem) {
  violations.push(
    `largest registry item ${kib(largestRegistry.size)} > ${kib(budgets.maxRegistryItem)} (${largestRegistry.path})`
  )
}
if (indexSize > budgets.registryIndex) {
  violations.push(
    `registry index ${kib(indexSize)} > ${kib(budgets.registryIndex)}`
  )
}
if (activeRegistry > budgets.activeRegistry) {
  violations.push(
    `active registry ${kib(activeRegistry)} > ${kib(budgets.activeRegistry)}`
  )
}
if (currentVersionManifestSize > budgets.versionManifest) {
  violations.push(
    `version manifest ${kib(currentVersionManifestSize)} > ${kib(budgets.versionManifest)}`
  )
}
if (changelogSize > budgets.changelogs) {
  violations.push(
    `item changelogs ${kib(changelogSize)} > ${kib(budgets.changelogs)}`
  )
}
if (totalPortableTokens > budgets.portableTokens) {
  violations.push(
    `portable token exports ${kib(totalPortableTokens)} > ${kib(budgets.portableTokens)}`
  )
}
if (largestDocsOg.size > budgets.maxDocsOgImage) {
  violations.push(
    `largest docs OG image ${kib(largestDocsOg.size)} > ${kib(budgets.maxDocsOgImage)} (${largestDocsOg.path})`
  )
}
if (totalDocsOg > budgets.totalDocsOgImages) {
  violations.push(
    `docs OG images ${kib(totalDocsOg)} > ${kib(budgets.totalDocsOgImages)}`
  )
}

console.log(
  [
    `browser JS: ${jsFiles.length} chunks, ${kib(totalJs)} total, ${kib(largestJs.size)} largest`,
    `active registry: ${currentItems.length} items, ${kib(activeRegistry)} total, ${kib(largestRegistry.size)} largest, ${kib(indexSize)} index`,
    `version storage: ${historicalFiles.length} artifacts, ${kib(totalRegistryStorage - activeRegistry)} total, ${kib(currentVersionManifestSize)} current manifest, ${kib(changelogSize)} changelogs`,
    `portable tokens: ${tokenFiles.length} artifacts, ${kib(totalPortableTokens)} total`,
    `docs OG: ${docsOgFiles.length} images, ${kib(totalDocsOg)} total, ${kib(largestDocsOg.size)} largest`,
  ].join("\n")
)

if (violations.length) {
  console.error(`\nBundle budget exceeded:\n- ${violations.join("\n- ")}`)
  process.exitCode = 1
} else {
  console.log("✓ bundle budgets passed")
}
