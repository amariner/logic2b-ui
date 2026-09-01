# logic2b ui

Build interfaces fast, assisted by AI. A shadcn/ui-compatible component registry
and documentation site, optimized for Cloudflare Workers and for consumption by
LLMs and coding agents.

## What's inside

- **`packages/registry`** — the product: copy-paste React 19 + Tailwind v4
  components with a shadcn-compatible API, a typed index, and a build script
  that emits shadcn-compatible JSON payloads plus immutable version manifests,
  content-addressed files and per-item changelogs.
- **`apps/web`** — the site: landing, docs, charts, the `/create` theme builder
  and `/demos` gallery for the complete generated starters. Astro 7 with React
  islands, fully static, deployed to Cloudflare Workers.
- **`packages/cli`** — `npx logic2b add button`: fetches components from the
  registry and writes them into your project (resolving registry dependencies).
  `init --template vite --starter marketing` creates a complete app;
  `--monorepo` wraps it in a Turbo workspace and `--preset <id>` applies any
  theme and its Lucide, Tabler, Phosphor or Hugeicons choice exactly.
- **`packages/mcp`** — an MCP server that exposes the registry to coding
  agents (search, scaffold, install and maintain components and themes).
  Also served remotely at `https://ui.logic2b.com/mcp` — no install, no shell.

## LLM-first

- **Copy Prompt everywhere** — every install surface (docs, blocks, charts and
  the `/create` studio) can copy a self-contained prompt for Claude Code,
  Cursor or Copilot instead of a shell command: CLI steps, a no-CLI fallback
  against the raw registry JSON, the exact theme CSS and a verification
  checklist in one paste.
- `/llms.txt` — index of all docs, blocks and charts with absolute URLs
  (blocks and charts link straight to their installable JSON payloads).
- `/llms-full.txt` — the whole documentation in one Markdown file.
- Every docs page is available as plain Markdown by appending `.md`.
- Every docs route has its own 1200×630 social card, generated from the page
  frontmatter with theme-aware section styling and covered by a SHA-256
  manifest plus image-size budgets.
- **`AGENTS.md` + `DESIGN.md` export** — the `/create` studio generates the
  house rules (component inventory, token rules, what not to hand-roll) and
  the style reference for any theme, ready to drop into a repo so agents
  follow the design system.
- `/r/index.json` + `/r/<name>.json` — machine-readable registry with full source.
- `/r/versions.json` + `/r/changelog/<name>.json` — immutable release discovery,
  SHA-256 integrity contracts and per-item update history.
- Every `registry:ui` payload includes an accessibility contract: semantic
  ownership, keyboard behavior, consumer responsibilities and known gaps.
- `/tokens/default` — deterministic Style Dictionary exports of the semantic
  theme contract as DTCG JSON, CSS, iOS Swift and Android resources.
- `/demos` + `/demos/index.json` — live marketing, dashboard and auth starters
  backed by the same canonical catalog used by CLI and MCP scaffolding.
- `landing-page-01` — the canonical marketing starter as one installable block;
  its navbar, animated hero, animated feature grid, CTA and footer resolve
  transitively instead of being duplicated across consumers.
- Component docs now include lazy, executable prop playgrounds for all 71 UI
  components. Direct, compound, structured-data and portal recipes plus narrow
  Recharts, react-hook-form and Sonner adapters render the real registry
  exports, keep descendant bindings and generated JSX in sync, and support
  copy/reset without shipping a browser compiler in the initial docs bundle.
- **MCP server** — point an agent at the remote endpoint
  (`https://ui.logic2b.com/mcp`, streamable HTTP, zero install) or run
  `npx -y @logic2b/mcp` locally. Beyond search and read, `install_plan`
  returns the exact file writes + npm deps for any set of items;
  `scaffold_plan` returns a complete Next, Vite or Astro starter; and
  `apply_preset` rebuilds theme.css for any `/create` preset. `lint_theme`
  then detects token drift and contrast regressions as that theme evolves —
  an agent with no shell can create, install, theme and maintain the whole
  application itself. Registry tools accept an exact version, semver range or
  channel and return the exact verified release they resolved; component reads
  expose the same accessibility contract used by the docs.
  Presets also carry the icon implementation: CLI/MCP installs rewrite
  verified imports, package dependencies and update snapshots together.

## Development

```bash
pnpm install
pnpm --dir packages/registry build   # generate /r/*.json
pnpm --dir apps/web dev              # dev server on :4321
pnpm --filter @logic2b/web generate:og # regenerate docs social cards
pnpm build                           # full build (turbo)
pnpm lint && pnpm test               # registry/type checks + unit tests
pnpm test:release-artifacts          # pack/install CLI + MCP consumer smoke
pnpm --filter @logic2b/mcp test:scaffolds # install/build generated starters
pnpm --filter logic2b test:scaffold     # install/build a generated monorepo
pnpm --filter @logic2b/web test:e2e  # 706 axe analyses + 650 visual checks (after build)
pnpm --filter @logic2b/web test:budgets
pnpm --filter @logic2b/web test:lighthouse
pnpm benchmark:frameworks             # isolated Next/Vite/Astro/TanStack lab
pnpm benchmark:agents:test            # validate agent protocol + scorer
pnpm --dir benchmarks/agents test:fixtures # install/build agent fixtures
pnpm benchmark:agents:run -- <config> # execute a real run (inside a sandbox)
```

The release-candidate checklist and npm dist-tag policy live in
[RELEASING.md](./RELEASING.md).

## Deploy

The site is configured for **Cloudflare Workers** (the `@astrojs/cloudflare`
adapter plus `apps/web/wrangler.jsonc`). The build is self-contained — no secrets
or environment variables required.

- **Manual:** `cd apps/web && npx wrangler deploy`.
- **Automatic:** in the Cloudflare dashboard, connect this repo under
  _Workers & Pages → your Worker → Builds_. Root directory `apps/web`, build
  command `npx astro build`. Every push to `main` then deploys on its own.
- **Other hosts (Vercel, Netlify, a static server):** the site builds to static
  files, so just swap the adapter in `apps/web/astro.config.mjs` for your
  platform. `wrangler.jsonc` is Cloudflare-only and ignored everywhere else.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) — what's shipped, what's next (the **user
lane**: states contracts, `review_ui`, proposal links, `compose_plan`, the AI
product kit, user preferences) and what we're exploring. Each initiative has
an executable implementation guide under [docs/guides](./docs/guides/README.md)
written for coding agents and humans alike. The reproducible framework lab and
latest measurements live in [benchmarks/frameworks](./benchmarks/frameworks).

## Contributing

Components follow the shadcn conventions: one file per component, `cva` for
variants, the `cn()` helper for classes, a `data-slot` on each root element, and
strict TypeScript. Commits use
[Conventional Commits](https://www.conventionalcommits.org).

## License

MIT © [logic2b](https://ui.logic2b.com) — see [LICENSE](./LICENSE). Notices for
bundled open-source software live in
[THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md).
