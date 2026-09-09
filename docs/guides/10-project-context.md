# 10 — Project context before component selection

Status: M1-02 implemented; verification evidence is recorded in the execution queue. Shared source contracts live in
`packages/scaffold/src/project-context.ts` and `project-context-schema.ts`.
The local adapter is `packages/cli/src/inspect.ts`; MCP exposes the same pure
inspector as `inspect_project` without filesystem or network access.

## Collect an existing app

After building the CLI from this checkout:

```bash
pnpm --filter logic2b build
node packages/cli/dist/index.js inspect --cwd /path/to/project --json
node packages/cli/dist/index.js inspect --cwd /path/to/workspace --app-root apps/web --details full --json --capabilities file-writes,dependency-install,browser
```

Use `--file <path...>` to hash additional source files relative to the selected
app. No source text is returned. `--capabilities none` explicitly disables all
host capabilities. Omitting the option also disables them but records that the
host did not supply its capabilities; their existence is never inferred from
running the CLI. These booleans are scope declarations, not proof of authority.

The collector reads package/components configuration, tsconfig/jsconfig and
local referenced/inherited configurations, and `.logic2b/manifest.json`. It
hashes confirmed installed targets against `.logic2b/base` when available,
configured stylesheets and explicitly selected files. It never fetches a
registry, executes configuration, runs a package script, reads environment
files or traverses dependency/Git directories. There is no blanket source-tree
scan or transmission of source just to count files.

`--cwd` selects the workspace; `--app-root` selects a relative application.
Without app selection, one-level package workspaces plus conventional `apps/*`
and `packages/*` directories are checked for Next/Vite/Astro declarations. Found
applications are reported and root framework selection is withheld. Recursive
or arbitrary glob expansion is not supported; explicitly choose the app root.
No candidate is automatically chosen, even when only one was found.

## Snapshot and result

A host calls `inspect_project` with the following data, not a local path:

```json
{
  "snapshot": {
    "schemaVersion": 1,
    "configurations": [
      { "path": "package.json", "content": "{\"dependencies\":{\"vite\":\"^8\",\"react\":\"^19\"}}" },
      { "path": "tsconfig.json", "content": "{\"compilerOptions\":{\"paths\":{\"@/*\":[\"src/*\"]}}}" }
    ],
    "files": [],
    "capabilities": { "fileWrites": false, "dependencyInstall": false, "browser": false }
  },
  "detail": "full"
}
```

Configuration bodies are JSON strings; TS/JS configs additionally accept
comments and trailing commas. Optional `appRoot` and `applications` are
normalized relative paths supplied by the host. Each `files` entry is
`{path, sha256, baseSha256?}`: hashes of the current file and its install-time
base, not file contents. Sanitize private fields from configuration before
sending it to a remote host. The inspector emits only recognized settings,
relative paths, digests and evidence; it omits non-semver dependency locators.

The default `summary` result is capped at 16 KiB and contains framework/source
root, inventory counts, up to ten candidate applications and unknowns, total
counts, disabled-or-declared capabilities and guidance. It deliberately has no
`context` field; omitted inventory is not an empty confirmed inventory.
`detail: "full"` includes `ProjectContextV1` with aliases, resolved component
directories, stylesheet entry/list, icons/preset, registry selector/version,
installed file states/hashes, selected hashes, evidence and all unknowns.

The full context's fields follow the original guide with explicit additions:

- `componentAliases` contains physical app-relative destinations resolved from
  components.json through unique TypeScript mappings. Nothing assumes `@` is
  `src`. `sourceRoot` is inferred only from one unambiguous `@/*` or `~/*` root.
- `stylesheetEntry` distinguishes the configured Tailwind entry from additional
  CSS evidence. `registrySelector` is the requested components.json selector;
  `registryVersion` comes from the install manifest's resolved version.
- Installed files include `registryPath` and `state`: `present`, `missing` or
  `unresolved`. Only present files have a hash; `modified` is absent when the
  baseline was not supplied. A missing file in a remote snapshot means
  unobserved-or-missing, not verified deletion.
- `selectedFiles` preserves host/collector file hashes without falsely claiming
  that copied shadcn/native files are registered Logic2b installations.
- Every detection records its source and known/inferred confidence. Dependency
  versions are declarations, not installed versions. MCP does not verify the
  host's filesystem or honesty of its supplied hashes.

Aliases resolve only unique prefix/exact mappings. Local extends and project
references are supported; package-based inheritance, inheritance outside the
selected root, advanced wildcard aliases and conflicting mappings remain
unknown. Cross-root alias definitions in otherwise valid configuration are
withheld and reported; the inspector can still report in-root evidence. This
does not permit escaped snapshot/file paths or reads outside the selected root. Unknown inherited baseUrl prevents guessing local alias destinations.
Astro can depend on Vite internally; Next plus another top-level framework is
reported as conflicting. Unsupported frameworks remain `unknown`.

## Limits and safety

- At most 128 KiB of configuration bytes, 32 configuration targets and 1 MiB
  serialized snapshot input. Inventory and manifest file declarations each
  have a 1,000-entry limit; relative paths have a 256-character limit.
- Collector source reads: 2 MiB per file, 32 MiB total including baseline reads.
  Workspace discovery accepts at most 32 patterns/100 candidate packages and
  1,000 directory entries. Candidate configuration reads share the 128 KiB cap.
- Absolute paths, traversal, dependency/Git/environment paths, duplicate
  normalized configurations/inventory targets and duplicate installed
  destinations reject. Multiple inventory paths to one physical file reject.
- Internal symlinks can be read. Symlinks escaping the selected root, including
  app-root escapes, reject; links to excluded in-root files also reject. Reads
  use bounded file descriptors and verify the opened identity. Inspect a stable
  checkout: a multi-file snapshot is not an atomic filesystem transaction.
- Malformed JSON, unknown snapshot/install-manifest versions and oversized
  inputs fail explicitly. MCP reports these as invalid-params protocol errors
  before any network operation. Errors do not echo configuration source.
- No file writes, dependencies, scripts, model requests or telemetry are
  performed by either inspector.

## Use the evidence

Request full detail before proposing changes. Use confirmed `sourceRoot`,
`aliases`, `componentAliases`, `stylesheetEntry` and installed hashes to assess
candidate destinations. Preserve modified and unresolved files. Compare hashes
again immediately before future writes; inspection evidence is not permission
to overwrite files.

Existing `add`/`install_plan` destination behavior is unchanged: they do not
accept this context automatically. Reconcile their proposed paths against the
full context, and stop on unresolved mappings. `scaffold_plan` retains its
explicit from-empty path. M2-01 will consume context and preconditions in a
shared incremental plan/apply contract; it must not treat summaries, missing
hashes or unknowns as complete write evidence.

## Acceptance

Shared and local fixtures cover Next root aliases, Vite source aliases,
referenced/inherited JSONC, Astro React islands, multiple applications, custom
UI folders, existing shadcn configurations, unsupported frameworks and missing
settings. Tests assert deterministic output, real baseline hash comparison,
read-only collection, byte/path limits, symlink containment, malformed JSON and
unknown versions. MCP tests require core parity, real output schemas, no fetch
and invalid-params failures. Release-artifact smoke calls the packed CLI on a
customized scaffold and the packed MCP inspector over stdio. Record actual
output sizes and unrun gates in the execution handoff; publish no remote
availability claim until the candidate has been released/deployed.
