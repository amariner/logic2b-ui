# logic2b ui

Build interfaces fast, assisted by AI. A shadcn/ui-compatible component registry
and documentation site, optimized for Cloudflare Workers and for consumption by
LLMs and coding agents.

## What's inside

- **`packages/registry`** — the product: copy-paste React 19 + Tailwind v4
  components (shadcn v4 style), a typed index, and a build script that emits
  shadcn-compatible JSON payloads to `/r/*.json`.
- **`apps/web`** — the site: landing, docs, charts and the `/create` theme
  builder. Astro 7 with React islands, fully static, deployed to Cloudflare
  Workers.
- **`packages/cli`** — `npx logic2b add button`: fetches components from the
  registry and writes them into your project (resolving registry dependencies).

## LLM-first

- `/llms.txt` — index of all docs with absolute URLs.
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

Deploy: `cd apps/web && wrangler deploy`.

## Governance

Read `GUIA-MAESTRA.md` before contributing — stack, conventions and phases are
normative. Current status lives in `ESTADO.md`, decisions in `DECISIONES.md`.

## License

MIT. Component design and API based on [shadcn/ui](https://ui.shadcn.com) (MIT).
