/**
 * AI-assistant prompts — the "Copy Prompt" feature.
 *
 * Instead of copying a shell command, users can copy a self-contained prompt
 * and paste it into their coding agent (Claude Code, Cursor, Copilot, …).
 * The prompt carries everything the agent needs: the CLI happy path, a manual
 * fallback against the raw registry JSON, the exact theme CSS, and a
 * verification checklist — so it works even in sandboxes that can't run
 * network installs.
 */

import { buildCss, type ThemeConfig } from "@/lib/themes"

export const SITE = "https://ui.logic2b.com"

/** Scaffold command per template, mirroring packages/cli. */
export const SCAFFOLD_COMMANDS: Record<string, string> = {
  next: "npx create-next-app@latest my-app --typescript --tailwind --eslint --app",
  vite: "npm create vite@latest my-app -- --template react-ts",
  tanstack: "npm create @tanstack/start@latest my-app",
  "react-router": "npx create-react-router@latest my-app",
  astro: "npm create astro@latest my-app",
  laravel: "composer create-project laravel/laravel my-app",
}

const TEMPLATE_LABELS: Record<string, string> = {
  next: "Next.js (App Router)",
  vite: "Vite + React",
  tanstack: "TanStack Start",
  "react-router": "React Router",
  astro: "Astro (with React islands)",
  laravel: "Laravel (with Inertia + React)",
}

/** Shared closing sections: registry map, conventions, verification. */
function commonSections(): string {
  return `## Registry reference

- Index of every item: ${SITE}/r/index.json
- Item payload (full source): ${SITE}/r/<name>.json
- Usage examples per item: ${SITE}/r/demos/index.json → ${SITE}/r/demos/<demo>.json
- Docs index for agents: ${SITE}/llms.txt (full docs: ${SITE}/llms-full.txt)
- Every docs page is Markdown when you append \`.md\` to its URL.

Registry file paths map to project paths like this:
- \`ui/*\` → \`@/components/ui/*\`
- \`blocks/<name>/*\` → \`@/components/*\`
- \`charts/*\` → \`@/components/charts/*\`
- \`hooks/*\` → \`@/hooks/*\`
- \`lib/utils.ts\` → \`@/lib/utils.ts\`
- \`theme.css\` → next to the project's Tailwind entry stylesheet

## Conventions (do not break these)

- Tailwind CSS v4 (CSS-first config; no tailwind.config.js needed) and React 19.
- All colors go through semantic tokens (\`bg-primary\`, \`text-muted-foreground\`,
  \`border-border\`, …). Never hardcode hex/oklch values in components.
- Dark mode is class-based: toggle \`.dark\` on \`<html>\`.
- Icons come from lucide-react.

## Verify before finishing

1. The dev server starts and the app renders without console errors.
2. TypeScript compiles (\`tsc --noEmit\` or the framework's check).
3. Components use the theme: a \`<Button>\` shows the primary token color,
   and toggling \`.dark\` on \`<html>\` switches the palette.`
}

export interface InitPromptOptions {
  cfg: ThemeConfig
  presetId: string
  /** "new" scaffolds an app first; "existing" applies to the current project. */
  mode: "new" | "existing"
  /** Template key (next, vite, …) — only used when mode is "new". */
  template?: string
  monorepo?: boolean
}

/**
 * Prompt for the /create studio: set up logic2b ui with this exact theme,
 * in a fresh app or an existing one.
 */
export function buildInitPrompt({
  cfg,
  presetId,
  mode,
  template = "next",
  monorepo = false,
}: InitPromptOptions): string {
  const css = buildCss(cfg)
  const scaffold = SCAFFOLD_COMMANDS[template] ?? SCAFFOLD_COMMANDS.next
  const templateLabel = TEMPLATE_LABELS[template] ?? template

  const newProjectSteps = `1. Scaffold a ${templateLabel} project${
    monorepo ? " inside a pnpm workspace monorepo (apps/web + packages/*)" : ""
  }:

   \`\`\`bash
   ${scaffold}
   \`\`\`

2. Inside the project, initialize logic2b ui with my theme preset:

   \`\`\`bash
   npx logic2b@latest init --preset ${presetId}
   \`\`\``

  const existingProjectSteps = `1. In the project root, initialize logic2b ui with my theme preset:

   \`\`\`bash
   npx logic2b@latest init --preset ${presetId}
   \`\`\``

  return `Set up the logic2b ui design system (${SITE}) in ${
    mode === "new" ? "a new project" : "this project"
  } with my exact theme. Follow every step and verify at the end.

## Steps

${mode === "new" ? newProjectSteps : existingProjectSteps}

${mode === "new" ? "3" : "2"}. The init command writes \`components.json\`, \`@/lib/utils.ts\` (the
   \`cn()\` helper) and a \`theme.css\` with my tokens, and prints npm
   dependencies to install — install them.

${mode === "new" ? "4" : "3"}. Make \`theme.css\` the app's stylesheet entry (it @imports tailwindcss),
   or merge its \`:root\` / \`.dark\` blocks into the existing global stylesheet.

${mode === "new" ? "5" : "4"}. Add the components the UI needs with
   \`npx logic2b@latest add <name>\` (e.g. \`button card input dialog\`).
   Browse ${SITE}/r/index.json to see everything available.

## If the CLI is not available

Do it manually: fetch ${SITE}/r/theme.json and ${SITE}/r/utils.json, write each
entry of their \`files[]\` arrays to the mapped paths (see below), install their
\`dependencies\`, and then replace the \`:root\` and \`.dark\` token blocks of
theme.css with the exact CSS in the next section.

## My theme (preset \`${presetId}\` — this CSS is the source of truth)

\`\`\`css
${css}
\`\`\`

${commonSections()}`
}

/**
 * Prompt for a single registry item (component, block or chart): install it
 * with the CLI, or by hand from the registry JSON.
 */
export function buildAddPrompt(name: string): string {
  return `Add the "${name}" item from the logic2b ui registry (${SITE}) to this project. Follow every step and verify at the end.

## Steps

1. If the project has no \`components.json\` yet, set up logic2b ui first:

   \`\`\`bash
   npx logic2b@latest init
   \`\`\`

2. Install the item (the CLI resolves registry dependencies automatically):

   \`\`\`bash
   npx logic2b@latest add ${name}
   \`\`\`

3. Install any npm dependencies the command prints.

## If the CLI is not available

Do it manually from the registry payload:

1. Fetch ${SITE}/r/${name}.json.
2. Write every entry in \`files[]\` to its mapped project path (see below).
3. Repeat (recursively) for each name in \`registryDependencies\`.
4. Install every package listed in \`dependencies\` across those payloads.

${commonSections()}`
}
