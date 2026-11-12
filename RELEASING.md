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

## Advertised beta onboarding

The shared `packages/scaffold/src/package-selectors.ts` policy owns the CLI and
MCP `@next` selectors. Generated site commands, agent prompts, MCP command
responses and the VS Code extension consume it. Literal documentation commands
are checked for parity; do not rewrite archived benchmarks or immutable payloads.
The npm selector is independent of the registry version selector.

Before promoting site onboarding, verify the actual published channel:

```bash
pnpm --filter @logic2b/mcp test:beta-onboarding
```

This network gate runs the advertised `npx logic2b@next` and
`pnpm dlx logic2b@next` commands from an isolated directory, records the resolved
version, checks CLI help, generates a Vite marketing starter and adds a button.
It then launches `npx -y @logic2b/mcp@next` and verifies the handshake and a real
install plan, then checks the public HTTP endpoint with GET and an MCP
handshake. It does not publish anything. This gate checks published behavior;
`test:release-artifacts` separately checks the current source candidate, including
structured results. If publication is pending, document the difference explicitly.

## npm dist tags

Release candidates use `next`; they must not replace `latest`:

```bash
pnpm --dir packages/cli publish --tag next --access public
pnpm --dir packages/mcp publish --tag next --access public
```

Only the final trademark-approved `1.0.0` release moves to `latest`. If one RC
package publishes and the other fails, fix and publish the same version of the
missing package—never reuse an already published npm version.

## npm publication history

Nothing is pending: npm `next` serves the current paired candidate.

### 12 November 2026 — `1.0.0-rc.3`

| Package | `next` | `latest` (deprecated) | Tarball shasum |
| --- | --- | --- | --- |
| `logic2b` | `1.0.0-rc.3` | `0.4.0` | `9aa852863f73457d729dc444e519e1a021cb3a29` |
| `@logic2b/mcp` | `1.0.0-rc.3` | `0.2.0` | `1f7947c4adc1eaa4abc1251095ffa02cdd0ab6b0` |

Both tarballs were packed with `pnpm pack` from `992b81c` and published with
`npm publish <tgz> --tag next --access public`; `latest` was not moved. The
stale `latest` versions are deprecated with a pointer to `@next`
(`logic2b@0.4.0` → `/docs/installation`, `@logic2b/mcp@0.2.0` →
`/docs/llms#mcp-server`) until the final `1.0.0` replaces them. The live
beta-onboarding check resolved rc.3 for npm, stdio MCP and the remote endpoint.
Evidence is recorded under REL-03/REL-04 in `docs/EXECUTION.md`.

pnpm's default minimum release age makes `pnpm dlx logic2b@next` keep
resolving the previous version for about 24 hours after a publication; npm and
exact-version pnpm selectors resolve immediately. Run
`test:beta-onboarding` again after that window.

The website and remote MCP deploy from GitHub independently of npm. Updating
`main` does not update either npm dist-tag. Tokens and scaffold are private
workspace packages bundled into the distributable binaries; they need no
separate npm publication.

### Earlier

`1.0.0-rc.2` was published to `next` before 7 September 2026; `latest` remained
CLI `0.4.0` / MCP `0.2.0`.
