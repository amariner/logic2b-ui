import { CLI_PACKAGE_SELECTOR, MCP_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors";
import { BEHAVIOR_CONTRACTS } from "@logic2b/registry/behavior";
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

import { encodePreset, FONTS, ICON_LIBRARIES, RADII, type ThemeConfig } from "@/lib/themes"
import { PROJECT_CONTEXT_GUIDANCE } from "@/lib/prompts"

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

function behaviorRules(): string {
  const blocks = Object.entries(BEHAVIOR_CONTRACTS)
  if (blocks.length === 0) return ""
  return `## Customer journey behavior

The following blocks ship a \`behavior\` contract. Read it with the installed
source, preserve controlled inputs and local content customizations, and wire
the callbacks to the consuming application's data and authorization rules.
Only these blocks have this declared state coverage.

${blocks.map(([name, behavior]) => `### \`${name}\`

Built-in states: ${Object.entries(behavior.states).filter(([, state]) => state.support === "built-in").map(([state]) => `\`${state}\``).join(", ")}.
${Object.entries(behavior.states).filter(([, state]) => state.support === "consumer").map(([state, contract]) => `- Consumer state \`${state}\`: ${contract.how}`).join("\n")}
${behavior.actions.flatMap((action) => action.consumer.map((duty) => `- ${action.name} (\`${action.props.join("\`, \`")}\`): ${duty}`)).join("\n")}
${behavior.consumer.map((duty) => `- ${duty}`).join("\n")}

Copy lives in the exported content object; customize it through the content prop.
${behavior.responsive.strategy} Check keyboard operation, failure/retry,
preserved input and every applicable state at mobile and desktop sizes.
`).join("\n")}
`
}

export function buildAgentsMd(cfg: ThemeConfig): string {
  const preset = encodePreset(cfg)
  const { components, blocks, charts } = inventory()
  const radius = RADII[cfg.radius] ?? RADII.default
  const font = FONTS[cfg.font] ?? FONTS.sans
  const heading = FONTS[cfg.heading] ?? FONTS.sans
  const iconPackage = ICON_LIBRARIES[cfg.iconLibrary]?.package ?? ICON_LIBRARIES.lucide.package

  return `# AGENTS.md — UI house rules
> generated with logic2b ui · preset \`${preset}\`

This project's interface is built on the logic2b ui design system
(${SITE}): a shadcn-compatible component registry restyled entirely
through CSS tokens. Follow these rules for any work that touches the UI.

${PROJECT_CONTEXT_GUIDANCE}

## Stack contract

- Registry components target React 19 + Tailwind CSS v4. Confirm compatibility
  with the app's declared versions before changing dependencies.
  Icons come from ${iconPackage}.
- Find the theme through the confirmed stylesheet entry and imports.
  Its token blocks are \`:root\` (light) and
  \`.dark\` (dark). Dark mode toggles with the \`dark\` class on \`<html>\`.
- Code layout follows confirmed \`components.json\` aliases and physical paths.
  Fresh scaffolds commonly use \`@/components/ui\`, \`@/components\` and
  \`@/lib/utils\`; preserve an existing app's custom destinations.

## Reuse existing UI and registry components

Read the installed source before choosing an implementation. Reuse existing
components, wrappers and native controls when they meet the requirement. If a
compatible registry item is missing, install it at the confirmed destinations:

- CLI: \`npx ${CLI_PACKAGE_SELECTOR} add <name>\` (resolves registry dependencies).
- No shell? Use the MCP endpoint \`${SITE}/mcp\` — the \`install_plan\` tool
  returns the exact files to write and npm deps to add${cfg.iconLibrary === "lucide" ? " — or fetch the raw registry payload directly" : `; pass \`iconLibrary: "${cfg.iconLibrary}"\` so its canonical Lucide sources are rewritten`}.

The following catalog lists available registry items, not this app's installed
inventory. Confirm installed items from the manifest and actual source.

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
- Requested re-theming can regenerate tokens from a preset
  (\`npx ${CLI_PACKAGE_SELECTOR} init --preset ${preset}\` or the MCP \`apply_preset\`
  tool). Confirm the target stylesheet and review the token diff first;
  preserve unrelated styles and local overrides outside the requested change.

## Component conventions

- One file per component; variants via \`class-variance-authority\` with the
  variants object exported (e.g. \`buttonVariants\`).
- Merge classes with \`cn()\`; every component root carries a \`data-slot\`
  attribute — use it for reliable selection in tests and styles.
- Extend by composition (wrap, pass \`className\`) instead of editing
  installed \`ui/*\` internals; if you must fork one, keep its public API.
- Preserve installed controlled forms and native HTML controls along with
  their behavior contracts. Use react-hook-form + zod through the \`form\`
  component when the application's form requirements need them.
- Charts use Recharts through the \`chart\` component so series colors bind
  to the \`--chart-*\` tokens.

${behaviorRules()}
## Verify before finishing

1. TypeScript compiles and the app renders with zero console errors.
2. The change looks right in light **and** dark mode.
3. No raw palette classes or color literals slipped into changed files.

## Machine-readable registry

- Index: ${SITE}/r/index.json · item payloads: ${SITE}/r/<name>.json
- Docs for agents: ${SITE}/llms.txt (full: ${SITE}/llms-full.txt)
- MCP: \`${SITE}/mcp\` (remote, streamable HTTP) or \`npx -y ${MCP_PACKAGE_SELECTOR}\` (stdio).
`
}
