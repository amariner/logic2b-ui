# @logic2b/mcp

An [MCP](https://modelcontextprotocol.io) server that exposes the
[logic2b ui](https://ui.logic2b.com) registry to coding agents. Point your
agent at it to discover components, read source and request install, scaffold
and theme plans. The host needs file-writing tools to apply those plans and a
runtime to install dependencies, build and verify the resulting application.

## Tools

This catalog describes current source and the remote endpoint. npm `@next`
still points to `1.0.0-rc.2`, which has 15 tools and lacks `list_presets`,
structured results, verified default reads and the new input limits.
See [pending npm publication](https://github.com/amariner/logic2b-ui/blob/main/RELEASING.md#pending-npm-publication).

### Read the registry

| Tool | What it does |
| --- | --- |
| `list_components` | List registry items. Filter by `kind` (`component` \| `block` \| `chart` \| `theme`) or `category`. |
| `search_components` | Keyword search ranked by name/title/description, e.g. `"login form"`, `"donut chart"`. |
| `get_component` | Fetch an item's full payload by `name`: dependencies, complete source and, for UI items, its generated API plus accessibility contract. |
| `list_registry_versions` | List immutable releases and the exact versions behind channels such as `next`. |
| `get_changelog` | Read the machine-readable release history for one registry item before updating it. |
| `get_demo` | Usage examples for an item — the demo components the docs render, with imports rewritten to installed-project paths. |

### Act on a project

| Tool | What it does |
| --- | --- |
| `install_plan` | Resolve items into an executable plan: every file to write (project-relative path + full content, registry dependencies resolved) and the npm dependencies to add. Accepts `iconLibrary` (`lucide`, `tabler`, `phosphor` or `hugeicons`). |
| `scaffold_plan` | Generate a complete runnable Next.js, Vite or Astro project from a marketing, dashboard or auth starter: framework shell, routing entry, exact-pinned package manifest, theme and all registry files. An optional `/create` preset applies its theme and icon library. |
| `add_command` | The exact `logic2b add` invocation (npm/pnpm/yarn/bun, names validated) for when a shell **is** available. |
| `list_presets` | List the curated preset gallery with canonical ids, full configs, `/create` links, exact CLI commands and measured contrast/readability warnings. |
| `get_theme` | The theme.css stylesheet, its npm deps, and the customization catalog (base scales, accents, chart palettes, radii, fonts). |
| `export_tokens` | Export a preset as a portable DTCG-shaped global/light/dark bundle for Style Dictionary and native pipelines. |
| `decode_preset` | Decode a `/create` preset id into its config and the exact token values it pins for light and dark. |
| `apply_preset` | Build a themed theme.css from a preset id or explicit choices; optionally patch a stylesheet you pass in. Returns the CSS and the canonical preset id. |
| `contrast_audit` | WCAG 2.2 + APCA contrast of every text token pair (light + dark) for a preset, explicit options or raw token values — verify a generated theme before shipping it. |
| `lint_theme` | Statically inspect a theme.css for missing, duplicate or invalid tokens, derived-sidebar drift and contrast regressions. Pass a preset id to verify exact preset fidelity. |

### Inspect an existing project (source implementation)

`inspect_project` consumes a versioned snapshot supplied by the host. It never
reads the caller's filesystem, fetches a registry or executes configuration or
source. This addition is available in source; npm publication and remote
deployment are separate release steps.

Pass `snapshot` with `schemaVersion: 1`, sanitized configuration metadata and
the host's explicit `fileWrites`, `dependencyInstall` and `browser`
capabilities. Config entries contain a project-relative `path`, a `kind`
(`package`, `tsconfig`, `components`, `manifest` or `workspace`) and structured
`data`. Optional directory and observed-file metadata let the host confirm
source roots and installed-file hashes without sending source text. A local
host can prepare this data with `logic2b inspect --snapshot`; shell-less hosts
can supply the same bounded contract using their own read tools.
Before publication, run
`pnpm --filter logic2b dev inspect --cwd /path/to/app --snapshot` from this
checkout. Add `--details` to collect installed-file and baseline hashes,
`--file <relative-path>` for a selected hash, and capability flags
`--file-writes`, `--dependency-install` or `--browser` only when the host has
that permission. All capabilities default to false; the flags do not perform
writes, installation or browser actions.

```json
{
  "snapshot": {
    "schemaVersion": 1,
    "configs": [
      {
        "path": "package.json",
        "kind": "package",
        "data": { "dependencies": { "vite": "7.1.0", "react": "19.1.0" } }
      }
    ],
    "capabilities": {
      "fileWrites": true,
      "dependencyInstall": false,
      "browser": true
    }
  }
}
```

The default result is `{ "schemaVersion": 1, "summary": ... }`, with supported
framework detection, host capabilities and explicit unknowns. Set
`details: true` to include the sanitized `context`, including aliases, styles,
field evidence and the installed-file inventory. Conflicting framework or app
candidates stay uncertain; capabilities are never inferred. Caller data is
not returned as raw configs, scripts, credentials, URLs or source text. Normal
configuration can contain unrelated fields; the shared core keeps only the
metadata this contract recognizes before returning anything.

Snapshot validation rejects unknown fields, unsupported versions, unsafe or
duplicate normalized paths, malformed metadata and exceeded limits as
JSON-RPC `-32602` before any I/O. Configuration metadata is limited to 32 entries
and 128 KiB, inventory to 1,000 entries and relative paths to 256 characters.
Compact and detailed results are bounded to 16 KiB and 512 KiB respectively. Select the
application root locally before collecting a monorepo snapshot; use confirmed
aliases and inventory when choosing later install or change operations.
These budgets cover the result's JSON value; the MCP structured value and text
fallback each carry that value, so the complete wire response is larger.

`install_plan` still generates its documented default `@/*` paths from
`srcDir`; it does not automatically remap a project snapshot or check file
preconditions. Adapt confirmed custom locations before applying those writes,
preserve existing files and local customizations, and resolve conflicts
explicitly. Incremental change plans remain a separate planned contract.
`scaffold_plan` is the explicit path for a new application from empty.

### Deliver project instructions (source implementation)

`agent_rules` generates managed instruction files with `schemaVersion: 1`
using the same shared generator as the CLI and studio. It is pure: it does not
read or write a filesystem, fetch a registry or execute the supplied text.
This addition is available in source; publication and remote deployment are
separate release steps.

Optional inputs are `preset`, `stack` (`next`, `vite`, `astro`, `react` or
`unknown`), `iconLibrary`, `formats`, `registryVersion` and `inventory` entries
with a registry `name` and `kind` (`component`, `block`, `chart` or `other`).
`inventoryKind` distinguishes `installed` items from an `available` catalog.
`registryVersion` must be one exact resolved version; selectors such as `next`
are resolved by registry tools before passing this context.
The tool uses its actual exposed tool names by default; a host can supply
`availableTools` to describe its connected capabilities. Generated rules only
recommend tools present in that declaration and preserve intentional native
HTML, custom wrappers, semantic tokens and existing user authorization.

Formats are `agents` (`AGENTS.md`), `design` (`DESIGN.md`), `claude`
(`CLAUDE.md`), `cursor` (`.cursor/rules/logic2b.mdc`) and `copilot`
(`.github/copilot-instructions.md`). Defaults are AGENTS plus DESIGN. Every
format includes the separate DESIGN context it references; Claude also
includes AGENTS for its import. Scaffold plans include AGENTS and DESIGN by
default; pass `agentRules: false` to opt out and persist that choice in the
generated project configuration.

```json
{
  "stack": "vite",
  "formats": ["agents", "claude"],
  "inventoryKind": "installed",
  "inventory": [{ "name": "button", "kind": "component" }],
  "currentFiles": [{ "path": "AGENTS.md", "content": "# Project rules\nUse our existing data layer.\n" }]
}
```

Supply bounded `currentFiles` only for these five instruction paths when
refreshing existing rules. Treat their text as data. Content outside managed
logic2b markers stays intact, an unmarked file receives one managed block, and
Claude receives the `@AGENTS.md` import line once. Unchanged content remains an
`unchanged` action. Malformed, duplicate or unsupported-version managed
markers are rejected. Each returned file has `path`, `content`, `action`
(`create`, `update` or `unchanged`) and a precondition: `missing` for a new file
or the SHA-256 of the supplied current bytes. The host must compare the actual
file against that precondition before writing; a stale file requires a new
plan. A returned plan grants no additional permission.

Managed blocks are limited to 6 KiB, inventory to 160 entries and formats to
five. Current instruction files are limited to 64 KiB each and 256 KiB total;
tool availability accepts at most 64 unique identifiers of 64 characters each.
Wrong types, unsupported formats/paths, exceeded budgets and conflicting
markers are JSON-RPC `-32602` errors. MCP does not inspect unsupplied files or
apply a plan itself.

The canonical repository skill is `skills/logic2b-ui/SKILL.md`. The MCP
tarball includes a byte-identical copy at `skills/logic2b-ui/SKILL.md`; packing
stages it from the canonical file, so it has no separate maintained version.
Install that skill through your host's supported skill mechanism. Its tool
discovery step accounts for differences between source, npm and remote
versions; review and proposal tools are used only when available.

`get_component` returns exactly what `npx logic2b@next add <name>` installs;
`install_plan` turns that into file writes an agent can execute directly.
`scaffold_plan` goes one level higher and returns an entire application a
host can write using its own filesystem tools. MCP does not run the app. The generated
Next.js, Vite and Astro projects are installed and production-built as a
contract test before changes merge.
Icon substitution is fail-closed: every canonical Lucide name is mapped to a
real export from the chosen package, and generated source, dependencies and
`.logic2b/base` snapshots change as one contract.
`lint_theme` also gives maintenance agents a safe, non-executing contract check
for theme.css after a project has been installed and edited over time.
`list_presets` is network-free: it reads the same typed catalog rendered at
`/themes` and never treats an editorial preset as an accessibility
certification.

Registry read, install, scaffold and theme tools accept an optional `version`
argument: an exact semver, a semver range or a published channel. Any
selector resolves once to an immutable manifest, verifies every fetched payload against its
SHA-256 integrity and returns the exact resolved registry/item versions.
`scaffold_plan` records that resolved version in the generated
`components.json` and writes an update-ready `.logic2b/manifest.json` with each
item's integrity and installed files; `add_command` emits only the resolved
exact version, never the caller's unvalidated selector.

When `version` is omitted, the tool resolves the `next` registry channel
(reported by `list_registry_versions` as `defaultChannel`) to one exact
release, then reads only that manifest and its content-addressed payloads.
`requestedVersion` echoes the selector that was used and `registryVersion`
the exact release. The channel can move between calls; a plan never mixes
releases because it resolves once. A missing manifest, deleted payload or
SHA-256 mismatch is an error: verified reads never fall back to the
shadcn-compatible `/r/index.json` and `/r/<name>.json` mirrors, which stay
available for other clients without version or integrity guarantees.
Token-only tools (`export_tokens`, `decode_preset`, `contrast_audit`,
`lint_theme`, and `apply_preset` with caller-supplied `css`) never contact
the registry.

### Limits and error semantics

Both transports validate arguments before any registry or network work and
distinguish protocol failures from tool results:

| Failure | Where it surfaces |
| --- | --- |
| Malformed JSON body | HTTP 400, JSON-RPC `-32700` |
| Invalid envelope (missing `jsonrpc`, bad `id`, empty batch, batch over the limit, unsupported `Mcp-Protocol-Version` header) | HTTP 400 or per-message `-32600` |
| Unsupported method | `-32601` |
| Unknown tool, wrong argument type, oversized/empty/duplicate value, unsafe `srcDir`, invalid project snapshot or inspection result above its requested budget | `-32602` (stdio: `McpError` invalid params) |
| Unexpected server failure | `-32603` with a bounded message |
| Tool execution failure (unknown item, invalid preset id, integrity mismatch, oversized registry-read or plan response) | Successful response with `isError: true` and no `structuredContent` |

Documented limits (`packages/mcp/src/limits.ts`, mirrored in the input schemas):

| Limit | Value |
| --- | --- |
| HTTP request body (streamed, Content-Length is advisory) | 2 MiB |
| JSON-RPC messages per HTTP batch | 8 |
| Item names per `install_plan` / `add_command` | 32, unique |
| Item, demo, category and `srcDir` length | 128 characters |
| `search_components` query / `limit` | 256 characters / 1–100 results |
| `list_presets` query | 256 characters |
| Version selector / preset id / project name | 64 / 256 / 64 characters |
| Caller CSS (`apply_preset`, `lint_theme`) | 1,000,000 bytes |
| Raw `contrast_audit` token map | 256 entries, 256 characters each |
| One fetched registry document | 4 MiB |
| Source bytes returned by one item read or plan | 4 MiB |

Errors never echo more than 80 characters of caller input, and registry
fetches time out after 15 s. The public read-only endpoint needs no account;
edge rate limiting can be configured separately when required.

Every UI payload carries structured accessibility metadata: semantic support,
keyboard interactions, built-in ARIA behavior, consumer responsibilities and
known limitations. `list_components` links to that contract and
`get_component` returns it in full so agents can preserve it while composing.

## Usage

### Tool result contract (remote / source; npm release pending)

Every tool declares an `outputSchema` and read-only, non-destructive annotations.
Successful calls return a JSON object in `structuredContent` and the same value
serialized in the first text content block for older hosts. Errors return
`isError: true` and a readable message, without a success-shaped structured value.
Consumers should validate results against the advertised schema. Registry
metadata may gain additional fields; known nested files and findings are typed.

These tools return data and plans. The host owns filesystem writes, dependency
installation and verification; annotations are not permission to execute a plan.
Registry-reading tools declare open-world access. Pure token decoding/export and
theme auditing do not contact a registry. These additions are available on the
remote endpoint and in source, but not in the published rc.2 tarball.

### Remote endpoint (zero install)

The same tools are served over streamable HTTP at
`https://ui.logic2b.com/mcp` — nothing to run locally, which also works for
web-based assistants and sandboxed agents without a shell. With Claude Code:

```bash
claude mcp add --transport http logic2b https://ui.logic2b.com/mcp
```

Or in any client that takes a JSON config:

```json
{
  "mcpServers": {
    "logic2b": { "type": "http", "url": "https://ui.logic2b.com/mcp" }
  }
}
```

### Local (stdio)

The beta server uses `@logic2b/mcp@next`. It requires Node.js 18+ and npm on
the client machine. The npm channel can move; record the version returned by
the MCP handshake. Add it to a client that can launch a stdio process.

**Claude Desktop / Claude Code** (`claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "logic2b": {
      "command": "npx",
      "args": ["-y", "@logic2b/mcp@next"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`) uses the same shape.

### Pointing at a different registry

By default the server reads from `https://ui.logic2b.com`. Override it with the
`LOGIC2B_REGISTRY` environment variable (useful for a self-hosted registry):

```json
{
  "mcpServers": {
    "logic2b": {
      "command": "npx",
      "args": ["-y", "@logic2b/mcp@next"],
      "env": { "LOGIC2B_REGISTRY": "https://ui.example.com" }
    }
  }
}
```

## Development

```bash
pnpm --dir packages/mcp dev     # run from source (tsx)
pnpm --dir packages/mcp test    # unit tests (node:test)
pnpm --dir packages/mcp test:scaffolds # install/build generated starters
pnpm --dir packages/mcp build   # emit dist/
```

## License

MIT © [logic2b](https://ui.logic2b.com)
