# 10 — Project context before component selection

Status: implemented locally; npm/remote deployment pending. Task: M1-02.
Depends on M0 contracts/limits. Evidence and commands: [execution queue](../EXECUTION.md).

## Outcome and contract

Inspect the existing application before selecting or adapting registry items.
`packages/scaffold/src/project-context.ts` owns the pure contract and detection;
`project-collector.ts` is a separate Node-only adapter. The MCP worker imports
only the pure module. No new runtime dependency is required.

```ts
interface ProjectSnapshotV1 {
  schemaVersion: 1
  configs: Array<{
    path: string
    kind: "package" | "tsconfig" | "components" | "manifest" | "workspace"
    data: Record<string, unknown>
  }>
  capabilities: { fileWrites: boolean; dependencyInstall: boolean; browser: boolean }
  directories?: string[]
  files?: Array<{ path: string; sha256?: string; baselineSha256?: string; missing?: true }>
  notices?: string[] // finite generic collector notices, never arbitrary source
}
interface ProjectContextV1 {
  schemaVersion: 1
  framework: { name: "next" | "vite" | "astro" | "unknown"; version?: string }
  reactVersion?: string
  tailwindVersion?: string
  sourceRoot?: string
  aliases: Record<string, string[]>
  stylesheets: string[]
  locations: Partial<Record<"components" | "ui" | "utils" | "hooks" | "lib" | "theme", string>>
  iconLibrary?: string
  preset?: string
  registryVersion?: string
  installed: Array<{
    name: string; version?: string; integrity?: string
    files: Array<{ path: string; sha256: string; modified?: boolean }>
  }>
  observedFiles: Array<{ path: string; sha256: string; baselineSha256?: string; modified?: boolean }>
  capabilities: ProjectSnapshotV1["capabilities"]
  evidence: Array<{ field: string; source: string; confidence: "known" | "inferred" }>
  unknowns: string[]
}
```

`validateProjectSnapshot(value)` returns sanitized metadata or throws an
actionable bounded error. `parseProjectConfig(path, kind, content)` performs
local bounded JSON extraction (JSONC for TypeScript configuration only).
`inspectProject(snapshot, { details })` returns `{ schemaVersion: 1, summary,
context? }`. The exported `PROJECT_SNAPSHOT_SCHEMA` and
`PROJECT_INSPECTION_SCHEMA` describe the nested MCP wire values. Text JSON and
`structuredContent` are equal.

The default summary contains declared framework/version ranges, confirmed
locations, up to 32 alias pattern names, stylesheets, capabilities, configuration
count, inventory counts, the first eight unknowns and the full unknown count.
Full aliases, evidence, item metadata and observed-file hashes appear only with
`details: true`. Neither output contains source bodies. `observedFiles` preserves
explicitly selected native/custom files without claiming registry ownership.

Inventory counts refer to recorded registry files: `items`, `recordedFiles`,
`inspectedFiles`, `modifiedFiles`, `missingFiles`, `unknownFiles`. A file can be
inspected but still unknown for modification detection if its baseline is
absent. Missing files have explicit evidence; an unselected file is unverified,
not missing. Installed detail files use actual consumer target paths and current
SHA-256 hex digests. Per-item versions/integrities remain separate because a
project can contain items installed from different releases. `registryVersion`
is the manifest's last resolved selection, or a components.json selector when
there is no resolved manifest; it is not a claim that every item has that version.

## Local and host-supplied inspection

Run the source CLI from the repository until the paired npm packages are
published:

```sh
pnpm --filter logic2b dev inspect --cwd /path/to/project --json
pnpm --filter logic2b dev inspect --cwd /path/to/workspace --app-root apps/admin --json --details
pnpm --filter logic2b dev inspect --cwd /path/to/project --snapshot --details --file src/customers.tsx
```

`collectProjectSnapshot(cwd, { appRoot?, capabilities, files?, inventory? })`
reads package.json, tsconfig.json/jsconfig.json, components.json,
`.logic2b/manifest.json`, local tsconfig dependencies and declared workspace
package manifests. A small directory inventory supplies source-root evidence;
it does not enumerate source trees merely to count files. Default inspection
reads configuration only. `--details` enables hashing confirmed manifest target
files and `.logic2b/base` snapshots; repeatable `--file` selects additional inert
bytes. An explicit selected app root is relative to the working directory.

The CLI capability flags `--file-writes`, `--dependency-install`, `--browser`
are declarations by the host. All default to false and never trigger those
actions. The pure API requires all three booleans explicitly.

For MCP, pass the sanitized object to
`inspect_project({ snapshot, details?: boolean })`. The snapshot can be produced
by a host's own reader or the local CLI `--snapshot`. The tool performs no
network work, filesystem access, dependency installation or source execution.
It is read-only, idempotent and closed-world. Invalid input is JSON-RPC -32602
before any registry request. No remote application path or source upload is
needed. Unknown envelope/capability fields and raw `content`/`source` wrapper
fields are rejected; ordinary configuration keys are accepted and selectively
extracted. Scripts, package names, registry URLs, unrelated dependencies and
private URL/file dependency specifiers are not forwarded. Collector notices
are a finite generic enum rather than caller-written prose.

## Confirmed detections and uncertainty

Frameworks derive from explicit root package declarations for Next, Vite or
Astro, with React/Tailwind ranges from the same manifest. These are declared
ranges, not versions read from node_modules. The bounded parser supports
common numeric/partial/wildcard/comparator, OR, hyphen and prerelease ranges;
unsupported declarations remain unknown. Resolved manifest/item versions must
be exact supported versions. Multiple declarations or plausible
workspace applications return unknown plus app-root guidance. npm workspace
arrays/objects and pnpm's simple YAML package list support literal directories
and one directory wildcard such as `apps/*`. Complex workspace patterns require
explicit app selection; configuration, package and directory limits stay bounded.

TypeScript aliases honor local JSONC extends (including bounded arrays) and
local project references. Relative options use their declaring configuration's
origin; a child's explicit baseUrl can override inheritance. See the primary
[TypeScript extends](https://www.typescriptlang.org/tsconfig/extends.html) and
[paths](https://www.typescriptlang.org/tsconfig/paths.html) contracts. Exact aliases
win first, then the longest wildcard prefix. Equal-prefix overlaps or multiple
targets remain unresolved rather than choosing a speculative destination.
`components.json.aliases` resolves through those confirmed TypeScript mappings;
custom UI, hooks, helper and stylesheet locations are preserved.

External/package extends, missing/cyclic dependencies and paths leaving the
selected root produce explicit unknowns. Unresolved inheritance can alter
baseUrl, so local paths alone are insufficient to confirm a destination. A
safe explicit baseUrl resolves that uncertainty. Absolute/URL configuration
targets are rejected without echoing their contents. Runtime framework config
code is never loaded: Vite runtime aliases and stylesheet imports still need
host verification. Astro React island integration is reported separately when
not declared. `sourceRoot` inferred solely from an observed `src` directory is
marked inferred and never substitutes for a confirmed install location.

Root-relative public paths normalize a leading `./`; `.` represents the root
for directories. Traversal, absolute/Windows paths, unsafe separators, control
characters, duplicate/case-colliding targets, environment files, dependency,
Git and build directories are rejected. Local config-relative `..` is supported
only when its resolved target stays inside the selected app root. Symlinks may
resolve inside that root, but escapes are rejected even for missing leaves.
Readers reject special files before opening, bound actual streamed bytes and
check descriptor/path identity and metadata before/after reading. A concurrent
replacement fails with retry guidance rather than returning stale hashes.

| Resource | Shared limit |
| --- | --- |
| Configuration bytes, before extraction | 128 KiB total |
| Configuration entries | 32 |
| Inventory entries (directories + selected files) | 1,000 |
| Recorded manifest file entries | 1,000 |
| Relative path | 256 characters |
| Config inheritance depth / extends array | 8 / 4 |
| Alias patterns / targets per pattern | 128 / 8 |
| Selected or baseline file / aggregate file bytes | 1 MiB / 4 MiB |
| Compact / detailed JSON value | 16 KiB / 512 KiB |

Response budgets apply to the minified JSON value. MCP also carries the same
value as text, so protocol overhead and that second representation are extra.
CLI presentation whitespace is not part of the value budget. Full inventory
is opt-in; limits return smaller-app/selection guidance instead of truncating
file evidence silently.

## Installation and M2 integration

For an existing app, inspect first, read confirmed locations and item versions,
and obtain current/baseline hashes before proposing replacements. Preserve
native controls, custom wrappers, copy, columns and token overrides. Absence of
a logic2b manifest does not make existing shadcn/native components defects or
permit overwriting them. Resolve unknown destinations before writing.

`resolveRegistryFilePath(context, registryPath)` maps known UI/block/chart/hook/
lib/theme paths to confirmed destinations, including the configured utils
module. `locations.theme` is the configured Tailwind stylesheet entry; registry
`theme.css` maps next to that entry, matching the installer without treating
native `globals.css` or `tokens.css` as the installed registry file. It returns undefined when a destination is unsupported or unconfirmed;
it does not fall back to `src` or `@/components/ui`. Existing `install_plan` still
emits its documented default layout, so adapting custom destinations/imports is
explicit host work. This task does not add a preconditioned apply API.

For a genuinely empty project, use CLI template initialization or
`scaffold_plan`; its complete file set is intended for an empty directory.
The planner's notes and generated install prompts/rules distinguish that path
from an existing application. M2-01 should consume schemaVersion 1, confirmed
locations, per-item versions and observed SHA-256 preconditions, then request
source only for the bounded edits being planned. Capability declarations do not
replace host permission checks for applying changes.

## Acceptance and maintenance

Fixtures cover Next root aliases, Vite app references/src aliases, Astro React
islands, a two-app monorepo, custom UI folders, shadcn, unsupported frameworks,
partial configuration and local TypeScript inheritance. Tests compare inherited
and wildcard resolution with installed TypeScript, verify deterministic output
and unchanged tree fingerprints, and distinguish missing/unmodified/modified/
unknown inventory. Negative tests cover malformed/oversized inputs, unknown
schemas, unsafe paths, symlinks, FIFOs, concurrent replacement, metadata privacy,
capability validation and compact/detail budgets.

CLI tests execute the real command. MCP tests exercise typed/text/schema equality,
no-fetch validation and official-client stdio/HTTP errors. The packed-artifact
gate verifies inspect from the installed CLI and the seventeenth MCP tool,
including installed inventory across old and new registry item versions.
Exact completed commands and any unrun gates belong in docs/EXECUTION.md.
