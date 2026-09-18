# @logic2b/mcp

An [MCP](https://modelcontextprotocol.io) server that exposes the
[logic2b ui](https://ui.logic2b.com) registry to coding agents. Point your
agent at it to discover components, read source and request install, scaffold
and theme plans. The host needs file-writing tools to apply those plans and a
runtime to install dependencies, build and verify the resulting application.

## Tools

This catalog describes the current source candidate: 20 tools with
structured results, verified default reads and bounded inputs. Older
`1.0.0-rc.2` installations have 15 tools and lack these additions. Confirm
`inspect_project`, `review_ui` and `change_plan` appear in `tools/list` before using them; source changes need
a package release or endpoint deployment to become available to other hosts.

### Inspect an existing project

`inspect_project` accepts a version-1 host-supplied `snapshot` with bounded
configuration JSON strings and selected file SHA-256 hashes. It has no remote
filesystem or network access and never executes source. Default `detail:
"summary"` returns compact counts and uncertainty; `detail: "full"` adds the
context, confirmed aliases, installed modification evidence and capabilities.
Use the full context before planning writes; existing install plans do not
consume it automatically. Unsupported versions, malformed JSON, escapes and
oversized inputs are invalid-params errors. Do not send environment files,
credentials or source bodies merely to count files.

Limits: 128 KiB configuration bytes, 32 configuration targets, 1 MiB serialized
snapshot, 1,000 file hashes and 256-character relative paths. Omitted host
capabilities remain disabled and unknown. Full inventory is opt-in above the
16 KiB summary budget. See the repository's project-context guide for the
snapshot schema, inheritance limits and CLI collector workflow.

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
| `agent_rules` | Generate bounded AGENTS.md/DESIGN.md and optional Claude, Cursor and Copilot formats without network access; merge managed blocks with existing project instructions. |
| `review_ui` | Source candidate: statically review host-supplied TSX/JSX with four shared token-policy/accessibility rules, source evidence and explicit unknowns. No network, filesystem reads or source execution. |
| `change_plan` | Source candidate: assemble explicit candidate files and host-supplied snapshot evidence into a strict hashed plan with preconditions, conflicts and unsupported work. No network, filesystem access or source execution. |
| `scaffold_plan` | Generate a complete runnable Next.js, Vite or Astro project from a marketing, dashboard or auth starter: framework shell, routing entry, exact-pinned package manifest, theme and all registry files. An optional `/create` preset applies its theme and icon library. |
| `add_command` | The exact `logic2b add` invocation (npm/pnpm/yarn/bun, names validated) for when a shell **is** available. |
| `list_presets` | List the curated preset gallery with canonical ids, full configs, `/create` links, exact CLI commands and measured contrast/readability warnings. |
| `get_theme` | The theme.css stylesheet, its npm deps, and the customization catalog (base scales, accents, chart palettes, radii, fonts). |
| `export_tokens` | Export a preset as a portable DTCG-shaped global/light/dark bundle for Style Dictionary and native pipelines. |
| `decode_preset` | Decode a `/create` preset id into its config and the exact token values it pins for light and dark. |
| `apply_preset` | Build a themed theme.css from a preset id or explicit choices; optionally patch a stylesheet you pass in. Returns the CSS and the canonical preset id. |
| `contrast_audit` | WCAG 2.2 + APCA contrast of every text token pair (light + dark) for a preset, explicit options or raw token values — verify a generated theme before shipping it. |
| `lint_theme` | Statically inspect a theme.css for missing, duplicate or invalid tokens, derived-sidebar drift and contrast regressions. Pass a preset id to verify exact preset fidelity. |

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
| Unknown tool, wrong argument type, oversized/empty/duplicate value, unsafe `srcDir` | `-32602` (stdio: `McpError` invalid params) |
| Unexpected server failure | `-32603` with a bounded message |
| Tool execution failure (unknown item, invalid preset id, integrity mismatch, oversized response) | Successful response with `isError: true` and no `structuredContent` |

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
| Source bytes returned by one registry item read or registry plan | 4 MiB |
| `change_plan` candidates / content | 1–32 files; 128 KiB each, 256 KiB total UTF-8 |
| Change request/plan / path length | 2 MiB serialized / 256 characters |

Errors never echo more than 80 characters of caller input, and registry
fetches time out after 15 s. The public read-only endpoint needs no account;
edge rate limiting can be configured separately when required.

Every UI payload carries structured accessibility metadata: semantic support,
keyboard interactions, built-in ARIA behavior, consumer responsibilities and
known limitations. `list_components` links to that contract and
`get_component` returns it in full so agents can preserve it while composing.

## Usage

### Tool result contract (source candidate)

Every tool declares an `outputSchema` and read-only, non-destructive annotations.
Successful calls return a JSON object in `structuredContent` and the same value
serialized in the first text content block for older hosts. Errors return
`isError: true` and a readable message, without a success-shaped structured value.
Consumers should validate results against the advertised schema. Registry
metadata may gain additional fields; known nested files and findings are typed.

These tools return data and plans. The host owns filesystem writes, dependency
installation and verification; annotations are not permission to execute a plan.
Registry-reading tools declare open-world access. Pure token decoding/export and
theme auditing do not contact a registry. The live catalog is authoritative:
check `tools/list` for the deployed or installed tool and its schema. Source
additions require their own package release or endpoint deployment.

### Remote endpoint (zero install)

Registry tools are served over streamable HTTP at
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


## Agent rules (source candidate)

`agent_rules` accepts optional `preset`, `stack` (`react`, `next`, `vite`,
`astro`), `iconLibrary`, exact installed `registryVersion`, `formats`
(`agents`, `claude`, `cursor`, `copilot`) and installed `items` with name and
optional registry type/categories. Omitted inventory is explicitly unknown.
Every format includes AGENTS.md and DESIGN.md. The managed rules block is
at most 6 KiB; inventory truncation is reported. Conflicting preset/icon
selections reject. No source or network is read by this tool.

`scaffold_plan` includes these two documents by default; `agentRules: false`
omits them. For an existing project, merge the returned marker block only,
append if absent and stop on malformed/duplicate/future-version markers.
Do not replace the whole existing file. Keep text outside markers and existing
Cursor frontmatter unchanged. Claude's import is `@AGENTS.md`, appended once.
A file plan supplies reference material, not additional execution authority.

The tarball includes `skills/logic2b-ui/SKILL.md`, copied from the repository's
canonical skill. Copy that directory into your host's configured skill location
if desired; running npx does not install the skill into an editor automatically.
The skill uses the running tool catalog and does not require planned tools.
Check `tools/list` before using these source-candidate additions from npm.

## Static UI review (source candidate)

`review_ui` accepts the version-1 shared review request directly:

```json
{
  "schemaVersion": 1,
  "files": [{
    "path": "src/CustomerPage.tsx",
    "content": "export const Page = () => <input aria-label=\"Customer name\" />",
    "labelContext": "partial"
  }],
  "scope": ["tokens", "a11y"],
  "policy": { "semanticColors": true }
}
```

The host selects and supplies source; neither remote nor local MCP assumes
filesystem access. Limits: 64 TSX/JSX files, 256 KiB of total UTF-8 source,
256-character normalized relative paths and a 50,000-node traversal budget.
Unsupported versions/fields, unsafe or duplicate paths and invalid scopes or
policy values reject. The tool never imports or executes submitted source.

`L2B-TOK-001` requires explicit `semanticColors: true` and enforces a project
design policy for supported literal colors. `L2B-A11Y-001..003` cover supported
native dialogs, controls and buttons. Missing names become defects only when
the host declares `labelContext: "complete"` and the supported source proves
absence. Default/partial context, custom components, external labels, spreads
and dynamic semantics remain unknown. Multiple files do not resolve labels
across them. Do not assert complete context for unresolved compositions.

The result includes `schemaVersion: 1`, summary, evidence-backed findings,
unknowns, suppressed findings/reasons, evaluated/disabled rules, assumptions
and `truncated`. A parse failure produces an unknown, not a passing file.
The arrays are capped at 512 entries and each file allows 128 reasoned
suppression directives. A truncated result is incomplete. No registry version
is returned because the engine never reads a registry. Structured content and
the text fallback contain the same result.

This source addition needs a package release or endpoint deployment; check
`tools/list` before relying on it. See [static UI review](https://ui.logic2b.com/docs/review)
for rule examples and intentional exceptions. Unknown is not pass; retain
independent keyboard, screen-reader and application behavior checks.

## Incremental changes (source candidate)

`change_plan` assembles source candidates; the host authors the new code from
current project files and preserves intended customizations. It does not
synthesize business logic, fetch upstream updates or materialize the result.
Check the live tool catalog before relying on this source addition.

```json
{
  "schemaVersion": 1,
  "registryVersion": "1.0.0-rc.17",
  "snapshot": {
    "schemaVersion": 1,
    "appRoot": ".",
    "configurations": [],
    "files": []
  },
  "candidates": [{
    "path": "src/customer-filters.ts",
    "content": "export const customerStatuses = ['active', 'archived'] as const;\n",
    "reason": "Share status choices for customer filters."
  }],
  "missingFiles": ["src/customer-filters.ts"]
}
```

Use the application's exact registry release. `registryVersion` is optional
only when the snapshot's install manifest supplies a resolved version.
Channels/ranges/URLs reject; a declaration contradicting the observed manifest
is a conflict. The tool never contacts a registry to verify that release's
existence. No filesystem access is assumed, even for the local stdio server.

Existing targets need current SHA-256 hashes in `snapshot.files` or original
configuration bytes in `snapshot.configurations`. Conflicting configuration
bytes/hashes or present/missing assertions produce conflicts. Omission from
the inventory is not proof of absence; creates need explicit `missingFiles`.
Request full `inspect_project` context before choosing destinations, then have
the host collect any missing evidence. An inspection result is not a snapshot.

The version-1 result includes `id`, `appRoot`, exact `registryVersion`,
create/update `operations`, derived `dependencies`, `conflicts`, `verification`
guidance and `unsupported`. Operations carry before/after hashes, full source
and reasons; unchanged candidates are omitted. `id` hashes the canonical plan
excluding itself. It is integrity evidence, not a signature or authorization.
The structured result and JSON text fallback are identical. Invalid requests
are sanitized JSON-RPC `-32602` errors; successful results may still carry
conflicts or unsupported work that prevent apply.

There are 1–32 candidates, at most 128 KiB per file and 256 KiB total UTF-8
source, 256-character relative paths and 2 MiB serialized requests/plans.
Project snapshot limits above and the 2 MiB HTTP envelope cap also apply.
Requests normalize harmless relative separators but reject traversal, absolute
paths, aliases, duplicate/case-colliding or ancestor/descendant targets,
environment/Git/dependency paths, reserved names and `.logic2b` or
`.logic2b-change-*` transaction targets. Plan paths are canonical.

Include a root `package.json` candidate for dependency changes; an update also
needs its original configuration bytes. The four ordinary dependency sections
are analyzed. Removals, section moves, ambiguous versions, local/Git/URL
locators, changed lifecycle hooks and changes to bundled dependencies,
overrides, resolutions, `pnpm`, workspaces or `packageManager` are unsupported.
Select a nested application as `appRoot` before changing its package manifest.

The host must review the complete candidates and validate every plan/content
hash and current file precondition before an authorized apply. The source CLI
provides `change apply`, `change status` and UUID-based `change recover`, with
dry runs and journals that preserve newer edits and preexisting applied files.
An MCP response performs none of those writes. No dependency installation,
script, verification command or automatic deletion is part of planning.
See [incremental changes](https://ui.logic2b.com/docs/changes) for local
transaction recovery and the stable-workspace requirement.
