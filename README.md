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

## LLM-first

- `/llms.txt` — index of all docs, blocks and charts with absolute URLs
  (blocks and charts link straight to their installable JSON payloads).
- `/llms-full.txt` — the whole documentation in one Markdown file.
- Every docs page is available as plain Markdown by appending `.md`.
- `/r/index.json` + `/r/<name>.json` — machine-readable registry with full source.

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

## Contributing

Components follow the shadcn conventions: one file per component, `cva` for
variants, the `cn()` helper for classes, a `data-slot` on each root element, and
strict TypeScript. Commits use
[Conventional Commits](https://www.conventionalcommits.org).

## License

MIT © [logic2b](https://ui.logic2b.com) — see [LICENSE](./LICENSE). Notices for
bundled open-source software live in
[THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md).
