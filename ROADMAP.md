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

- ✅ **Registry** — 71 shadcn-compatible components (React 19 + Tailwind v4,
  `cva` variants, `data-slot`, strict TS) served as JSON at `/r/<name>.json`.
  100% shadcn/ui parity plus components beyond it (tree view, stepper, tags
  input, rating, native select, item, timeline, number field, code block,
  autocomplete, file dropzone, color picker).
- ✅ **Blocks** — 34 blocks: login, signup, pricing, hero, dashboards, chat,
  onboarding, settings, team, products, stats, FAQ, CTA, contact, navbar,
  footer, kanban, the e-commerce set (cart, checkout, product detail), the
  admin set (orders, reservations, customers, analytics) and animated twins.
- ✅ **Charts** — 26 installable Recharts variants across area/bar/line/pie/
  radar/radial plus sparklines, KPI tiles, composed charts and an activity
  heatmap.
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
- ✅ **Sidebar tokens in the studio CSS export** — the exported `:root`/`.dark`
  blocks carry the same derived sidebar ladder the CLI preset patch writes,
  and the studio's contrast audit covers those pairs too.
- ✅ **Custom accent** — a free oklch hue/chroma picker in the studio, not
  just the six presets. Serialized as `h<hue>c<chroma>` inside the same
  6-field preset id (charts accept it too), so custom themes travel through
  share links, `init --preset` and the MCP theme tools unchanged.
- ✅ **CLI auto-install** — `init` and `add` install the npm dependencies
  themselves, detecting pnpm/npm/yarn/bun from the `packageManager` field or
  lockfile; `--no-install` keeps the old print-only behavior.
- ✅ **`logic2b update`** — pulls upstream changes into installed components
  with a real 3-way merge: `add` snapshots what it installed
  (`.logic2b/base/`), update fast-forwards pristine files, keeps local edits
  when the registry didn't move, merges non-overlapping changes and marks
  true conflicts with git-style markers. Pre-snapshot installs are left
  untouched with a clear message.
- ✅ **Shared `@logic2b/tokens` package** — the theme data (base scales,
  accents, chart ramps, radii, fonts, the preset codec and the CSS emitters)
  has one source of truth: a private workspace package consumed by the
  studio, bundled into the published CLI and MCP dists, and running inside
  the remote MCP worker. The three hand-synced mirrors (and their drift
  tests) are gone.
- ✅ **`native-select`** — a styled wrapper around the native `<select>`
  element (token-matched border, focus ring and chevron) for OS-native
  picker UX — mobile wheel/sheet pickers, native form submission, no custom
  listbox JS. Documented alongside `Select` with guidance on when to reach
  for which.
- ✅ **`item`** — the last component needed for 100% shadcn/ui parity: a
  generic flex container (`Item`, variants default/outline/muted, sizes
  default/sm) for settings rows, notification lists and command results,
  with `ItemGroup`/`ItemSeparator` for lists, `ItemMedia` (icon/image),
  `ItemContent`/`ItemTitle`/`ItemDescription`, `ItemActions` and optional
  `ItemHeader`/`ItemFooter`.
- ✅ **Site information architecture** — one navigation system across the
  catalog: a grouped, quick-filterable components sidebar (driven by the
  `categories` field on every `registry:ui` item, emitted into
  `/r/index.json`), category-routed `/blocks/<category>` with a side rail and
  a page per block (`/blocks/<category>/<name>`: full-width live preview with
  viewport toggle, a code tab per file read straight from the built
  `/r/<name>.json`, install command + Copy Prompt), and a matching sticky rail
  on `/charts/<category>`. The nav regenerates itself as items land.
- ✅ **Typeset studio (`/typeset`)** — a dedicated type studio, same
  philosophy as the theme studio (everything round-trips through a preset id):
  Heading/Body/Mono family pickers, Measure, Size, Leading and Flow; a real
  docs page as the live preview; a copyable `typeset.css` export with the
  exact fontsource `@import`s; and `auditTypeset()` readability guardrails in
  the rail. `ThemeConfig` grew from 6 to 11 fields in the shared
  `@logic2b/tokens` codec — one preset id now carries theme **and** type, and
  `decodePreset` stays backward-compatible with every id minted before it.
- ✅ **Registry build validation in CI** (`.github/workflows/ci.yml`) — on
  every push to `main` and every PR: `pnpm build` (renders every
  docs/blocks/charts page end to end), `pnpm lint` (registry integrity —
  `registryDependencies` resolve, declared files exist, every `@/registry/*`
  import maps to a shipped file, no duplicate names — plus `tsc --noEmit`) and
  `pnpm test`. The gate now runs on every push instead of relying on memory.

## Now (🔜) — Jul–Aug polish, in priority order

The site IA, the typeset studio and CI validation (the previous Now lane) all
shipped. What's left of the polish window before the September trust pass:

### 1. Scope cleanup — the registry ships UI, not services

- ✅ **Retired `packages/reservations`** (the booking/payments Worker + D1
  backend). logic2b ui is a **visual** system — blocks are pure UI with static
  sample data, and backends are the consumer's job. The admin blocks (orders,
  reservations, customers, analytics) stay: they render from static sample
  data and don't import the backend. The package's schema and REST API contract
  moved into a native docs guide — **Bring your own backend**
  (`/docs/backend`) — as a platform-agnostic blueprint, and the package is
  gone. This was the last loose end from the "UI only" decision.

### 2. Accessibility checks in CI

- ✅ **axe-core over every shipped block preview** (`/blocks/preview/<name>`),
  light + dark, gated in CI (`apps/web/tests/a11y.spec.ts`, run after
  `pnpm build` on the built `dist/client`): no serious/critical violations may
  merge. Contrast stays owned by the studio's WCAG 2.2 + APCA audit, so this
  gate covers the rest — accessible names, roles, labels and valid ARIA. The
  first run surfaced and fixed real shipped-block defects: dangling
  `aria-controls` on the admin filter tabs (they now render a real panel per
  status so the tab semantics are honest), a role-bearing `<Separator>` inside
  a `<dl>` in `cart-01`, an unnamed `<Progress>` in `onboarding-01`, and
  missing `title`s on every block-preview iframe across the site.

### 3. Visual regression suite — lock the look before launch

- 🔜 **Playwright screenshots of every demo**, light + dark. The a11y harness
  above already builds the Playwright + static-serve plumbing this rides on;
  what's deferred is the pixel-diff gate itself — committing baselines that
  stay stable across the container and GitHub's runners (font/AA rendering
  differences need a tolerance strategy) before it can block merges without
  flaking. Next up in the polish window.

### 4. CLI — only what the lane needs

We deliberately stopped chasing feature parity with the upstream CLI (search,
view, eject, migrate… exist there and move faster than we can copy). The CLI
work we keep is what the agent lane and real installs depend on:

- 💡 `init --template <next|vite|astro|…>` real scaffolding and `--monorepo`
  workspaces — useful, but parity work; stays demoted behind the polish and
  trust passes.

## Deliberately out of scope (for now)

- **Framework ports (Svelte, Vue, …)** — porting 70+ Radix-based components
  to another ecosystem doubles maintenance forever and dilutes the real
  differentiator (the agent lane). The token/theme layer is already
  framework-agnostic — the studio's CSS export works in any stack today, and
  a framework note on the export surfaces is cheap. Re-evaluate after v1.0.
- **Backend/service code** — see scope cleanup above: UI only.

## Next

### Registry & components

- ✅ Components beyond shadcn parity — timeline, number field, code block with
  copy, autocomplete, file dropzone and color picker shipped (on top of tree
  view, stepper, tags input, rating, native select and item, which closed
  shadcn/ui parity to 100%).
- 💡 More blocks: mail client, calendar app, AI chat with streaming states,
  marketing bundles (full landing in one install). (Kanban board and the
  e-commerce set — cart, checkout, product detail — shipped ✅.)
- 💡 Chart gallery expansion: streaming/real-time examples. (Sparklines —
  line/area/bar — KPI tiles, composed charts and an activity heatmap shipped ✅.)

### Design Plus kit (motion, icons, 3D — the "extras" lane)

Everything here ships the same way as components: installable items +
documented recipes, never a runtime framework of our own.

- ✅ **Motion presets** — enter/exit/hover recipes on tokens, built on
  tw-animate-css (zero runtime deps): the `<Motion>` primitive plus the
  `motion-fade` / `motion-slide` / `motion-scale` / `motion-blur` presets
  (`logic2b add motion-fade`), exported recipe maps for Radix `data-[state]`
  exits, `prefers-reduced-motion` fallbacks, and the Framer Motion flavor
  documented as a copyable recipe for spring physics and layout animations.
- ✅ **Animated block variants** — `-animated` twins of existing blocks that
  reveal on mount via the motion engine, no new API: `hero-01-animated`
  (staggered fade-up), `feature-grid-01-animated` (heading then cards cascade)
  and `stats-01-animated` (cards cascade + KPI values count up via the
  `use-count-up` hook). Drop-in replacements — same exports — respecting
  prefers-reduced-motion.
- ✅ **Scroll & parallax recipes** — `scroll-reveal` plays the motion engine's
  enter recipes when an element scrolls into view (via the `use-in-view`
  IntersectionObserver hook, SSR/no-JS safe), and `parallax` drifts a
  marketing-image layer purely with CSS scroll-driven animations
  (`animation-timeline: view()`), guarded by `@supports` for a static
  fallback. Both honor `prefers-reduced-motion`.
- 💡 **3D extras, documented** — guidance + copyable examples for
  react-three-fiber hero scenes and product viewers that respect the token
  system (lights/materials driven by theme tokens). Docs-first: heavy deps
  never enter the base registry.
- 💡 **Icon libraries beyond Lucide** — make the studio's Icon Library
  selector real: Tabler / Phosphor / Hugeicons mappings, with the CLI and
  `install_plan` rewriting icon imports per choice.
- ✅ **Typeset lane** — the Typeset studio shipped (see Shipped above).

### Benchmarks (public, reproducible)

- 💡 **Framework performance benchmarks** — the same blocks rendered in
  Next.js / Vite / Astro / TanStack, measured (bundle size, hydration cost,
  LCP on a throttled profile) with published methodology and scripts, for
  backends/frontends/API-layer choices around a UI.
- 💡 **Agent benchmark / leaderboard** — how fast and how correctly coding
  agents (Claude, Cursor, Copilot…) install, theme and compose logic2b ui
  vs. copy-paste baselines: tasks, scoring rubric and per-model execution
  speed published as a living page. Doubles as our own regression suite for
  the MCP/prompt surfaces.

### Site & docs

- 💡 Auto-generated API tables from the component types (today they're
  hand-written).
- 💡 Live playground per component (edit props/code in the browser).
- 💡 Theme-aware OG images per docs page.
- 💡 i18n of the docs (Spanish first).
- 💡 Accessibility notes per component (keyboard map, ARIA contract).

### Quality

- 🔜 Visual regression suite (Playwright screenshots of every demo, light +
  dark, both themes) — in the Now lane above (plumbing shipped with the a11y
  gate; the pixel-diff baselines are what's left).
- ✅ axe-core a11y checks in CI — shipped over every block preview (see the
  Now lane). Extending the gate to the docs component demos (many are
  intentionally minimal shadcn-style examples) is a possible follow-up.
- 💡 Bundle-size budgets per component payload; Lighthouse CI on the site
  (the September trust pass).
- ✅ Registry build validation: every `registryDependencies` resolvable, every
  import mapped, every payload parseable — enforced in CI (see Shipped).

## Later (💡)

### Ecosystem & distribution

- 💡 Figma library generated from the token tables.
- 💡 VS Code extension: browse the registry, insert components, apply presets.
- 💡 Community namespace (`logic2b add @user/item`) with registry auth for
  private registries.
- 💡 Starter templates repo (SaaS dashboard, marketing site, docs site) wired
  to presets.
- 💡 Theme marketplace / gallery of shared presets.

### Deepening the agent lane (the differentiator)

The remote MCP, `install_plan` and the preset codec are the moat — the
long-term bets keep widening the gap between "an agent can read our docs" and
"an agent can build a real interface with us end to end":

- 💡 **Project-scale MCP tools** — beyond per-item `install_plan`, a
  `scaffold_plan` that returns the file writes for a whole screen or app
  shell (blocks + theme + routing glue) from a one-line brief, so a shell-less
  agent stands up a working page in a single tool call.
- 💡 **Theme lint as a tool** — an MCP tool that takes a repo's `theme.css`
  and reports drift from the token contract (missing derived tokens, hand-
  edited scales, contrast regressions), so an agent maintaining a consumer
  project can keep it on-system over time, not just at install.
- 💡 **Registry versioning + changelogs** — pin an install to a registry
  version, machine-readable changelogs per item, and `logic2b update` honoring
  version ranges — the audit trail an enterprise agent needs to adopt updates
  safely.
- 💡 **Cross-platform token export** — the shared `@logic2b/tokens` data
  emitted through Style Dictionary to CSS-in-JS, iOS and Android token
  formats, so the same preset id themes more than the web.
- 💡 **Agent telemetry (opt-in)** — anonymized signal on what agents install,
  where prompts fail and which items get hand-edited after install, feeding
  the agent benchmark and the prompt/MCP surfaces as a real feedback loop.

## Beyond the browser (💡 exploring)

The registry is framework-agnostic React + tokens — that travels further
than marketing sites:

- 💡 **Business process UIs** — the blocks catalog grown toward internal
  tooling: approval flows, audit trails, form-heavy admin screens, kanban
  and scheduling blocks. The agent lane matters double here: enterprises
  can point a sandboxed assistant at the remote MCP and get compliant,
  on-brand internal tools without a design team.
- 💡 **Industrial / HMI surfaces** — control-panel blocks (status boards,
  gauge + threshold cards, alarm lists, e-stop-grade confirm dialogs) for
  operator interfaces running on panel PCs and kiosks via embedded
  browsers (webview on Linux ARM). High-contrast
  themes, large touch targets and offline-first patterns as presets.
- 💡 **Edge/device dashboards** — the Workers-native story extends to
  fleets: device telemetry dashboards served from the edge, streaming
  charts fed by MQTT/WebSocket bridges.

## Path to v1.0 — launch plan (target: November 2026)

The **Logic2b** trademark decision lands in November 2026; v1.0 launches on
that green light. Working backwards:

1. **Jul–Aug** — polish pass: the information architecture (grouped sidebar,
   block categories, per-block pages) ✅, the typeset studio ✅, registry
   validation in CI ✅, scope cleanup (reservations retired) ✅ and the
   accessibility gate ✅ are done; **remaining**: the visual-regression suite
   (the current Now lane).
2. **Sep** — trust pass: framework benchmarks published, Lighthouse CI,
   bundle budgets.
3. **Oct** — release candidate: CLI/MCP at 1.0.0-rc, starter templates,
   agent benchmark v1, launch content (demos, comparison pages).
4. **Nov** — trademark green light → v1.0 announcement; npm majors, blog
   post, community namespace opens.

_Status (mid-Jul 2026): on track — the polish pass is nearly complete
(reservations retired, the accessibility gate live in CI), with the
visual-regression suite the last item before the September trust pass._

## Watching

- 👀 **`@shadcn/react`** — upstream is shipping its own unstyled primitives
  ("Unstyled components for React"). If the ecosystem migrates from Radix to
  those, "shadcn-compatible" changes meaning and our Radix-based ports need a
  strategy. No action yet; re-evaluate as it matures.

---

Suggestions welcome — open an issue at
[github.com/amariner/logic2b-ui](https://github.com/amariner/logic2b-ui/issues).
