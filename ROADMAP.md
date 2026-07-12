# logic2b ui — Roadmap

The goal: the best place to start an interface in 2026 — not "another shadcn",
but the registry that treats **coding agents as first-class users**. A human
copies a command; an agent gets a prompt, an MCP server and machine-readable
everything. Exact themes travel as one preset id from the studio to the CLI to
the agent.

Legend: ✅ shipped · 🔜 next up · 💡 later / exploring

## Shipped

- ✅ **Registry** — 50+ shadcn-compatible components (React 19 + Tailwind v4,
  `cva` variants, `data-slot`, strict TS) served as JSON at `/r/<name>.json`.
- ✅ **Blocks** — login, signup, pricing, hero, dashboards, chat, onboarding,
  settings, team, products, stats, FAQ, CTA, contact, navbar, footer…
- ✅ **Charts** — 18 installable Recharts variants across area/bar/line/pie/radar/radial.
- ✅ **Theme studio (`/create`)** — base color, accent, chart palette, radius and
  fonts with a live two-page canvas; round-trippable preset ids; CSS,
  `components.json` and generated `DESIGN.md` export.
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

## Now (🔜)

### CLI

- 🔜 `init --template <next|vite|astro|…>` that actually scaffolds the app
  (delegating to each framework's creator), then inits in place — today it
  prints the recipe instead of failing mid-way.
- 🔜 `--monorepo`: scaffold a pnpm workspace (`apps/web` + shared `packages/ui`).
- 🔜 Auto-install npm dependencies (detect pnpm/npm/yarn/bun) instead of
  printing the install line.
- 🔜 `logic2b update` — 3-way merge from the registry (diff exists; update
  should apply upstream changes without clobbering local edits).
- 🔜 Shared `@logic2b/tokens` package so the theme data in
  `apps/web/src/lib/themes.ts` and `packages/cli/src/themes.ts` has one source
  of truth.

### Theme studio

- 🔜 Load a preset from the URL (`/create?preset=…`) so themes are shareable
  links, not just ids.
- 🔜 Custom accent: free oklch hue/chroma picker, not just the six presets.
- 🔜 Contrast audit in the studio (WCAG 2.2 + APCA) with warnings on failing
  token pairs.
- 🔜 Emit sidebar tokens in the exported CSS (the CLI preset patch already
  derives them; the studio CSS export should match).

### AI & agents

- 🔜 `AGENTS.md` generator next to `DESIGN.md` — house rules for agents working
  in a repo that consumes logic2b ui.
- 🔜 MCP: theme tools (`get_theme`, `decode_preset`, `apply_preset`) and
  install-plan tool (returns file writes + deps for a set of items).
- 🔜 Remote MCP endpoint at `ui.logic2b.com/mcp` (streamable HTTP) — zero
  local install.
- 🔜 Per-stack prompt flavors (Next.js / Vite / Astro / Laravel) in the prompt
  copier.

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

---

Suggestions welcome — open an issue at
[github.com/amariner/logic2b-ui](https://github.com/amariner/logic2b-ui/issues).
