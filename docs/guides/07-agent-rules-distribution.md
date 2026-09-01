# 07 — Agent rules distribution

**Status:** proposed · **Lane:** keep the human in the loop · **Target:** v1.0 ·
**Depends on:** nothing. [03 review_ui](./03-review-ui.md) adds one rule to
the generated file when it lands.

## Why (the user)

The `/create` studio generates `AGENTS.md` and `DESIGN.md` — the design
system as executable context — but only people who open the studio get them.
A project installed with `logic2b init` or scaffolded through MCP has no house
rules, so the next agent session hand-rolls a button, hardcodes a color or
forgets the empty state, and the person using the product pays. The rules
must arrive with the install, refresh with `update`, speak the editor's
native format, and cost as little context as possible.

## What ships

- CLI: `init` (both modes) writes `AGENTS.md` and `DESIGN.md`; `add` and
  `update` refresh the inventory block between markers. `--no-agent-rules`
  opts out; `logic2b rules` regenerates on demand with `--format`.
- MCP: `agent_rules({ preset?, stack?, iconLibrary?, formats? })` returns the
  files as writes, like `install_plan`.
- Editor formats generated from the same source: `AGENTS.md` (universal),
  `CLAUDE.md` import line, `.cursor/rules/logic2b.mdc`,
  `.github/copilot-instructions.md` section.
- A Claude Code **skill** (`skills/logic2b-ui/SKILL.md`) in this repo and in
  the published MCP package: when a user asks for UI in a project that uses
  logic2b, use the MCP tools, prefer registry items, run `review_ui` before
  finishing, share a proposal link for anything larger than one component.
- The generator moves from `apps/web/src/lib/agents-md.ts` into
  `packages/scaffold/src/rules.ts`; the site imports it.

## Design

### Managed block with markers

```md
<!-- logic2b:rules:start v1 preset=… registry=1.0.0-rc.16 -->
…generated content…
<!-- logic2b:rules:end -->
```

Everything outside the markers is the project's own and is never touched.
`update` rewrites only the block and reports it. If markers are missing, the
CLI appends a block once and says so.

### Content, in priority order (context is a budget)

1. Stack contract (React 19, Tailwind v4, tokens, icon package). ~10 lines.
2. Non-negotiables: never hand-roll primitives that exist; tokens only; every
   list has an empty state; every dialog has a title; run `review_ui`
   (guide 03) before finishing; propose before scaffolding (guide 04).
3. Inventory: components, blocks, charts — one flowing line each, names only.
4. How to install without a shell (remote MCP) and with one (CLI).
5. Pointers: `/llms.txt`, `/docs/llms`, this project's preset link.

Budget: the managed block ≤ 6 KB. `DESIGN.md` stays separate and is only
referenced, not inlined.

### Editor formats

The same content, wrapped: Cursor rules get frontmatter with
`alwaysApply: true` and globs for `src/**/*.tsx`; Copilot gets a section under
a heading; Claude Code gets `@AGENTS.md` appended to `CLAUDE.md` if it exists,
else a one-line `CLAUDE.md`.

### Skill

`skills/logic2b-ui/SKILL.md` is short and procedural: detect
`components.json` with the logic2b registry, prefer `install_plan` /
`scaffold_plan` / `compose_plan`, always `review_ui`, always link a proposal
for new screens, never edit files under `.logic2b/`. It is published in the
`@logic2b/mcp` tarball under `skills/` so `npx -y @logic2b/mcp` users get it,
and documented in `/docs/llms`.

### Where it lives

| Piece | Path |
| --- | --- |
| Generator (moved) | `packages/scaffold/src/rules.ts`; re-export shim in `apps/web/src/lib/agents-md.ts` |
| CLI | `packages/cli/src/index.ts`, `packages/cli/src/lib.ts` (markers, refresh) |
| MCP | `packages/mcp/src/tools.ts`; scaffold plans include the files |
| Skill | `skills/logic2b-ui/SKILL.md`; `packages/mcp/package.json` `files` allowlist |
| Docs | `apps/web/src/content/docs/llms.mdx`, `installation.mdx` (+ `docs-es`) |
| Release gate | `packages/mcp/test/release-artifacts` allowlist |

## Implementation steps

1. Move the generator; keep the studio output byte-identical (snapshot test).
2. Add markers + refresh logic with tests: fresh file, existing file with
   markers, existing file without markers, user content outside markers
   preserved, idempotent on re-run.
3. CLI `init`/`add`/`update` integration and `rules` command; `--format`.
4. MCP `agent_rules`; `scaffold_plan` includes `AGENTS.md` and `DESIGN.md`
   by default with an opt-out.
5. Editor formats with snapshot tests.
6. The skill file, packaged and covered by the release-artifacts allowlist
   test.
7. Docs.

## Gates

- Snapshot tests for every format and the studio parity test.
- Size budget test: managed block ≤ 6 KB for the full inventory.
- `test:release-artifacts` asserts the skill ships in the MCP tarball and
  nothing else new does.
- `test:scaffold` (CLI) and `test:scaffolds` (MCP) assert the generated
  projects contain the rules and that `update` refreshes only the block.

## VS Code extension

`packages/vscode` already installs items and applies presets through the
shared codec. Once the generator lives in `packages/scaffold`, add a
"Generate agent rules" command that writes the same files through the
workspace API (remote-safe, like preset application) and refreshes the
managed block after an install. No second implementation.

## Out of scope

- Marketplace listings beyond the skill file and the existing VSIX.
- Rules for non-logic2b registries.
