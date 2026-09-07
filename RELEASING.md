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

## Pending npm publication

Checked against the public npm registry on 7 September 2026:

| Package | Published `next` | Published `latest` | Pending delivery |
| --- | --- | --- | --- |
| `@logic2b/mcp` | `1.0.0-rc.2` | `0.2.0` | Structured outputs, verified default registry reads, bounded inputs/protocol errors, beta command selectors and the 16th tool, `list_presets` |
| `logic2b` | `1.0.0-rc.2` | `0.4.0` | Paired candidate required by the shared CLI/MCP version policy; no new CLI command from the gallery integration |

The website and remote MCP deploy from GitHub independently of npm. The gallery
is available through `/themes`, `/es/themes`, `/themes/index.json` and remote
`list_presets` after the integration deployment. Updating `main` does not update
either npm dist-tag. Tokens and scaffold are private workspace packages bundled
into the distributable binaries; they need no separate npm publication.

The manifests still carry the already published `1.0.0-rc.2` version. Before
publishing, allocate an unused paired version (`1.0.0-rc.3` was available at this
check), update both changelogs/manifests, run the release-candidate gate above
and publish both packages to `next`. Keep `latest` unchanged. After publication,
run the live beta-onboarding check and update the compatibility tables and MCP
availability notes in English and Spanish. This integration does not publish npm.
