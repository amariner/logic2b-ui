# 07 — Agent rules distribution

**Status:** implemented in source; verification recorded in `docs/EXECUTION.md` ·
**Task:** M1-03 · **Depends on:** M0-01 (complete).
The execution queue's 2026-09-05 capability/preservation decision governs this
guide. [03 review_ui](./03-review-ui.md) adds a conditional instruction when
the host actually advertises it. npm delivery remains the separate REL-01 gate.

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
- MCP: `agent_rules({ preset?, stack?, iconLibrary?, formats?, inventory?,
  inventoryKind?, registryVersion?, currentFiles? })` returns bounded file
  plans with missing/SHA-256 preconditions. `scaffold_plan` includes the two
  default files unless `agentRules: false`; neither tool writes host files.
- Editor formats generated from the same source: `AGENTS.md` (universal),
  `CLAUDE.md` import line, `.cursor/rules/logic2b.mdc`,
  `.github/copilot-instructions.md` section.
- A Claude Code **skill** (`skills/logic2b-ui/SKILL.md`) in this repo and in
  the MCP package: inspect existing projects, discover actual capabilities,
  prefer compatible installed/registry primitives, implement states and verify
  the result. Review/composition/proposal instructions are conditional on
  advertised tools; existing authorization governs writes.
- The generator moves from `apps/web/src/lib/agents-md.ts` into
  `packages/scaffold/src/rules.ts`; the site imports it.

## Design

Generate instructions only for available tools. Until review/proposals ship,
state that limitation and use existing checks. Respect intentional native HTML
and project policies. Do not request redundant approval for an already authorized
change. Preserve instructions outside managed markers. The future tool references
below are conditional on their implementation, never commands to invent.

### Managed block with markers

```md
<!-- logic2b:rules:start v1 preset=… registry=1.0.0-rc.16 -->
…generated content…
<!-- logic2b:rules:end -->
```

Everything outside the markers is the project's own and is never touched.
`update` rewrites only the block and reports it. If markers are missing, the
CLI appends a block once and says so.
Malformed, duplicate and unsupported marker versions reject the whole plan.
Markers occupy their own unindented lines. Fenced, quoted and indented examples
are never treated as writable regions; an unclosed fence prevents appending.
`DESIGN.md` has its own `logic2b:design` markers. CLI plans every destination
before component/configuration writes, checks ancestors for symlinks, stages
exclusive temporary files and revalidates the whole batch before replacing
targets. A write failure can leave an applied prefix of the batch; no rollback
can safely overwrite concurrent edits, so failures require reinspection.

`components.json` records `logic2b.agentRules: false` for a persistent opt-out.
Automatic refresh respects it. An explicit `logic2b rules` command can generate
files without changing that preference. Already managed editor targets refresh
with installs; unselected/unmanaged editor targets are left alone.

### Content, in priority order (context is a budget)

1. Stack contract (React 19, Tailwind v4, tokens, icon package). ~10 lines.
2. Project policies: prefer installed primitives/tokens, applicable empty/error
   states and accessible naming. Run `review_ui` when available (03), and show
   proposals for new screens when supported (04).
3. Inventory: components, blocks, charts — one flowing line each, names only.
4. How to install without a shell (remote MCP) and with one (CLI).
5. Pointers: `/llms.txt`, `/docs/llms`, this project's preset link.

Budget: the managed block ≤ 6 KiB (6,144 UTF-8 bytes). `DESIGN.md` stays separate and is only
referenced, not inlined.
Public inputs allow at most 160 inventory entries, 64 tool identifiers and five
fixed rule paths. Existing content is bounded to 64 KiB per file and 256 KiB
total. Inventory identifies installed evidence separately from the available
142-item source catalog. Registry versions must be exact; absent preset/version
evidence is labeled unknown. Token defaults are reference values, never proof
of an existing application's theme.

### Editor formats

The same content, wrapped: Cursor rules get frontmatter with
`alwaysApply: true` and globs for `**/*.{tsx,jsx,astro}`; Copilot gets a section under
a heading; Claude Code gets `@AGENTS.md` appended to `CLAUDE.md` if it exists,
else a one-line `CLAUDE.md`.
Selecting Claude also generates `AGENTS.md`; every selection includes the
separate `DESIGN.md`. Existing Cursor frontmatter remains byte-for-byte intact.
An import example inside a Markdown code fence does not suppress the real
Claude import. The studio's established full AGENTS/DESIGN exports retain their
original bytes; the installed managed block is a separate compact presentation
from the same core module.

### Skill

`skills/logic2b-ui/SKILL.md` is short and procedural: detect
`components.json` with the logic2b registry, inspect source/context and prefer
compatible installed primitives. Use `install_plan` for verified additions and
`scaffold_plan` only for empty targets. Review/proposal/composition require
discovery first. Do not manually edit CLI-owned `.logic2b/` records/bases.
The package's prepack step copies exactly this canonical file to
`skills/logic2b-ui/SKILL.md`; no other repository skills enter the tarball.
Users install the skill through their host's supported workflow; running the
MCP binary does not automatically activate a Claude Code skill.

### Where it lives

| Piece | Path |
| --- | --- |
| Generator (moved) | `packages/scaffold/src/rules.ts`; re-export shim in `apps/web/src/lib/agents-md.ts` |
| CLI | `packages/cli/src/index.ts`, `rules.ts`, `lib.ts`, `scaffold.ts` |
| MCP | `packages/mcp/src/tools.ts`; scaffold plans include the files |
| Skill | `skills/logic2b-ui/SKILL.md`; `packages/mcp/package.json` `files` allowlist |
| Docs | `apps/web/src/content/docs/llms.mdx`, `installation.mdx` (+ `docs-es`) |
| Release gate | `packages/mcp/scripts/verify-release-artifacts.mts` exact allowlist |
| VS Code | `packages/vscode/src/agent-rules.ts`, `extension.ts`; workspace API writes |

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

- Snapshot tests for every format and the pre-move studio parity artifacts;
  catalog metadata parity against the registry index.
- Size budget test: managed block ≤ 6 KB for the full inventory.
- `test:release-artifacts` asserts the skill ships in the MCP tarball and
  nothing else new does.
- `test:scaffold` (CLI) and `test:scaffolds` (MCP) assert the generated
  projects contain the rules and that `update` refreshes only the block.

## VS Code extension

`packages/vscode` already installs items and applies presets through the
shared codec. The "Generate agent rules" command writes the same files through the
workspace API (remote-safe, like preset application) and refreshes the
managed block after an install. No second implementation.
`logic2b.agentRules.enabled` controls automatic generation; formats are selected
through the command/settings. Existing dirty documents, symlink ancestors and
changed preconditions reject writes. All files are checked before a workspace
edit; document save failures remain visible for recovery. CLI capability discovery
lets the extension pass an opt-out only to a CLI that supports it, including
when the npm `next` selector still points to the older rc.2 binary.

## Out of scope

- Marketplace listings beyond the skill file and the existing VSIX.
- Rules for non-logic2b registries.
