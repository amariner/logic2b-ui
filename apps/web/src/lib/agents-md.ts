/**
 * AGENTS.md generator — the design system as executable context.
 *
 * DESIGN.md (themes.ts) documents the tokens; AGENTS.md documents the house
 * rules: which primitives exist, how the theme works, what an agent must not
 * hand-roll. Generated from the live theme config so the preset id and token
 * guidance always match the project, and from the registry index so the
 * inventory never goes stale.
 */

import registryIndex from "../../public/r/index.json"

import { encodePreset, FONTS, RADII, type ThemeConfig } from "@/lib/themes"

const SITE = "https://ui.logic2b.com"

interface IndexEntry {
  name: string
  type: string
  categories?: string[]
}

function inventory() {
  const items = registryIndex as IndexEntry[]
  const components = items.filter((i) => i.type === "registry:ui").map((i) => i.name)
  const blocks = items
    .filter((i) => i.type === "registry:block" && !i.categories?.includes("charts"))
    .map((i) => i.name)
  const charts = items
    .filter((i) => i.type === "registry:block" && i.categories?.includes("charts"))
    .map((i) => i.name)
  return { components, blocks, charts }
}

function wrapList(names: string[]): string {
  // One flowing paragraph of names — compact enough to keep in agent context.
  return names.map((n) => `\`${n}\``).join(" · ")
}

export function buildAgentsMd(cfg: ThemeConfig): string {
  const preset = encodePreset(cfg)
  const { components, blocks, charts } = inventory()
  const radius = RADII[cfg.radius] ?? RADII.default
  const font = FONTS[cfg.font] ?? FONTS.sans
  const heading = FONTS[cfg.heading] ?? FONTS.sans

  return `# AGENTS.md — UI house rules
> generated with logic2b ui · preset \`${preset}\`

This project's interface is built on the logic2b ui design system
(${SITE}): a shadcn-compatible component registry restyled entirely
through CSS tokens. Follow these rules for any work that touches the UI.

## Stack contract

- React 19 + Tailwind CSS v4 (CSS-first config — there is no
  \`tailwind.config.js\`). Icons come from lucide-react.
- The theme is the token blocks in \`theme.css\`: \`:root\` (light) and
  \`.dark\` (dark). Dark mode toggles with the \`dark\` class on \`<html>\`.
- Code layout: primitives in \`@/components/ui\`, installed blocks in
  \`@/components\`, charts in \`@/components/charts\`, the \`cn()\` class helper
  in \`@/lib/utils\`.

## Don't hand-roll what the registry ships

Before writing any UI element from scratch, install it:

- CLI: \`npx logic2b@latest add <name>\` (resolves registry dependencies).
- No shell? Use the MCP endpoint \`${SITE}/mcp\` — the \`install_plan\` tool
  returns the exact files to write and npm deps to add — or fetch
  \`${SITE}/r/<name>.json\` and write its \`files[]\` yourself.

Available primitives (${components.length}):
${wrapList(components)}

Blocks (${blocks.length}):
${wrapList(blocks)}

Charts (${charts.length}):
${wrapList(charts)}

Also install rather than reimplement: new UI libraries (MUI, Chakra, Ant,
DaisyUI…) are off-limits — they fight the token system.

## Theme rules

- Colors go through semantic utilities only: \`bg-primary\`,
  \`text-muted-foreground\`, \`border-border\`, \`bg-card\`… Never raw palette
  classes (\`bg-blue-500\`), never hex/oklch literals in components.
- The accent is \`--primary\`. Beyond it, color belongs only to the chart
  ramp (\`--chart-1\`…\`--chart-5\`) and the destructive state.
- Radius derives from \`--radius\` (currently ${radius}) via \`rounded-sm\` to
  \`rounded-xl\` — don't invent arbitrary radii.
- Type: \`--font-sans\` (${font.split(",")[0].replace(/'/g, "")}) for body and UI,
  \`--font-heading\` (${heading.split(",")[0].replace(/'/g, "")}) for h1–h4.
- Depth comes from borders and surface steps (\`bg-card\`, \`bg-muted\`), not
  box-shadows.
- Every change must hold in **both modes** — check light and dark.
- Re-theming happens by regenerating tokens from a preset
  (\`npx logic2b@latest init --preset ${preset}\` or the MCP \`apply_preset\`
  tool), not by hand-editing individual token values.

## Component conventions

- One file per component; variants via \`class-variance-authority\` with the
  variants object exported (e.g. \`buttonVariants\`).
- Merge classes with \`cn()\`; every component root carries a \`data-slot\`
  attribute — use it for reliable selection in tests and styles.
- Extend by composition (wrap, pass \`className\`) instead of editing
  installed \`ui/*\` internals; if you must fork one, keep its public API.
- Forms use react-hook-form + zod through the \`form\` component. Charts use
  Recharts through the \`chart\` component so series colors bind to the
  \`--chart-*\` tokens.

## Verify before finishing

1. TypeScript compiles and the app renders with zero console errors.
2. The change looks right in light **and** dark mode.
3. No raw palette classes or color literals slipped into changed files.

## Machine-readable registry

- Index: ${SITE}/r/index.json · item payloads: ${SITE}/r/<name>.json
- Docs for agents: ${SITE}/llms.txt (full: ${SITE}/llms-full.txt)
- MCP: \`${SITE}/mcp\` (remote, streamable HTTP) or \`npx -y @logic2b/mcp\` (stdio).
`
}
