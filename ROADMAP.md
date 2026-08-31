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
- ✅ **Blocks** — 38 blocks: login, signup, pricing, hero, dashboards, chat,
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
- ✅ **CLI project scaffolding** — `init --template <next|vite|astro>` writes a
  complete exact-pinned marketing, dashboard or auth project from the shared
  MCP scaffold core; `--monorepo` produces a real Turbo workspace with the app
  under `apps/web`. Presets and immutable registry versions are applied before
  disk writes, generated installs start with an update-ready `.logic2b` lock,
  and non-empty targets are rejected without mutation.
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
  patching an existing stylesheet in place; `lint_theme` statically checks the
  resulting contract for missing, duplicate and invalid tokens, derived-token
  drift, exact-preset drift and contrast regressions.
- ✅ **Project-scale MCP scaffolding** — `scaffold_plan` returns every file for
  a runnable Next.js, Vite or Astro application from one call: framework shell,
  routing entry, exact-pinned package manifest, theme and all transitive
  registry files. Marketing, dashboard and auth starters ship first; any
  `/create` preset is applied before the files leave the tool. CI materializes,
  installs and production-builds all three stacks from the real registry.
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
- ✅ **Machine-readable accessibility contracts** — all 71 `registry:ui`
  items publish their semantic support level, keyboard interactions, ARIA
  behavior, consumer responsibilities and honest known limitations in the
  installable JSON. Component docs render the same contract, MCP exposes it,
  and registry tests fail if any current or future UI item ships without one.

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

- ✅ **axe-core over every shipped UI surface**, light + dark, gated in CI
  (`apps/web/tests/a11y.spec.ts`, run after `pnpm build` on the built and
  hydrated `dist/client`): 38 block previews, 212 component/chart demos and 24
  guide/benchmark docs, generated API references and the live starter gallery
  plus 71 isolated component prop playgrounds produce **706 axe analyses**, and
  no serious/critical
  violation may merge. Contrast stays owned by the studio's WCAG 2.2 + APCA
  audit, so this gate covers the rest — accessible names, roles, labels, valid
  ARIA and keyboard access. The gate uses a fresh static server and a fresh tab
  per demo so stale hashed assets or leaked observers cannot turn it into an
  SSR-only check. It surfaced and fixed real defects including dangling
  `aria-controls` on the admin filter tabs (they now render a real panel per
  status so the tab semantics are honest), a role-bearing `<Separator>` inside
  a `<dl>` in `cart-01`, an unnamed `<Progress>` in `onboarding-01`, and
  missing `title`s on every block-preview iframe across the site, plus unnamed
  form controls, invalid list/listbox children, nested interactive dropzones,
  inaccessible scroll regions and incomplete resizable-panel semantics in the
  copyable component examples.
- ✅ **Accessibility coverage is now part of the registry contract**, not only
  a browser audit: 71/71 UI items carry metadata validated at build/test time,
  including explicit composition duties and limitations such as the color
  picker's pointer-only visual controls and reduced-motion requirements.

### 3. Visual regression suite — lock the look before launch

- ✅ **Playwright screenshots of every demo, block, launch starter and shipped
  prop playground**, light + dark. CI now checks 325 isolated surfaces (650
  baselines) at a fixed desktop viewport.
  Fonts and two animation frames settle before capture; Recharts and animated
  blocks get an additional deterministic wait; browser animations/carets are
  disabled; and the matcher owns a small cross-host antialiasing tolerance.
  The isolated `/demos/preview/<name>` routes also make every component and
  chart directly inspectable without loading the full docs shell.

### 4. Trust gates — performance cannot drift silently

- ✅ **Lighthouse CI** runs three desktop audits each for the landing, docs and
  theme studio, gating performance (≥ 0.85), accessibility/best practices/SEO
  (≥ 0.95), CLS (≤ 0.1), median LCP (≤ 2.5 s) and median TBT (≤ 300 ms).
- ✅ **Bundle budgets** measure the production output after every build: largest
  browser chunk ≤ 350 KiB, total browser JS ≤ 2 MiB, largest registry item ≤
  32 KiB, registry index ≤ 96 KiB, active registry ≤ 750 KiB, current version
  manifest and changelogs ≤ 128 KiB each, portable token exports ≤ 32 KiB,
  docs OG cards ≤ 64 KiB each and their full set ≤ 4 MiB.
- ✅ **Registry growth headroom** — mutable `/r/*.json` discovery mirrors and
  changelogs ship as canonical compact JSON, while immutable content-addressed
  payloads retain their byte-stable representation and SHA-256 contract. The
  split saves about 66.5 KiB from the active catalog without weakening versioned
  verification or raising its 750 KiB budget.
- ✅ Demo and block renderers now lazy-load each preview instead of pulling the
  entire catalog into one shared client chunk; the former ~547 KiB renderer
  fell to ~45 KiB and the current largest browser chunk is ~193 KiB.

### 5. CLI — only what the lane needs

We deliberately stopped chasing feature parity with the upstream CLI (search,
view, eject, migrate… exist there and move faster than we can copy). The CLI
work we keep is what the agent lane and real installs depend on:

- ✅ `init --template <next|vite|astro>` real scaffolding and `--monorepo`
  workspaces, shared with the MCP rather than maintained as a second template
  implementation.

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
- ✅ More blocks: the responsive `ai-chat-01` workspace ships accessible
  message history, a prompt composer, deterministic streaming plus stop and
  continue states, token context and a source rail. The responsive
  three-pane `mail-client-01` (folders, search, selection, unread/label states,
  reading view and interactive starring) is shipped ✅.
  The interactive `calendar-app-01` (month navigation, filterable calendars,
  selectable events, responsive month grid and detail rail) is shipped ✅.
  The complete marketing bundle is shipped as `landing-page-01` ✅: one install
  resolves the canonical navbar, animated hero, animated feature grid, CTA and
  footer transitively. (Kanban board and the e-commerce set — cart, checkout,
  product detail — also shipped ✅.)
- ✅ Chart gallery expansion: `chart-realtime-01` ships a deterministic rolling
  window with start, pause and reset controls, live throughput/error metrics
  and accessible status announcements. Sparklines — line/area/bar — KPI tiles,
  composed charts and an activity heatmap are also shipped.

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
- ✅ **3D extras, documented** — the `/docs/3d-extras` guide ships copyable,
  lazy-loaded react-three-fiber hero and product-viewer recipes. An explicit
  OKLCH → sRGB bridge keeps lights/materials on semantic theme tokens; demand
  rendering, capped DPR, glTF budgets, posters, DOM controls, reduced-motion
  and failure fallbacks cover performance and accessibility. Three.js, Fiber
  and Drei remain outside the base registry and generated starters.
- ✅ **Icon libraries beyond Lucide** — the studio's Icon Library selector is
  real: Lucide / Tabler / Phosphor / Hugeicons round-trip through presets and
  `components.json`; CLI add/update, MCP `install_plan` and complete scaffolds
  rewrite verified icon exports, package dependencies and update snapshots.
  Old 6- and 11-field preset links remain valid and default to Lucide. CI
  checks every canonical registry icon mapping against the installed packages
  and production-builds generated consumers for all four implementations.
- ✅ **Typeset lane** — the Typeset studio shipped (see Shipped above).

### Benchmarks (public, reproducible)

- ✅ **Framework performance benchmarks** — the same interactive registry block
  rendered in Next.js / Vite / Astro / TanStack Start, measured for production
  client size, transferred JS, hydration-ready time, LCP, TTFB and cold build
  time under a shared throttled profile. Exact-pinned fixtures, raw JSON,
  methodology and scripts ship in `benchmarks/frameworks`; the living public
  table is `/docs/benchmarks`.
- ✅ **Agent benchmark / leaderboard** — the public v1 protocol, 300-point
  objective rubric, safe static scorer, reproducible evaluator runner,
  deterministic SHA-256 fixtures, timeout/transcript controls, regression
  tests and living status page are shipped. Synthetic results are mechanically
  excluded from publication. Three isolated real entries now form a controlled
  comparison under Codex CLI `0.148.0-alpha.15`: `gpt-5.6-sol` scored 294/300
  (98%), `gpt-5.5` 272/300 (90.7%) and `gpt-5.6-terra` 266/300 (88.7%). All
  nine evaluator-observed builds passed; raw artifacts, transcripts and
  per-rule evidence ship in the repository. The harness also doubles as a
  regression suite for the MCP/prompt surfaces and remains open to future
  agent hosts without making launch depend on them.

### Site & docs

- ✅ Live starter gallery at `/demos` — marketing, analytics dashboard and auth
  run as hydrated, full-page compositions of the exact canonical blocks used by
  CLI/MCP scaffolding. Each has a copyable creation command; the typed catalog
  is also published at `/demos/index.json`. Functional, mobile-overflow, axe and
  light/dark pixel gates prevent the launch surface from drifting.
- ✅ Source-generated API reference for all 71 UI items — TypeScript extraction
  publishes 337 public exports and 181 owned/defaulted props (plus inherited
  prop expressions, aliases, hook signatures and public types) into the
  registry JSON, MCP responses and component docs. Drift fails registry lint;
  the previous 69 hand-maintained tables have been removed while their usage
  notes remain.
- ✅ Live playground per component — all 71 UI components now have a lazy,
  executable playground. Direct recipes, declarative composition trees,
  structured JSON/date props and closed-by-default portal recipes render real
  registry exports and native descendants; narrow adapters cover external
  Recharts children, react-hook-form context and imperative Sonner actions.
  Typed bindings keep root or nested props and generated JSX synchronized.
  Copy/reset plus 101 functional checks, isolated axe audits and light/dark
  pixel gates cover the complete inventory without breaking the browser-JS
  budget.
- ✅ Theme-aware OG images per docs page — all 85 English content entries, the
  85 Spanish translations and the component index get deterministic
  1200×630 PNG cards during the web build.
  Section palettes and paired light/dark component surfaces make the theme
  visible at share time; a SHA-256 manifest, exact route coverage tests and
  per-image/total byte budgets prevent stale or oversized social assets. The
  indexed PNG palette runs without dithering so all 171 cards fit in 3.70 MiB.
- ✅ i18n of the docs (Spanish first) — locale-aware HTML and Markdown routes,
  `lang`, canonical alternates, navigation, search, sitemap, agent indexes and
  OG generation are shipped. All 10 top-level guides and all 75 component
  references now exist in Spanish with exact source-catalog parity. The final
  wave closes forms, navigation, layout, motion and Typography; all 71 registry
  items keep localized install and preview surfaces, the three composition
  guides preserve their real multi-item commands, and Typography remains an
  honest documentation-only guide. Generated playground, API and accessibility
  shells follow every applicable route.
- ✅ Accessibility notes per component — all 71 UI docs render their validated
  keyboard/ARIA contract from the same metadata shipped in registry JSON and
  exposed through MCP.

### Quality

- ✅ Visual regression suite — 650 Playwright baselines cover every demo, block,
  launch starter and shipped prop playground in light and dark, enforced in CI
  (see the Now lane).
- ✅ axe-core a11y checks in CI — 706 hydrated analyses cover every block,
  component/chart demo, launch starter, launch/benchmark doc and shipped prop
  playground in light and dark (see the Now lane).
- ✅ Bundle-size budgets and Lighthouse CI — shipped as the September trust
  pass, with failures blocking CI (see the Now lane).
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

- ✅ **Project-scale MCP tools** — `scaffold_plan` now returns complete starter
  applications, not commands, so a shell-less agent can stand up a working
  marketing site, dashboard or auth surface in one tool call. The chart-heavy
  Vite dashboard ships as a lazy composition with a separate cacheable chart
  runtime; CI production-builds all three frameworks and enforces its entry,
  chunk-count and largest-chunk budgets. A future brief planner can broaden
  composition beyond the three validated starters.
- ✅ **Theme lint as a tool** — `lint_theme` takes a repo's `theme.css` and
  statically reports missing, duplicate or invalid tokens, derived-token drift
  and measured contrast regressions. With a preset id it also verifies exact
  preset fidelity, so an agent can keep a consumer project on-system over time,
  not just at install.
- ✅ **Registry versioning + changelogs** — immutable release manifests map
  exact versions/ranges/channels to content-addressed, SHA-256-verified items;
  every item has a machine-readable changelog. CLI installs record an exact
  lock manifest, `status` reports drift, and three-way `update` honors the
  selected range. MCP exposes the same selection and audit trail.
- ✅ **Cross-platform token export** — the shared `@logic2b/tokens` data is
  emitted through exact-pinned Style Dictionary to portable DTCG JSON, CSS,
  iOS Swift and Android light/dark resources. Public artifacts carry SHA-256
  integrity, CI checks source parity, and MCP `export_tokens` resolves any
  preset id into the same platform-neutral contract.
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
   validation in CI ✅, scope cleanup (reservations retired) ✅, accessibility
   gate ✅ and visual-regression suite ✅ are done.
2. **Sep** — trust pass completed early: Lighthouse CI ✅, bundle budgets ✅
   and public reproducible framework benchmarks ✅.
3. **Oct** — release candidate: shell-less starter templates through MCP
   `scaffold_plan` ✅, the public agent benchmark v1 harness + isolated-runner
   contract ✅ and locally
   verified CLI/MCP `1.0.0-rc.2` tarballs + consumer smoke gate ✅, published
   under npm's `next` tag ✅. The CLI now
   generates the same exact-pinned starters as MCP, including real Turbo
   workspaces and update-ready install manifests. The public
   integration-path comparison and its machine-readable twin are also live;
   the live starter gallery and its machine-readable catalog complete the launch
   demos ✅. The agent benchmark now publishes a controlled three-model
   leaderboard with immutable evidence and nine observed builds ✅.
4. **Nov** — trademark green light → v1.0 announcement; npm majors, blog
   post, community namespace opens.

_Status (31 Aug 2026): ahead of plan — the polish and September trust passes
are complete. The verified `1.0.0-rc.2` CLI/MCP artifacts are published under
npm's `next` tag, and the real isolated agent benchmark now has a comparative
three-model leaderboard. The CLI and shell-less MCP starter lanes, live launch
demos, public comparison, benchmark harness and RC artifact gate are complete.
The local registry has advanced through `1.0.0-rc.16` with the composed landing,
mail, calendar and AI chat applications, and compact delivery mirrors, while
CLI/MCP remain the verified `1.0.0-rc.2` artifacts published under `next`._

## Watching

- 👀 **`@shadcn/react`** — upstream is shipping its own unstyled primitives
  ("Unstyled components for React"). If the ecosystem migrates from Radix to
  those, "shadcn-compatible" changes meaning and our Radix-based ports need a
  strategy. No action yet; re-evaluate as it matures.

---

Suggestions welcome — open an issue at
[github.com/amariner/logic2b-ui](https://github.com/amariner/logic2b-ui/issues).
