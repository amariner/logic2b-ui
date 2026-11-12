import { createHash } from "node:crypto"
import { readFile, readdir, rm, mkdir, writeFile } from "node:fs/promises"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const appDir = dirname(dirname(fileURLToPath(import.meta.url)))
const docsDir = join(appDir, "src/content/docs")
const docsEsDir = join(appDir, "src/content/docs-es")
const outputDir = join(appDir, "public/og/docs")
const registryIndexPath = join(appDir, "public/r/index.json")
const width = 1200
const height = 630

// Logic2B identity: white canvas, flat grey surfaces, black ink, one blue
// accent. Sections differ by label only, never by colour.
const brand = {
  ink: "#000000",
  ink2: "#5e5e5e",
  ink3: "#8a8a8a",
  s0: "#f4f4f4",
  s1: "#ececec",
  s2: "#e4e4e4",
  accent: "#1466ff",
}
const logicMark =
  '<path d="M4 16L4 6Q4 4 6 4L14 4Q16 4 16 6L16 16A16 16 0 0 0 32 32L42 32Q44 32 44 34L44 42Q44 44 42 44L32 44A28 28 0 0 1 4 16Z"/><circle cx="32" cy="16" r="8"/>'

const palettes = {
  agents: { label: "Agents" },
  benchmarks: { label: "Benchmarks" },
  components: { label: "Components" },
  foundations: { label: "Foundations" },
  integration: { label: "Integration" },
}

function xml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function scalar(source, key, file) {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))
  if (!match) throw new Error(`${relative(appDir, file)} is missing ${key}`)
  const value = match[1].trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

async function docsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await docsFiles(path)))
    else if (entry.name.endsWith(".mdx")) files.push(path)
  }
  return files
}

function paletteFor(id) {
  if (id.startsWith("components/")) return palettes.components
  if (id === "agent-benchmarks" || id === "llms") return palettes.agents
  if (id === "benchmarks") return palettes.benchmarks
  if (id === "integration-paths" || id === "backend") return palettes.integration
  return palettes.foundations
}

function splitLine(text, maxUnits) {
  const words = text.split(/\s+/)
  const lines = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxUnits && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function clampLines(text, maxUnits, maxLines) {
  const lines = splitLine(text, maxUnits)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[.,;:]?$/, "")}…`
  return kept
}

function textLines(lines, x, y, lineHeight, attrs) {
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" ${attrs}>${xml(line)}</text>`)
    .join("")
}

function cardSvg(page) {
  const palette = paletteFor(page.id)
  const title = clampLines(page.title, 25, 2)
  const description = clampLines(page.description, 54, 3)
  const route = page.id === "index"
    ? "/docs"
    : page.id === "es/index"
      ? "/es/docs"
      : page.id.startsWith("es/")
        ? `/es/docs/${page.id.slice("es/".length)}`
        : `/docs/${page.id}`
  const titleY = title.length === 1 ? 264 : 230
  const descriptionY = titleY + title.length * 62 + 34

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect x="24" y="24" width="1152" height="582" rx="24" fill="${brand.s0}"/>

  <g font-family="'Inter Tight', Inter, ui-sans-serif, system-ui, sans-serif">
    <g transform="translate(76 72)">
      <rect width="44" height="44" rx="11" fill="#0b0b0b"/>
      <g transform="translate(7.04 7.04) scale(0.62)" fill="#ffffff">${logicMark}</g>
      <text x="60" y="31" fill="${brand.ink}" font-size="26" font-weight="600" letter-spacing=".2">Logic2B<tspan fill="${brand.ink3}" dx="8">UI</tspan></text>
    </g>

    <g transform="translate(76 154)">
      <rect width="${Math.max(126, palette.label.length * 12 + 44)}" height="38" rx="12" fill="#ffffff"/>
      <circle cx="20" cy="19" r="5" fill="${brand.accent}"/>
      <text x="34" y="25" fill="${brand.ink2}" font-size="16" font-weight="500">${xml(palette.label)}</text>
    </g>

    ${textLines(title, 76, titleY, 62, `fill="${brand.ink}" font-size="54" font-weight="500" letter-spacing="-2"`)}
    ${textLines(description, 76, descriptionY, 34, `fill="${brand.ink2}" font-size="24" font-weight="400"`)}

    <g transform="translate(858 130)">
      <rect width="262" height="164" rx="16" fill="#ffffff"/>
      <rect x="22" y="24" width="70" height="10" rx="5" fill="${brand.accent}"/>
      <rect x="22" y="51" width="164" height="8" rx="4" fill="${brand.s2}"/>
      <rect x="22" y="70" width="128" height="8" rx="4" fill="${brand.s1}"/>
      <rect x="22" y="111" width="93" height="32" rx="10" fill="${brand.ink}"/>
      <rect x="128" y="111" width="72" height="32" rx="10" fill="${brand.s0}"/>
      <circle cx="228" cy="127" r="16" fill="${brand.s1}"/>
    </g>
    <g transform="translate(814 322)">
      <rect width="262" height="164" rx="16" fill="#0b0b0b"/>
      <rect x="22" y="24" width="70" height="10" rx="5" fill="#ffffff"/>
      <rect x="22" y="51" width="164" height="8" rx="4" fill="#3a3a3a"/>
      <rect x="22" y="70" width="128" height="8" rx="4" fill="#2a2a2a"/>
      <rect x="22" y="111" width="93" height="32" rx="10" fill="${brand.accent}"/>
      <rect x="128" y="111" width="72" height="32" rx="10" fill="#1d1d1d"/>
      <circle cx="228" cy="127" r="16" fill="#1d1d1d"/>
    </g>

    <text x="76" y="557" fill="${brand.ink3}" font-size="18" font-weight="500">${xml(route)}</text>
    <text x="1120" y="557" text-anchor="end" fill="${brand.ink}" font-size="18" font-weight="500">ui.logic2b.com</text>
  </g>
</svg>`
}

async function main() {
  const files = [
    ...(await docsFiles(docsDir)).map((file) => ({ file, prefix: "" })),
    ...(await docsFiles(docsEsDir)).map((file) => ({ file, prefix: "es" })),
  ].sort((a, b) => a.file.localeCompare(b.file))
  const registryIndex = JSON.parse(await readFile(registryIndexPath, "utf8"))
  const componentCount = registryIndex.filter(
    (item) => item.type === "registry:ui",
  ).length
  const pages = []
  for (const { file, prefix } of files) {
    const source = await readFile(file, "utf8")
    const root = prefix === "es" ? docsEsDir : docsDir
    const localId = relative(root, file).split(sep).join("/").replace(/\.mdx$/, "")
    const id = prefix ? `${prefix}/${localId}` : localId
    pages.push({
      id,
      title: scalar(source, "title", file),
      description: scalar(source, "description", file),
    })
  }
  pages.push({
    id: "components/index",
    title: "Components",
    description: `${componentCount} beautifully designed components you can copy and paste into your apps.`,
  })
  pages.sort((a, b) => a.id.localeCompare(b.id))

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  const manifest = { version: 1, width, height, pages: [] }
  for (const page of pages) {
    const output = join(outputDir, `${page.id}.png`)
    await mkdir(dirname(output), { recursive: true })
    const png = await sharp(Buffer.from(cardSvg(page)))
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
        quality: 90,
        dither: 0,
        effort: 10,
      })
      .toBuffer()
    await writeFile(output, png)
    manifest.pages.push({
      id: page.id,
      title: page.title,
      image: `/og/docs/${page.id}.png`,
      bytes: png.byteLength,
      sha256: createHash("sha256").update(png).digest("hex"),
    })
  }

  await writeFile(
    join(outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  const total = manifest.pages.reduce((sum, page) => sum + page.bytes, 0)
  console.log(`Generated ${pages.length} docs OG images (${(total / 1024).toFixed(1)} KiB)`)
}

await main()
