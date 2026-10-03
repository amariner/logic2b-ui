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

## Inspect an existing project

The source CLI now includes `inspect`; it awaits the next npm publication.
From this repository, inspect an app before selecting or installing components:

```bash
pnpm --filter logic2b dev inspect --cwd /path/to/my-app --json
```

The default response is a compact, versioned summary of the detected framework,
versions, aliases, stylesheets, installed-item counts and unresolved context.
Dependency versions describe the declarations in the app's configuration;
inspection does not resolve installed packages or query npm.
`--details` adds the full context, installed files and comparison hashes for
local customizations. Inspection reads bounded configuration and selected files;
it makes no writes, registry requests, dependency installations or config/script
execution. Configuration sources include `package.json`, TypeScript/JavaScript
path configuration, `components.json` and `.logic2b/manifest.json`. Missing or
unsupported context is reported as unknown instead of assigned default aliases.

For a workspace, select the app relative to `--cwd`. An ambiguous workspace
requires an explicit app selection before planning component writes:

```bash
pnpm --filter logic2b dev inspect --cwd /path/to/workspace --app-root apps/web --json
```

Use confirmed aliases and stylesheet paths from this result when adding to an
existing app. Use `init --template` for the explicit empty-project workflow.
Inspection does not change the existing `init`, `add` or `update` write behavior.

`--file <relative-path>` may be repeated to include hashes of selected local
files. `--snapshot` emits sanitized JSON metadata suitable for the MCP
`inspect_project` input; the host chooses whether to send it. It omits source
contents, package names, scripts, registry URLs and arbitrary configuration
fields. `--details` also opts into inventory collection for snapshots.
Absolute paths, traversal, environment/secret files and dependency directories
are rejected; nothing is sent automatically.

The host must declare its capabilities: `--file-writes`,
`--dependency-install` and `--browser` default to false. These flags describe
available permissions for later work; inspection itself still only reads.

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
