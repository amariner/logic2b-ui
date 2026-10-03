import { CLI_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors";
import { behaviorFor } from "@logic2b/registry/behavior";
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

import {
  ICON_LIBRARIES,
  buildCss,
  buildTypesetCssExport,
  fontsourceImportsFor,
  type ThemeConfig,
} from "@/lib/themes"

export const SITE = "https://ui.logic2b.com"

export { PROJECT_CONTEXT_GUIDANCE } from "@logic2b/scaffold/rules"
import { PROJECT_CONTEXT_GUIDANCE } from "@logic2b/scaffold/rules"

/** Installation includes the UI behavior; persistence and authorization remain
 * application responsibilities. Only blocks with a shipped contract get this
 * guidance, so unrelated catalog items do not imply unimplemented coverage. */
export function behaviorPromptSections(name: string): string {
  const behavior = behaviorFor(name)
  if (!behavior) return ""
  const states = Object.entries(behavior.states)
    .filter(([, state]) => state.support !== "not-applicable")
    .map(([name, state]) => `- \`${name}\` (${state.support}): ${state.how}`)
    .join("\n")
  const actions = behavior.actions.map((action) =>
    `- ${action.name} (\`${action.props.join("\`, \`")}\`): ${action.consumer.join(" ")}`,
  ).join("\n")
  const responsibilities = behavior.consumer.map((duty) => `- ${duty}`).join("\n")
  const content = behavior.content.map((slot) => `\`${slot.path}\``).join(", ")
  return `## ${name} behavior contract

Read the registry item's \`behavior\` metadata (schema version ${behavior.schemaVersion}) alongside its exported props.
Provide controlled application data and wire the action callbacks before treating the screen as complete.

### States and recovery

${states}

### Actions to integrate

${actions}

### Consumer responsibilities

${responsibilities}

### Content and verification

Customize the exported content object through its content prop. Editable source paths: ${content}.
${behavior.responsive.strategy} Touch targets are ${behavior.responsive.touchTargets}.
Exercise the built-in states and your consumer-owned states with keyboard navigation, mobile layout, failure/retry and preserved input.
Preview a built-in state at ${SITE}/blocks/preview/${name}?state=<state> and compare it with your integration.

`
}

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

/** Stacks the prompt copier can specialize for. "auto" = stack-agnostic. */
export const STACKS = ["auto", "next", "vite", "astro", "laravel"] as const
export type Stack = (typeof STACKS)[number]

export const STACK_LABELS: Record<Stack, string> = {
  auto: "Auto",
  next: "Next.js",
  vite: "Vite",
  astro: "Astro",
  laravel: "Laravel",
}

/** Per-stack install guidance, appended to prompts as a "Stack notes"
 *  section. Every note is actionable — where the alias lives, where the
 *  stylesheet is imported, what the framework needs for interactivity. */
export function stackNotes(stack: Stack): string {
  switch (stack) {
    case "next":
      return `## Stack notes (Next.js, App Router)

- Resolve this app's import aliases from its TypeScript configuration; a fresh
  create-next-app scaffold commonly uses \`@/*\`, but existing mappings stay intact.
- Import the theme stylesheet once from the confirmed app layout or existing
  stylesheet entry; preserve unrelated global CSS when merging the requested tokens.
- Interactive components already carry \`"use client"\` — server components
  can render them directly; don't add the directive to your own wrappers
  unless they use hooks themselves.`
    case "vite":
      return `## Stack notes (Vite + React)

- Confirm matching alias destinations in TypeScript \`compilerOptions.paths\`
  and the Vite configuration's \`resolve.alias\`; retain the app's chosen aliases.
- Tailwind v4 can run through \`@tailwindcss/vite\`; check the existing adapter
  before changing dependencies or replacing a working CSS setup.
- Import the theme stylesheet from the confirmed application entry; the \`"use client"\`
  directives in components are inert in Vite and safe to keep.`
    case "astro":
      return `## Stack notes (Astro)

- Components are React islands: the project needs \`@astrojs/react\`, and any
  interactive component must be mounted with a client directive
  (\`client:load\` or \`client:visible\`) from an .astro file — either directly
  or via a React wrapper that is itself an island.
- For Tailwind v4, check the existing \`@tailwindcss/vite\` integration before
  changing \`astro.config.mjs\` or dependencies.
- Import the theme stylesheet from the confirmed base layout. Astro uses the
  aliases declared in TypeScript configuration; preserve those mappings.`
    case "laravel":
      return `## Stack notes (Laravel + Inertia + React)

- Laravel commonly uses \`resources/js\`; confirm this app's source root and
  matching TypeScript/Vite aliases before choosing component destinations.
- Use the confirmed CSS or Inertia application entry for theme imports and
  check the existing Tailwind adapter before changing its configuration.
- Pages render through Inertia, so components behave like a plain React SPA —
  the \`"use client"\` directives are inert and safe.`
    default:
      return ""
  }
}

/** Template keys (from the /create scaffolds) → prompt stack. */
const TEMPLATE_STACK: Record<string, Stack> = {
  next: "next",
  vite: "vite",
  tanstack: "vite",
  "react-router": "vite",
  astro: "astro",
  laravel: "laravel",
}

/** Shared closing sections: registry map, conventions, verification. */
function commonSections(iconPackage: string = ICON_LIBRARIES.lucide.package): string {
  return `## Registry reference

- Index of every item: ${SITE}/r/index.json
- Item payload (full source): ${SITE}/r/<name>.json
- Usage examples per item: ${SITE}/r/demos/index.json → ${SITE}/r/demos/<demo>.json
- Docs index for agents: ${SITE}/llms.txt (full docs: ${SITE}/llms-full.txt)
- Every docs page is Markdown when you append \`.md\` to its URL.

Map registry file paths using the confirmed project destinations:
- \`ui/*\` → the \`aliases.ui\` destination
- \`blocks/<name>/*\` → the \`aliases.components\` destination, removing \`blocks/\`
- \`charts/*\` → \`charts/\` under the \`aliases.components\` destination
- \`hooks/*\` → the \`aliases.hooks\` destination
- \`lib/utils.ts\` → the confirmed \`aliases.utils\` helper; other \`lib/*\` use \`aliases.lib\`
- \`theme.css\` → next to the confirmed Tailwind entry, or merge the requested tokens there

Fresh scaffolds may use \`@/components/ui\`, \`@/components\` and \`@/lib/utils\`.
In an existing app, resolve the aliases to physical paths and review each target
before writing. Reuse installed files and preserve their customizations.

## Conventions (do not break these)

- Registry components target Tailwind CSS v4 and React 19. Confirm compatibility
  with the app's declared versions before changing dependencies.
- All colors go through semantic tokens (\`bg-primary\`, \`text-muted-foreground\`,
  \`border-border\`, …). Never hardcode hex/oklch values in components.
- Dark mode is class-based: toggle \`.dark\` on \`<html>\`.
- Icons come from ${iconPackage}.

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
  /** Stack flavor for "existing" mode ("new" derives it from the template). */
  stack?: Stack
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
  stack,
}: InitPromptOptions): string {
  const css = buildCss(cfg)
  const scaffold = SCAFFOLD_COMMANDS[template] ?? SCAFFOLD_COMMANDS.next
  const templateLabel = TEMPLATE_LABELS[template] ?? template
  const notes = stackNotes(
    mode === "new" ? (TEMPLATE_STACK[template] ?? "auto") : (stack ?? "auto")
  )

  const newProjectSteps = `1. Scaffold a ${templateLabel} project in an empty target directory${
    monorepo ? " inside a pnpm workspace monorepo (apps/web + packages/*)" : ""
  }:

   \`\`\`bash
   ${scaffold}
   \`\`\`

2. Inside the project, initialize logic2b ui with my theme preset:

   \`\`\`bash
   npx ${CLI_PACKAGE_SELECTOR} init --preset ${presetId}
   \`\`\``

  const existingProjectSteps = `1. After reading the project context above, preserve any existing
   \`components.json\`, class helper and theme customizations. If initialization
   is needed, ensure its destination mapping matches the confirmed aliases and
   stylesheet before running it; use the manual fallback when it does not:

   \`\`\`bash
   npx ${CLI_PACKAGE_SELECTOR} init --preset ${presetId}
   \`\`\``

  return `Set up the logic2b ui design system (${SITE}) in ${
    mode === "new" ? "a new project" : "this project"
  } with my exact theme. Follow every step and verify at the end.

${mode === "new" ? "Create only the requested new app. If the target already contains an app, use the existing-project workflow and preserve its configuration. Read the generated configuration before choosing component destinations." : PROJECT_CONTEXT_GUIDANCE}

## Steps

${mode === "new" ? newProjectSteps : existingProjectSteps}

${mode === "new" ? "3" : "2"}. Initialization creates missing configuration, the \`cn()\` helper and
   theme files at the confirmed destinations. Install any required dependencies
   that remain missing and are compatible with the app's declared versions.

${mode === "new" ? "4" : "3"}. ${mode === "new" ? "Make `theme.css` the app's stylesheet entry (it @imports tailwindcss), or import its tokens from the generated global stylesheet." : "Apply the requested `:root` / `.dark` tokens in the confirmed stylesheet entry. Retain its existing imports, unrelated styles and token overrides outside the requested change."}

${mode === "new" ? "5" : "4"}. Add the components the UI needs with
   \`npx ${CLI_PACKAGE_SELECTOR} add <name>\` (e.g. \`button card input dialog\`).
   Browse ${SITE}/r/index.json to see everything available.

## If the CLI is not available

Do it manually: fetch ${SITE}/r/theme.json and ${SITE}/r/utils.json, map their
\`files[]\` to the confirmed destinations (see below), and compare existing files
before writing. Preserve the app's class helper and unrelated styles, install
only missing compatible \`dependencies\`, and apply the requested \`:root\` and
\`.dark\` tokens using the exact CSS in the next section.
${cfg.iconLibrary === "lucide" ? "" : `Because this preset selects ${ICON_LIBRARIES[cfg.iconLibrary].label}, use MCP \`install_plan\` with \`iconLibrary: "${cfg.iconLibrary}"\` for additional components; raw registry payloads intentionally contain canonical Lucide imports.\n`}

## My theme (preset \`${presetId}\` — this CSS is the source of truth)

\`\`\`css
${css}
\`\`\`

${notes ? `${notes}\n\n` : ""}${commonSections(ICON_LIBRARIES[cfg.iconLibrary].package)}`
}

/**
 * Prompt for the /typeset studio: drop in this exact type scale
 * (fonts + measure/size/leading/flow) as a standalone typeset.css.
 */
export function buildTypesetPrompt(cfg: ThemeConfig, presetId: string): string {
  const css = buildTypesetCssExport(cfg, presetId)
  const imports = fontsourceImportsFor(cfg)
  const installStep =
    imports.length > 0
      ? `1. Install the fontsource packages this scale needs:

   \`\`\`bash
   npm install ${imports.join(" ")}
   \`\`\`

2. Create \`typeset.css\` next to your main stylesheet with the exact content below, and import it after your theme CSS:

   \`\`\`css
   @import "./typeset.css";
   \`\`\``
      : `1. Create \`typeset.css\` next to your main stylesheet with the exact content below, and import it after your theme CSS:

   \`\`\`css
   @import "./typeset.css";
   \`\`\``

  return `Apply this exact type scale (logic2b ui /typeset, ${SITE}) to my project. Follow every step and verify at the end.

## Steps

${installStep}

${imports.length > 0 ? "3" : "2"}. Apply the \`.prose\` recipe from typeset.css to whatever wraps long-form
   content (a docs article, a blog post, marketing copy) — it sets the
   measure, base size, leading and paragraph rhythm from the tokens.

## My typeset.css (preset \`${presetId}\` — this file is the source of truth)

\`\`\`css
${css}
\`\`\`

## Verify before finishing

1. The heading font (\`--font-heading\`), body font (\`--font-sans\`) and
   \`--font-mono\` render as specified — check a heading, a paragraph and an
   inline \`code\` span.
2. A block wrapped in \`.prose\` respects the measure (doesn't run edge to
   edge) and has visible space between paragraphs.
3. No console errors and the fonts don't flash unstyled text longer than the
   page's other webfonts.`
}

/**
 * Prompt for a single registry item (component, block or chart): install it
 * with the CLI, or by hand from the registry JSON. Pass a stack for
 * framework-specific guidance.
 */
export function buildAddPrompt(name: string, stack: Stack = "auto"): string {
  const notes = stackNotes(stack)
  return `Add the "${name}" item from the logic2b ui registry (${SITE}) to this project. Follow every step and verify at the end.

${PROJECT_CONTEXT_GUIDANCE}

## Steps

1. Reuse the item's installed source when present. If the project needs
   initialization, confirm its aliases and stylesheet first. Use the following
   command only when its mapping matches this app; otherwise use the manual
   fallback and preserve the existing configuration:

   \`\`\`bash
   npx ${CLI_PACKAGE_SELECTOR} init
   \`\`\`

2. Install the missing item after reviewing its target files for local edits
   (the CLI resolves registry dependencies automatically):

   \`\`\`bash
   npx ${CLI_PACKAGE_SELECTOR} add ${name}
   \`\`\`

3. Install only missing compatible npm dependencies the command prints.

## If the CLI is not available

Do it manually from the registry payload:

1. Fetch ${SITE}/r/${name}.json.
2. Map \`files[]\` to confirmed project paths (see below), compare installed files
   and retain customizations before applying the needed changes.
3. Repeat (recursively) for each name in \`registryDependencies\`.
4. Install only missing compatible packages listed in \`dependencies\` across those payloads.

${behaviorPromptSections(name)}${notes ? `${notes}\n\n` : ""}${commonSections()}`
}
