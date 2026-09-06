# Contributing to logic2b ui

Thanks for helping. This document explains how to set up the repository, what a
change needs before it can merge, and what we do not accept. Product direction
lives in [ROADMAP.md](./ROADMAP.md); the actionable queue and handoff log in
[docs/EXECUTION.md](./docs/EXECUTION.md); agent-facing rules in
[AGENTS.md](./AGENTS.md). Read those before proposing new components or tools.

## Setup

Requirements: Node.js 22.12+ and the pinned pnpm (`packageManager` in
`package.json`; Corepack or `npm i -g pnpm@11.10.0`). Then:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test
```

`pnpm build` renders the whole site, which exercises every registry item and
demo. `pnpm --filter @logic2b/web dev` serves the site locally;
`pnpm --filter @logic2b/mcp dev` runs the local MCP server from source.

## Where things live

| Path | Owns |
| --- | --- |
| `packages/registry` | Component, block and chart sources; release history; registry build and integrity checks |
| `packages/tokens` | Theme presets, token exports, contrast audit and theme linting |
| `packages/scaffold` | Shared scaffold composer and the public beta package selectors |
| `packages/cli` | `logic2b` CLI (add, init, status, update) |
| `packages/mcp` | Local stdio server, shared HTTP core, tool contracts and limits |
| `packages/vscode` | VS Code extension preview |
| `apps/web` | Site, docs (English and Spanish), `/create` studio, `/mcp` worker route |
| `benchmarks` | Framework and agent benchmark contracts and archived results |

Shared logic belongs in the shared packages; CLI, MCP, VS Code and the site are
adapters over the same core.

## Before you open a pull request

1. Pick a task from [docs/EXECUTION.md](./docs/EXECUTION.md) or open an issue
   first for anything larger than a fix. New catalog items are not a priority
   ahead of the reference customer-management journey; see the roadmap.
2. Keep changes scoped. Preserve immutable registry payloads, archived
   benchmarks and published version manifests: a changed item must be named in
   a new release in `packages/registry/releases.ts`, never rewritten in place.
3. Run the checks for the packages you touched plus the workspace gates:

   ```bash
   pnpm --filter <package> lint
   pnpm --filter <package> test
   pnpm lint && pnpm test
   ```

   Registry changes need `pnpm build` (integrity) and the affected visual and
   accessibility suites in `apps/web`; do not accept screenshot diffs blindly.
   CLI or MCP distribution changes need `pnpm test:release-artifacts`.
   Docs changes need the English and Spanish pages to stay in sync
   (`apps/web/test/docs-i18n.test.ts` enforces the translated set).
4. Say what you ran and what you did not. The CI workflow in
   `.github/workflows/ci.yml` runs the full gate on every pull request; do not
   describe unrun checks as passed.
5. Use the pull request template. Contracts (tool schemas, registry payload
   shape, CLI flags) are public: call out any change to them.

## Code conventions

- Strict TypeScript, React 19, Tailwind CSS v4 and semantic theme tokens.
  Components follow the existing shadcn/Radix conventions and document their
  accessibility responsibilities in `packages/registry/accessibility.ts`.
- Demonstrations use realistic content and include loading, empty, error and
  recovery states where the component has them.
- Treat every public input as bounded untrusted data. No telemetry, no remote
  code execution in static tools, no model API calls inside the registry or the
  MCP server.
- Avoid adding dependencies. If one is needed, install it explicitly and say
  why in the pull request.

## Releases and publication

Publishing to npm, moving dist-tags, changing repository visibility and any
outreach are separate, maintainer-only operations described in
[RELEASING.md](./RELEASING.md). A merged pull request does not publish anything.

## Reporting problems

Use the issue templates. For security issues follow [SECURITY.md](./SECURITY.md)
instead of opening a public issue. Include the CLI version
(`npx logic2b@next --version`), the MCP handshake version, the registry version
from `components.json` and your Node.js and package manager versions: the `next`
channel moves, so exact versions matter.

By contributing you agree that your contributions are licensed under the MIT
license in [LICENSE](./LICENSE).
