# logic2b ui — Roadmap

The goal: the best place to start an interface in 2026 — not "another shadcn",
but the registry that treats **coding agents as first-class users**. A human
copies a command; an agent gets a prompt, an MCP server and machine-readable
everything. Exact themes travel as one preset id from the studio to the CLI to
the agent.

The sharpest version of that goal: **agents that don't have a terminal are
users too.** Every install story that ends in "now run this command" excludes
web-based assistants, sandboxed agents and enterprise connectors. Our lane is
the registry an agent can browse, theme and install from **without a shell** —
a remote MCP endpoint, tools that return file writes instead of commands, and
the design system itself shipped as agent-readable context.

Legend: ✅ shipped · 🔜 next up · 💡 later / exploring

## Shipped

- ✅ **Registry** — 50+ shadcn-compatible components (React 19 + Tailwind v4,
  `cva` variants, `data-slot`, strict TS) served as JSON at `/r/<name>.json`.
- ✅ **Blocks** — login, signup, pricing, hero, dashboards, chat, onboarding,
  settings, team, products, stats, FAQ, CTA, contact, navbar, footer…
- ✅ **Charts** — 18 installable Recharts variants across area/bar/line/pie/radar/radial.
- ✅ **Theme studio (`/create`)** — base color, accent, chart palette, radius and
  fonts with a live two-page canvas; round-trippable preset ids; CSS,
  `components.json` and generated `DESIGN.md` + `AGENTS.md` export.
- ✅ **CLI (`logic2b`)** — `init`, `add` (with registry-dependency resolution),
  `diff`, `list`; unit-tested pure core.
- ✅ **CLI presets** — `init --preset <id>` decodes a studio preset and rewrites
  the installed `theme.css` tokens (light + dark + charts + sidebar + fonts +
  radius) so the copied command reproduces the studio theme exactly.
- ✅ **Prompt copier** — every install surface (docs Install tabs, blocks,
  charts, `/create` Get Code) offers **Copy Prompt**: a self-contained brief
  for Claude Code / Cursor / Copilot with the CLI path, a no-CLI fallback
  against the raw registry JSON, the exact theme CSS and a verification
  checklist.
- ✅ **LLM-first surface** — `/llms.txt`, `/llms-full.txt`, `.md` twin of every
  docs page, `@logic2b/mcp` MCP server, cmd+K indexing every installable item.
- ✅ **Remote MCP endpoint at `ui.logic2b.com/mcp`** (streamable HTTP) — the
  registry tools with zero local install, no Node, no shell: the door for
  web-based assistants, sandboxed agents and enterprise connectors that a
  local `npx`-launched MCP can never reach.
- ✅ **MCP tools that act, not advise** — `install_plan` returns the exact file
  writes + npm deps for a set of items (registry dependencies resolved), so an
  agent with no terminal installs by itself; `get_theme`, `decode_preset` and
  `apply_preset` inspect and rebuild theme.css for any studio preset, including
  patching an existing stylesheet in place.
- ✅ **`AGENTS.md` generator** next to `DESIGN.md` in the studio's Get Code —
  house rules for agents working in a repo that consumes logic2b ui: the full
  primitive/block/chart inventory, the token rules, what not to hand-roll, and
  the no-shell install paths. The design system as executable context.
- ✅ **MCP baseline parity** — `get_demo` serves the docs' usage examples as
  machine-readable data (`/r/demos/*.json`, imports rewritten to project
  paths) and `add_command` returns validated per-package-manager CLI
  invocations.
- ✅ **Per-stack prompt flavors** — the Copy Prompt surfaces speak the
  consumer's framework: stack pills (Next.js / Vite / Astro / Laravel) on the
  docs' Agent tab inject alias, stylesheet-entry and islands/Inertia guidance,
  and the `/create` scaffold prompts derive the same notes from the chosen
  template.
- ✅ **Shareable theme links** — `/create?preset=…` loads any theme, the URL
  tracks every edit (no history spam), and Copy Link in the studio rail hands
  out the address.
- ✅ **Contrast audit** — WCAG 2.2 ratios + APCA Lc for every text token pair,
  light and dark, with role-aware baselines (body vs. muted text). Lives in
  the studio rail (warnings + per-pair dialog) and as the `contrast_audit`
  MCP tool so agents verify the themes they generate.

## Now (🔜) — in priority order

### 1. Theme studio

- 🔜 Emit sidebar tokens in the exported CSS (the CLI preset patch already
  derives them; the studio CSS export should match).
- 🔜 Custom accent: free oklch hue/chroma picker, not just the six presets.

### 2. CLI — only what the lane needs

We deliberately stopped chasing feature parity with the upstream CLI (search,
view, eject, migrate… exist there and move faster than we can copy). The CLI
work we keep is what the agent lane and real installs depend on:

- 🔜 Auto-install npm dependencies (detect pnpm/npm/yarn/bun) instead of
  printing the install line.
- 🔜 `logic2b update` — 3-way merge from the registry (diff exists; update
  should apply upstream changes without clobbering local edits).
- 🔜 Shared `@logic2b/tokens` package so the theme data in
  `apps/web/src/lib/themes.ts`, `packages/cli/src/themes.ts` and the MCP theme
  tools has one source of truth (a prerequisite for `apply_preset`).
- 💡 `init --template <next|vite|astro|…>` real scaffolding and `--monorepo`
  workspaces — useful, but parity work; demoted until the lane above ships.

## Next

### Registry & components

- 💡 Components beyond shadcn parity: tree view, stepper/wizard, tags input,
  autocomplete, rating, timeline, file dropzone, color picker, number field,
  code block with copy, native select.
- 💡 More blocks: e-commerce (cart, checkout, product detail), mail client,
  calendar app, kanban board, AI chat with streaming states, marketing
  bundles (full landing in one install).
- 💡 Chart gallery expansion: sparklines, KPI tiles, heatmaps, composed charts,
  streaming/real-time examples.
- 💡 Motion presets (enter/exit/hover recipes on tokens) built on
  tw-animate-css.

### Site & docs

- 💡 Auto-generated API tables from the component types (today they're
  hand-written).
- 💡 Live playground per component (edit props/code in the browser).
- 💡 Theme-aware OG images per docs page.
- 💡 i18n of the docs (Spanish first).
- 💡 Accessibility notes per component (keyboard map, ARIA contract).

### Quality

- 💡 Visual regression suite (Playwright screenshots of every demo, light +
  dark, both themes).
- 💡 axe-core a11y checks in CI for every demo page.
- 💡 Bundle-size budgets per component payload; Lighthouse CI on the site.
- 💡 Registry build validation: every `registryDependencies` resolvable, every
  import mapped, every payload parseable — enforced in CI.

## Later (💡)

- 💡 Figma library generated from the token tables.
- 💡 VS Code extension: browse the registry, insert components, apply presets.
- 💡 Community namespace (`logic2b add @user/item`) with registry auth for
  private registries.
- 💡 Starter templates repo (SaaS dashboard, marketing site, docs site) wired
  to presets.
- 💡 Theme marketplace / gallery of shared presets.

## Watching

- 👀 **`@shadcn/react`** — upstream is shipping its own unstyled primitives
  ("Unstyled components for React"). If the ecosystem migrates from Radix to
  those, "shadcn-compatible" changes meaning and our Radix-based ports need a
  strategy. No action yet; re-evaluate as it matures.

---

Suggestions welcome — open an issue at
[github.com/amariner/logic2b-ui](https://github.com/amariner/logic2b-ui/issues).
