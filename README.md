# logic2b ui

Build interfaces fast, assisted by AI. A shadcn/ui-compatible component registry
and documentation site, optimized for Cloudflare Workers and for consumption by
LLMs and coding agents.

## What's inside

- **`packages/registry`** — the product: copy-paste React 19 + Tailwind v4
  components with a shadcn-compatible API, a typed index, and a build script
  that emits shadcn-compatible JSON payloads to `/r/*.json`.
- **`apps/web`** — the site: landing, docs, charts and the `/create` theme
  builder. Astro 7 with React islands, fully static, deployed to Cloudflare
  Workers.
- **`packages/cli`** — `npx logic2b add button`: fetches components from the
  registry and writes them into your project (resolving registry dependencies).
  `init --preset <id>` applies any theme built in `/create` exactly.
- **`packages/mcp`** — an MCP server that exposes the registry to coding
  agents (search, list and read components/blocks/charts with full source).
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
- **`AGENTS.md` + `DESIGN.md` export** — the `/create` studio generates the
  house rules (component inventory, token rules, what not to hand-roll) and
  the style reference for any theme, ready to drop into a repo so agents
  follow the design system.
- `/r/index.json` + `/r/<name>.json` — machine-readable registry with full source.
- **MCP server** — point an agent at the remote endpoint
  (`https://ui.logic2b.com/mcp`, streamable HTTP, zero install) or run
  `npx -y @logic2b/mcp` locally. Beyond search and read, `install_plan`
  returns the exact file writes + npm deps for any set of items, and
  `apply_preset` rebuilds theme.css for any `/create` preset — an agent
  with no shell can install and theme the whole system by itself.

## Development

```bash
pnpm install
pnpm --dir packages/registry build   # generate /r/*.json
pnpm --dir apps/web dev              # dev server on :4321
pnpm build                           # full build (turbo)
```

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

See [ROADMAP.md](./ROADMAP.md) — what's shipped, what's next (scope cleanup,
visual-regression + a11y suites, framework benchmarks on the path to v1.0) and
what we're exploring.

## Contributing

Components follow the shadcn conventions: one file per component, `cva` for
variants, the `cn()` helper for classes, a `data-slot` on each root element, and
strict TypeScript. Commits use
[Conventional Commits](https://www.conventionalcommits.org).

## License

MIT © [logic2b](https://ui.logic2b.com) — see [LICENSE](./LICENSE). Notices for
bundled open-source software live in
[THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md).
