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

const palettes = {
  agents: { label: "Agents", accent: "#34d399", soft: "#064e3b" },
  benchmarks: { label: "Benchmarks", accent: "#22d3ee", soft: "#164e63" },
  components: { label: "Components", accent: "#a78bfa", soft: "#4c1d95" },
  foundations: { label: "Foundations", accent: "#fbbf24", soft: "#78350f" },
  integration: { label: "Integration", accent: "#60a5fa", soft: "#1e3a8a" },
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
  <defs>
    <radialGradient id="glow" cx="82%" cy="20%" r="68%">
      <stop offset="0" stop-color="${palette.soft}" stop-opacity=".72"/>
      <stop offset="1" stop-color="#09090b" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#27272a" stroke-width="1" opacity=".55"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#09090b"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="32" y="32" width="1136" height="566" rx="28" fill="#09090b" fill-opacity=".7" stroke="#3f3f46"/>

  <g font-family="Inter, ui-sans-serif, system-ui, sans-serif">
    <g transform="translate(76 72)">
      <rect width="42" height="42" rx="12" fill="#fafafa"/>
      <path d="M12 12h8v18h11v6H12z" fill="#09090b"/>
      <text x="58" y="31" fill="#fafafa" font-size="26" font-weight="750" letter-spacing="-.7">logic2b/ui</text>
    </g>

    <g transform="translate(76 154)">
      <rect width="${Math.max(126, palette.label.length * 12 + 44)}" height="38" rx="19" fill="${palette.soft}" stroke="${palette.accent}" stroke-opacity=".65"/>
      <circle cx="20" cy="19" r="5" fill="${palette.accent}"/>
      <text x="34" y="25" fill="#fafafa" font-size="16" font-weight="650">${xml(palette.label)}</text>
    </g>

    ${textLines(title, 76, titleY, 62, 'fill="#fafafa" font-size="54" font-weight="760" letter-spacing="-2.3"')}
    ${textLines(description, 76, descriptionY, 34, 'fill="#a1a1aa" font-size="24" font-weight="430"')}

    <g transform="translate(858 130)">
      <rect width="262" height="164" rx="20" fill="#18181b" stroke="#52525b"/>
      <rect x="22" y="24" width="70" height="10" rx="5" fill="${palette.accent}"/>
      <rect x="22" y="51" width="164" height="8" rx="4" fill="#71717a"/>
      <rect x="22" y="70" width="128" height="8" rx="4" fill="#3f3f46"/>
      <rect x="22" y="111" width="93" height="32" rx="9" fill="#fafafa"/>
      <rect x="128" y="111" width="72" height="32" rx="9" fill="#27272a" stroke="#52525b"/>
      <circle cx="228" cy="127" r="16" fill="${palette.soft}" stroke="${palette.accent}"/>
    </g>
    <g transform="translate(814 322)">
      <rect width="262" height="164" rx="20" fill="#fafafa" stroke="#d4d4d8"/>
      <rect x="22" y="24" width="70" height="10" rx="5" fill="${palette.soft}"/>
      <rect x="22" y="51" width="164" height="8" rx="4" fill="#a1a1aa"/>
      <rect x="22" y="70" width="128" height="8" rx="4" fill="#d4d4d8"/>
      <rect x="22" y="111" width="93" height="32" rx="9" fill="#18181b"/>
      <rect x="128" y="111" width="72" height="32" rx="9" fill="#ffffff" stroke="#d4d4d8"/>
      <circle cx="228" cy="127" r="16" fill="#ffffff" stroke="${palette.soft}" stroke-width="2"/>
    </g>
    <path d="M1092 306a28 28 0 0 1 28 28" fill="none" stroke="${palette.accent}" stroke-width="3" stroke-linecap="round"/>

    <text x="76" y="557" fill="#71717a" font-size="18" font-weight="550">${xml(route)}</text>
    <text x="1120" y="557" text-anchor="end" fill="${palette.accent}" font-size="18" font-weight="650">copy · own · compose</text>
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
