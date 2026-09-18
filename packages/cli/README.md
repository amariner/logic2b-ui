# logic2b

The command-line tool for [logic2b ui](https://ui.logic2b.com) — add beautifully
designed, copy-paste components to your project. You own the code.

## Usage

Initialize your project (creates `components.json` and the `cn()` helper):

```bash
npx logic2b@next init
```

Or create a complete runnable project from the registry:

```bash
npx logic2b@next init --template vite --starter marketing --cwd my-app
```

Templates are available for `next`, `vite` and `astro`; starters are
`marketing`, `dashboard` and `auth`. Add `--monorepo` to create a Turbo
workspace with the app under `apps/web`, `--preset <id>` to apply a theme from
the `/create` studio, or `--no-install` to write files without installing.
Generated projects use exact dependency pins and record the immutable registry
release, item integrities and installed files in `.logic2b/manifest.json`.
The `/create` preset also selects Lucide, Tabler, Phosphor or Hugeicons. The
choice is stored in `components.json`; subsequent `add` and `update` operations
rewrite icon imports, npm dependencies and merge snapshots consistently.

Add components (registry dependencies are resolved automatically):

```bash
npx logic2b@next add button card dialog
```

List everything available in the registry:

```bash
npx logic2b@next list
```

## Commands

| Command | Description |
| --- | --- |
| `init` | Initialize an existing app, or generate a complete app with `--template`. |
| `add <components...>` | Add one or more components and their dependencies. |
| `update [components...]` | Pull registry changes into installed components with a 3-way merge — local edits survive; overlapping edits get git-style conflict markers. |
| `diff [components...]` | Show which installed components differ from the registry. |
| `list` | List all components available in the registry. |
| `rules` | Regenerate managed AGENTS.md/DESIGN.md; `--format agents,claude,cursor,copilot` adds editor formats. |
| `inspect` | Read bounded project configuration and installed hashes; `--json --details full` includes aliases, inventory and uncertainty. |
| `review <paths...>` | Source candidate: review selected TSX/JSX with explicit token policy, supported native accessible-name checks and unresolved context. |

`add` snapshots what it installs under `.logic2b/base/` — that snapshot is the
base side of `update`'s merge, so keep the directory (committing it is fine).
Files installed by older CLI versions have no snapshot; `update` leaves them
untouched and says so.

`init` and `add` install the required npm packages automatically, using
whichever package manager the project already uses (`packageManager` field or
lockfile — pnpm, npm, yarn or bun). Pass `--no-install` to just print the
install command instead.

Run `npx logic2b@next <command> --help` for options.

## Documentation

Full docs, live previews and the theme builder are at
**[ui.logic2b.com](https://ui.logic2b.com)**.

## License

MIT © [logic2b](https://ui.logic2b.com). See [LICENSE](./LICENSE); third-party
notices in the
[project repository](https://github.com/amariner/logic2b-ui/blob/main/THIRD-PARTY-LICENSES.md).


## Inspect before changing an existing app

The source candidate adds `inspect`; confirm it appears in your installed
CLI's `--help` before using it. From this checkout, build with
`pnpm --filter logic2b build`, then run:

```bash
node packages/cli/dist/index.js inspect --cwd /path/to/app --json --details full
```

Use `--app-root apps/web` for a workspace application and `--file <path...>`
for extra file hashes. The collector never writes, fetches, executes project
configuration, or reads `.env`, Git or dependency directories. It detects
Next/Vite/Astro declarations, confirmed aliases and installed/customized files;
unknown settings stay unknown. Host capabilities are disabled unless supplied
with `--capabilities none` or a comma-separated list of `file-writes`,
`dependency-install`, `browser`. Full inventory is opt-in; the summary is
bounded to 16 KiB. Limits: 128 KiB config input, 1,000 inventory entries,
256-character relative paths, 2 MiB per selected file and 32 MiB total reads.

Use the full context to reconcile proposed destinations and preserve local
changes. `add` does not automatically consume inspection results or change its
alias behavior. An inspect result does not authorize an overwrite.


## Agent instructions (source candidate)

`init` (existing app or scaffold), `add` and `update` now generate or refresh
managed `AGENTS.md` and `DESIGN.md`. Use `--no-agent-rules` to opt out for an
operation. Existing text outside the `logic2b:rules` / `logic2b:design` markers
is preserved; documents without markers get a block appended once. Malformed
or duplicate markers require repair. Automatic refresh reports a rules failure
separately if component installation has already succeeded.

Regenerate on demand from an application directory:

```bash
node packages/cli/dist/index.js rules --cwd /path/to/app --format agents,claude,cursor,copilot
```

Build this checkout first (`pnpm --filter logic2b build`), or confirm `rules`
appears in your installed CLI's help. This source change does not establish
npm availability. Claude imports `@AGENTS.md`; Cursor gets an `.mdc` rule;
Copilot gets a managed section. Optional formats already managed by logic2b
are refreshed on later installs. Existing Cursor frontmatter stays intact.

The inventory comes from the install manifest, not the full registry catalog;
legacy installs without a manifest are unknown. Rules take no network access,
execute no project configuration and preserve external file bytes/permissions.
They reject symlink/hard-linked destinations, invalid UTF-8 and documents over
128 KiB. Rules are capped at 6 KiB; large inventories report how many names
were omitted. In a monorepo, run the command with `--cwd apps/web`.

`rules --preset <id>` changes the documentation reference only. `init --preset`
also applies CSS and records that preset in components.json while preserving
other configuration fields. Actual CSS overrides remain authoritative. An
icon-library conflict between preset and project must be resolved explicitly.

## Static UI review (source candidate)

Build this checkout with `pnpm --filter logic2b build`, then:

```bash
node packages/cli/dist/index.js review src/CustomerPage.tsx --cwd /path/to/app --semantic-colors --json
```

Confirm `review` appears in installed CLI help before using an npm copy. This
source change does not establish publication. The command requires explicit
files/directories, reads TSX/JSX only, does not execute project code, and rejects
symlink/hard-linked files, escaping/private/dependency paths, invalid UTF-8 and
overlapping selections. Limits: 64 files, 256 KiB total source, 256-character
relative paths and a 50,000-node AST traversal budget.

The shared engine has four rules in `tokens` and `a11y`; choose scopes with
`--scope tokens,a11y`. `--semantic-colors` explicitly enables `L2B-TOK-001`, a
project policy for supported literal color classes/styles. Without the flag it
is disabled. Stylesheet token overrides are outside scope.

Accessible-name rules `L2B-A11Y-001..003` cover supported native dialogs,
controls and buttons. The default label context is partial. Use
`--complete-label-context` only after verifying that external labels and
caller ancestors cannot supply missing names. Cross-file labels, wrappers,
spreads and dynamic semantics remain unresolved. Native HTML is valid.

JSON output reports findings with evidence/locations/fixes, unknowns, reasoned
suppressions, evaluated/disabled rules, assumptions and truncation. Text output
also shows unknowns and assumptions. `--fail-on error` is the default;
`--fail-on warning` also fails for warnings. Exit 1 means the finding threshold
was reached; exit 2 means invalid review input, parse failure or truncation.
Command-line usage errors retain exit 1. Semantic unknowns alone do not fail:
exit 0 and zero findings are not a passing accessibility certificate.

See [the review guide](https://ui.logic2b.com/docs/review) for all four rules,
reasoned next-line suppression syntax and the MCP equivalent. Keep runtime,
keyboard and responsive verification in the consuming application.
