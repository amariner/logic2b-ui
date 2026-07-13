/**
 * Theme data + serialization for the /create configurator.
 *
 * The data itself — base scales, accents, chart ramps, radii, fonts, the
 * preset codec and the CSS emitters — lives in @logic2b/tokens, the single
 * source of truth shared with the CLI preset engine and the MCP theme tools.
 * This module re-exports it and adds the web-only generators (DESIGN.md,
 * components.json).
 */

import {
  ACCENTS,
  BASE_COLORS,
  FONTS,
  RADII,
  encodePreset,
  parseCustomKey,
  resolveTokens,
  type ThemeConfig,
} from "@logic2b/tokens"

export {
  ACCENTS,
  BASE_COLORS,
  CHARTS,
  CUSTOM_KEY_RE,
  DEFAULT_CONFIG,
  FONTS,
  RADII,
  applyPresetToCss,
  buildCss,
  customAccent,
  customChart,
  customKey,
  decodePreset,
  encodePreset,
  parseCustomKey,
  presetDeclarations,
  resolveTokens,
  sidebarTokens,
  type AccentColor,
  type BaseColor,
  type ChartPalette,
  type ChartRamp,
  type Mode,
  type ThemeConfig,
  type TokenSet,
} from "@logic2b/tokens"

/** DESIGN.md — a style-reference document generated from the config, in the
    format coding agents consume. Drop it in a repo so LLMs follow the theme. */
export function buildDesignMd(cfg: ThemeConfig): string {
  const radius = RADII[cfg.radius] ?? RADII.default
  const font = FONTS[cfg.font] ?? FONTS.sans
  const heading = FONTS[cfg.heading] ?? FONTS.sans
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
npx logic2b@latest init --preset ${preset}
\`\`\`

Running \`init\` writes \`components.json\` and the CSS for these exact tokens
into your global stylesheet.
`
}

/** components.json the CLI understands. */
export function buildComponentsJson(cfg: ThemeConfig): string {
  return JSON.stringify(
    {
      $schema: "https://ui.logic2b.com/schema.json",
      style: "default",
      tailwind: { config: "", css: "src/styles/global.css", baseColor: cfg.base, cssVariables: true },
      aliases: { components: "@/components", ui: "@/components/ui", lib: "@/lib", hooks: "@/hooks" },
      iconLibrary: "lucide",
    },
    null,
    2,
  )
}
