import { CLI_PACKAGE_SELECTOR } from "./package-selectors.ts"
import { ACCENTS, BASE_COLORS, FONTS, ICON_LIBRARIES, RADII, encodePreset, parseCustomKey, resolveTokens, type ThemeConfig } from "@logic2b/tokens"

/** DESIGN.md — a style-reference document generated from the config, in the
    format coding agents consume. Drop it in a repo so LLMs follow the theme. */
export function buildDesignMd(cfg: ThemeConfig): string {
  const radius = RADII[cfg.radius] ?? RADII.default
  const font = FONTS[cfg.font] ?? FONTS.sans
  const heading = FONTS[cfg.heading] ?? FONTS.sans
  const iconLibrary = ICON_LIBRARIES[cfg.iconLibrary] ?? ICON_LIBRARIES.lucide
  const light = resolveTokens(cfg, "light")
  const dark = resolveTokens(cfg, "dark")
  const preset = encodePreset(cfg)
  const tokenRows = Object.keys(light.tokens)
    .map((k) => `| \`--${k}\` | \`${light.tokens[k]}\` | \`${dark.tokens[k]}\` |`)
    .join("\n")
  const chartRows = light.chart
    .map((c, i) => `| \`--chart-${i + 1}\` | \`${c}\` | \`${dark.chart[i]}\` |`)
    .join("\n")
  const baseLabel = BASE_COLORS[cfg.base]?.label ?? cfg.base
  const custom = parseCustomKey(cfg.theme)
  const accentLabel =
    ACCENTS[cfg.theme]?.label ??
    (custom ? `Custom (hue ${custom.hue}, chroma ${custom.chroma})` : cfg.theme)
  return `# Design Tokens — Style Reference
> generated with logic2b ui · preset \`${preset}\`

**Theme:** light + dark (toggled with the \`dark\` class on \`<html>\`)
**Base:** ${baseLabel} · **Accent:** ${accentLabel} · **Radius:** ${radius}
**Icons:** ${iconLibrary.label} (\`${iconLibrary.package}\`)

All colors are oklch CSS variables consumed through semantic utilities
(\`bg-primary\`, \`text-muted-foreground\`, \`border-border\`, …). Components
never hardcode colors — restyle everything by editing the tokens.

## Tokens — Semantic colors

| Token | Light | Dark |
|-------|-------|------|
${tokenRows}

## Tokens — Charts

| Token | Light | Dark |
|-------|-------|------|
${chartRows}

## Typography

- **Body (\`--font-sans\`):** ${font}
- **Headings (\`--font-heading\`):** ${heading}

## Shape

- **\`--radius\`:** ${radius} — every component derives its corner rounding
  (sm/md/lg/xl) from this single variable.

## Do

- Route every color through the semantic tokens above.
- Keep both modes first-class: check light and dark for every change.
- Use \`--font-heading\` for h1–h4 and \`--font-sans\` for body and UI text.

## Don't

- Don't hardcode hex/oklch values in components.
- Don't introduce accent colors beyond \`--primary\` and the chart ramp.
- Don't use heavy box-shadows for depth — prefer borders and surface steps.

## Install

\`\`\`bash
npx ${CLI_PACKAGE_SELECTOR} init --preset ${preset}
\`\`\`

Running \`init\` writes \`components.json\` and the CSS for these exact tokens
into your global stylesheet.
`
}
