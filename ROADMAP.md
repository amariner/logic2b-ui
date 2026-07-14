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

## Now (🔜) — in priority order

### 1. CLI — only what the lane needs

We deliberately stopped chasing feature parity with the upstream CLI (search,
view, eject, migrate… exist there and move faster than we can copy). The CLI
work we keep is what the agent lane and real installs depend on:

- 💡 `init --template <next|vite|astro|…>` real scaffolding and `--monorepo`
  workspaces — useful, but parity work; demoted until the lane above ships.

## Next

### Registry & components

- ✅ Components beyond shadcn parity — timeline, number field, code block with
  copy, autocomplete, file dropzone and color picker shipped (on top of tree
  view, stepper, tags input, rating, native select and item, which closed
  shadcn/ui parity to 100%).
- 💡 More blocks: e-commerce (checkout, product detail), mail client,
  calendar app, AI chat with streaming states, marketing bundles (full
  landing in one install). (Kanban board and an e-commerce cart shipped ✅.)
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
- 💡 **Typeset lane** — a type-scale studio (inspired by the upstream
  typeset idea): pick display/body pairings, preview real docs pages,
  export the `--font-*` tokens + fontsource imports as one preset.

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

1. **Jul–Aug** — polish pass: unified UI language across sections, docs
   quality, motion presets, visual regression + a11y suites in CI.
2. **Sep** — trust pass: framework benchmarks published, Lighthouse CI,
   bundle budgets, registry build validation in CI.
3. **Oct** — release candidate: CLI/MCP at 1.0.0-rc, starter templates,
   agent benchmark v1, launch content (demos, comparison pages).
4. **Nov** — trademark green light → v1.0 announcement; npm majors, blog
   post, community namespace opens.

## Watching

- 👀 **`@shadcn/react`** — upstream is shipping its own unstyled primitives
  ("Unstyled components for React"). If the ecosystem migrates from Radix to
  those, "shadcn-compatible" changes meaning and our Radix-based ports need a
  strategy. No action yet; re-evaluate as it matures.

---

Suggestions welcome — open an issue at
[github.com/amariner/logic2b-ui](https://github.com/amariner/logic2b-ui/issues).
