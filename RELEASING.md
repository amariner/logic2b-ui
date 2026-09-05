# Releasing logic2b

The CLI and MCP server use the same release-candidate version and ship from
`packages/cli` and `packages/mcp`. Their package manifests are the runtime
version source of truth; `prepack` always rebuilds `dist` before a tarball is
created.

## Release-candidate gate

Run from a clean checkout on Node 22.12+ with the repository's pinned pnpm:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test
pnpm benchmark:agents:test
pnpm test:release-artifacts
pnpm --filter @logic2b/mcp test:scaffolds
pnpm --filter @logic2b/web test:budgets
pnpm --filter @logic2b/web test:a11y
pnpm --filter @logic2b/web test:visual
pnpm --filter @logic2b/web test:lighthouse
```

`test:release-artifacts` is the publication contract. It first verifies that
the package versions match their changelogs and each other, then packs both
packages, installs the tarballs in an isolated consumer, asserts the exact
publication allowlist, runs the installed CLI binary's version/help surface
and negotiates the installed MCP binary over stdio with the official SDK.
It then calls every MCP tool against a local registry, validates advertised
output schemas and structured/text parity, and checks an explicit tool failure.
The local fixture serves Astro-generated demos from `apps/web/dist/client/r`,
so the preceding `pnpm build` is required even for this isolated smoke gate.

Before publishing, also confirm:

- Both changelogs describe the candidate and both package versions match.
- `git status` is clean and CI passed for the exact commit being tagged.
- `pnpm --dir packages/cli pack --dry-run` and the MCP equivalent contain only
  `dist`, `README.md`, `LICENSE`, `CHANGELOG.md` and `package.json`.
- The remote registry and MCP endpoint are healthy at `ui.logic2b.com`.

## npm dist tags

Release candidates use `next`; they must not replace `latest`:

```bash
pnpm --dir packages/cli publish --tag next --access public
pnpm --dir packages/mcp publish --tag next --access public
```

Only the final trademark-approved `1.0.0` release moves to `latest`. If one RC
package publishes and the other fails, fix and publish the same version of the
missing package—never reuse an already published npm version.
