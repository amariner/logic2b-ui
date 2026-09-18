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
| `change plan <request.json>` | Source candidate: collect local context and assemble explicit candidate files into a hashed plan. |
| `change apply <plan.json>` | Validate all preconditions and apply with a recovery journal; `--dry-run` checks without writing. |
| `change recover <transaction-id>` | Restore one transaction after checking current hashes and permissions; `--dry-run` inspects first. |
| `change status` | List bounded local journal states and their transaction UUIDs. |
| `verify <suite.json>` | Source candidate: run declarative checks against an already-started loopback app and save local browser evidence. |

`add` snapshots what it installs under `.logic2b/base/` — that snapshot is the
base side of `update`'s merge, so keep the directory (committing it is fine).
Files installed by older CLI versions have no snapshot; `update` leaves them
untouched and says so.

The source candidate merges edits on independent adjacent lines without a
conflict. Genuine overlaps receive tagged Git-style markers and a local
`.logic2b/update-conflicts.json` record. `update` exits 1 while conflicts or
missing-base differences need resolution. Repeating the same update preserves
unresolved files and still reports failure; it cannot turn the previous conflict
into success merely because the upstream base advanced or the next version
renamed or removed that file. Resolve the actual
source while preserving both intended changes, then run `update` again. Do not
delete the conflict record to bypass review. Changes to several files are not
one atomic transaction; keep the workspace stable during upstream updates.
Very large divergent files stop before exceeding the 4,000,000-cell line
comparison budget; preserve both versions and resolve that file manually.
`--registry-version` overrides the selection for one command; to keep a new
default, explicitly update the project's `components.json` version pin.

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

## Incremental changes (source candidate)

Build this checkout with `pnpm --filter logic2b build`, or confirm `change`
appears in your installed CLI's help. Source availability does not establish
npm publication. The host authors complete candidate files from the current
source, preserving intended customizations; the planner validates explicit
changes and never synthesizes business logic from a brief.

Save a local `request.json`:

```json
{
  "schemaVersion": 1,
  "registryVersion": "1.0.0-rc.17",
  "candidates": [{
    "path": "src/customer-filters.ts",
    "content": "export const customerStatuses = ['active', 'archived'] as const;\n",
    "reason": "Share status choices for customer filters."
  }]
}
```

Use your application's exact registry version. It can be omitted when the
install manifest records a resolved release; an explicit mismatch is a
conflict. Planning has no registry/network access and cannot establish that
a declared release exists. The CLI collects bounded local context, original
hashes and missing-file evidence itself. Request JSON does not accept a host
`snapshot` or `missingFiles`.

```bash
node packages/cli/dist/index.js change plan request.json --cwd /path/to/app --output /path/to/new-plan.json
node packages/cli/dist/index.js change apply /path/to/new-plan.json --cwd /path/to/app --dry-run --json
node packages/cli/dist/index.js change apply /path/to/new-plan.json --cwd /path/to/app --json
node packages/cli/dist/index.js change status --cwd /path/to/app --json
node packages/cli/dist/index.js change recover TRANSACTION_UUID --cwd /path/to/app --dry-run --json
node packages/cli/dist/index.js change recover TRANSACTION_UUID --cwd /path/to/app --json
```

Review the saved plan before the authorized apply. Default planning output
summarizes operations, hashes, reasons, conflicts and dependency counts;
`--json` prints full source. `--output` requires a new file with an existing
parent directory and refuses overwrites. Request/output/plan artifact paths
resolve from the shell's current directory, independently of `--cwd`.
For workspaces, plan with `--cwd /path/to/workspace --app-root apps/web`.
Apply uses the recorded `plan.appRoot` beneath the same workspace; status and
recover take `--app-root` explicitly.

Plans contain only create/update operations, content hashes and preconditions.
The canonical plan `id` is a checksum, not a signature or permission. Apply
rejects invalid hashes, conflicts, unsupported work and stale files before
changing targets. Files already at the after hash are skipped; if all match,
the result is `already-applied`. Dry-run returns `ready` without writing.
There is no force option. A stale target requires inspection and a fresh plan.

Successful apply returns `applied` and a transaction UUID. Interrupted work
returns `interrupted`; `change status` lists its state and `planId`. Recovery
takes that UUID, not the plan's 64-character checksum. It checks bytes and
permissions before rollback, refuses newer edits or `chmod` changes and
preserves targets already applied before this transaction. Completed applies
can also be recovered while those checks hold. If partial recovery already
restored a target, later changes to it block another recovery attempt even
when they match the plan's after hash. Recovery is exclusively claimed, and a
live owner must finish its attempt first.

Journals retain bounded originals and staged files in the selected app's
`.logic2b/changes/UUID/`. Each replacement is atomic, but the multi-file
transaction is not universally atomic. Keep the workspace stable: portable
hash-check/rename operations cannot exclude unrelated concurrent writers.
New empty directories can remain after recovery. Status reports malformed or
incomplete journal entries in `issues` while listing valid transactions;
preserve these entries for inspection. The history listing limit is 256
directory entries, and each journal permits at most 256 ownership attempts.
After checking no transaction is active, manually archive only terminal
`applied`, `recovered` or `aborted` directories outside this history. Archived
applied journals no longer provide available rollback; never discard active
locks or interrupted state to bypass a conflict.

Limits: 32 candidates, 128 KiB UTF-8 per file, 256 KiB total candidate and
original recovery content, 256-character app-relative paths, 2 MiB serialized
request/plan and 4 MiB per journal. Unsafe, duplicate/case-colliding or
ancestor/descendant targets, aliases, environment/Git/dependency directories,
reserved names and `.logic2b`/`.logic2b-change-*` targets reject. Local source
and artifacts must be regular single-link files; symlink targets reject.

Dependency changes require a preconditioned root `package.json` operation.
Metadata is derived from its four ordinary dependency sections and rechecked
against local bytes. Removals, moves between sections, ambiguous declarations,
local/Git/URL locators, changed lifecycle hooks and changes to bundled
dependencies, overrides, resolutions, `pnpm`, workspaces or `packageManager`
are unsupported. Nested manifests require selecting their app root first.
No dependencies, scripts or verification commands run: results explicitly
report `dependencyInstallation: "not-run"`.

Exit 1 means a conflict, unsupported work, interruption or status issues;
exit 2 means invalid input or an execution error. CLI usage errors retain
exit 1. Verify the application independently after apply. Registry `update`
retains its separate three-way merge and baseline workflow. See
[incremental changes](https://ui.logic2b.com/docs/changes) for MCP input,
result statuses and recovery details.

## Consumer browser verification (source candidate)

Build this checkout with `pnpm --filter logic2b build`, or confirm `verify`
appears in your installed CLI's help. Source availability does not establish
npm publication. Install browser tools explicitly in the consuming app, then
build and start that app separately with its own commands:

```bash
pnpm --dir /path/to/app add -D playwright@1.61.1 @axe-core/playwright@4.12.1
pnpm --dir /path/to/app exec playwright install chromium
node packages/cli/dist/index.js verify verification-suite.json --cwd /path/to/app --url http://127.0.0.1:5173 --output /path/to/new-evidence --json
```

The [verification guide](https://ui.logic2b.com/docs/verification) contains a
complete suite example and assertion reference. Suites select explicit project
files, local routes, viewports and bounded actions/checks using exact role,
label, text or test-id selectors. Actions can exercise the app, so use synthetic
data and authorized interactions. No arbitrary JavaScript, CSS selectors,
shell commands, dependency installation, app build or start scripts run.

`--url` accepts HTTP(S) origins on `localhost`, `127.0.0.1` or `[::1]`, without
credentials, path, query or fragment. Browser tools load from `--cwd`; point it
directly at the app in a monorepo. Each scenario/viewport has a fresh context.
External-origin HTTP, all HTTP redirects (including same-origin redirects),
WebSockets, popups and service workers are blocked; target final routes in the
suite. Observed blocked requests, WebSockets or popups prevent a passing run. `--browser-executable` or
`PLAYWRIGHT_CHROMIUM_PATH` selects an existing compatible Chromium executable.

`--output` creates a new directory with `report.json`, `summary.json` and
hashed `evidence/` artifacts; the parent must exist. Artifact paths resolve
from the shell's current directory. `--timeout` defaults to 5,000 ms per step
(50–30,000); `--budget` defaults to 120,000 ms for scenarios (1,000–300,000).
Browser launch has a separate timeout. `--json` returns report and summary.

Exit 0 requires every declared browser check and run to pass. Failures exit 1;
unknown/skipped coverage, invalid inputs and artifact errors exit 2. Usage
errors retain exit 1. Unreachable routes fail. Missing browser dependencies or
browser capability skip the checks. `--app-unavailable "Build failed in the
separate host step"` records skipped runs without opening a browser; this is a
host assertion, not an independently verified build result. Selected files
must still exist and the output directory must be new.

Selected source hashes are checked before and after execution; changed or
unreadable files fail the runs. Their fingerprint covers selected files only,
with `servedSourceBinding: "unverified"`. An optional suite `planId` associates
evidence with an incremental plan without proving application. Missing results
are unknown, and static/human passes cannot substitute for browser assertions.
A screenshot pass means capture, leaving human visual review outstanding.
Axe checks use WCAG 2.0/2.1 A/AA tags: any returned violation fails, incomplete
results are unknown, and explicit `disabledRules` remain visible. This is not
WCAG certification. MCP `verify_report` summarizes the parsed report without
reading artifacts, fetching evidence URLs or authenticating measurements.

Limits: 1 MiB suite/report JSON; 64 source files, 2 MiB each and 16 MiB total;
16 scenarios, four viewports, 64 steps per scenario and 256 expected checks;
512 evidence records, 16 tools and 32 notes. Paths must be canonical, safe,
relative and at most 256 characters. Local artifacts are bounded to 4 MiB each
and 64 MiB total. Keep evidence local unless sharing is authorized.


## Customer change/update acceptance (source checkout)

The reference lifecycle exercises the installed customer block with a custom
Account owner column (and mobile summary), customer copy and primary-color
CSS override. A second explicit change adds segment filtering; an immutable
rc.17 → rc.18 update must preserve those customizations and apply the real
upstream table fix. A separate overlap tests conflict persistence and explicit
resolution. Stale plans reject and repeated apply must not write again.

```bash
pnpm --filter logic2b journey:prepare /tmp/logic2b-journey
pnpm --dir /tmp/logic2b-journey install --frozen-lockfile=false
pnpm --dir /tmp/logic2b-journey exec playwright install chromium
pnpm --filter logic2b journey:build /tmp/logic2b-journey
pnpm --filter logic2b test:journey /tmp/logic2b-journey /tmp/journey-customized
pnpm --filter logic2b journey:change /tmp/logic2b-journey
pnpm --filter logic2b journey:build /tmp/logic2b-journey
pnpm --filter logic2b test:journey /tmp/logic2b-journey /tmp/journey-changed
pnpm --filter logic2b journey:update /tmp/logic2b-journey
pnpm --filter logic2b journey:build /tmp/logic2b-journey
pnpm --filter logic2b test:journey /tmp/logic2b-journey /tmp/journey-updated
```

Build this checkout's CLI before preparing the fixture. Use new project and
evidence directories. Each explicit build phase records its outcome and source/
bundle hashes; checking rejects a missing or stale stage build and invokes
`verify` on the existing output. The increased-text stage retains the narrowly
specified unknown contrast results from the consumer fixture; a successful
fixture gate is not blanket accessibility approval. See
[guide 15](../../docs/guides/15-customer-journey-acceptance.md) for stage artifacts,
independent expectations and limits. These are repository acceptance scripts,
not additional public CLI or MCP commands.
