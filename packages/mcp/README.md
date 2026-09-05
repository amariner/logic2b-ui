# @logic2b/mcp

An [MCP](https://modelcontextprotocol.io) server that exposes the
[logic2b ui](https://ui.logic2b.com) registry to coding agents. Point your
agent at it and it can discover, read, theme and **install** every component,
block and chart — without leaving the conversation and without a shell.

## Tools

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
| `get_theme` | The theme.css stylesheet, its npm deps, and the customization catalog (base scales, accents, chart palettes, radii, fonts). |
| `export_tokens` | Export a preset as a portable DTCG-shaped global/light/dark bundle for Style Dictionary and native pipelines. |
| `decode_preset` | Decode a `/create` preset id into its config and the exact token values it pins for light and dark. |
| `apply_preset` | Build a themed theme.css from a preset id or explicit choices; optionally patch a stylesheet you pass in. Returns the CSS and the canonical preset id. |
| `contrast_audit` | WCAG 2.2 + APCA contrast of every text token pair (light + dark) for a preset, explicit options or raw token values — verify a generated theme before shipping it. |
| `lint_theme` | Statically inspect a theme.css for missing, duplicate or invalid tokens, derived-sidebar drift and contrast regressions. Pass a preset id to verify exact preset fidelity. |

`get_component` returns exactly what `npx logic2b add <name>` installs;
`install_plan` turns that into file writes an agent can execute directly.
`scaffold_plan` goes one level higher and returns an entire application an
agent can create without invoking a scaffolder or having a shell. The generated
Next.js, Vite and Astro projects are installed and production-built as a
contract test before changes merge.
Icon substitution is fail-closed: every canonical Lucide name is mapped to a
real export from the chosen package, and generated source, dependencies and
`.logic2b/base` snapshots change as one contract.
`lint_theme` also gives maintenance agents a safe, non-executing contract check
for theme.css after a project has been installed and edited over time.

Registry read, install, scaffold and theme tools accept an optional `version`
argument: an exact semver, a semver range or a published channel. It resolves
once to an immutable manifest, verifies every fetched payload against its
SHA-256 integrity and returns the exact resolved registry/item versions.
`scaffold_plan` records that resolved version in the generated
`components.json` and writes an update-ready `.logic2b/manifest.json` with each
item's integrity and installed files; `add_command` emits only the resolved
exact version, never the caller's unvalidated selector.

Every UI payload carries structured accessibility metadata: semantic support,
keyboard interactions, built-in ARIA behavior, consumer responsibilities and
known limitations. `list_components` links to that contract and
`get_component` returns it in full so agents can preserve it while composing.

## Usage

### Tool result contract (source / next release)

Every tool declares an `outputSchema` and read-only, non-destructive annotations.
Successful calls return a JSON object in `structuredContent` and the same value
serialized in the first text content block for older hosts. Errors return
`isError: true` and a readable message, without a success-shaped structured value.
Consumers should validate results against the advertised schema. Registry
metadata may gain additional fields; known nested files and findings are typed.

These tools return data and plans. The host owns filesystem writes, dependency
installation and verification; annotations are not permission to execute a plan.
Registry-reading tools declare open-world access. Pure token decoding/export and
theme auditing do not contact a registry. These additions are implemented in
the source checkout and are not included in the previously published rc.2 tarball.

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

The server speaks stdio and needs no configuration. Add it to any MCP client.

**Claude Desktop / Claude Code** (`claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "logic2b": {
      "command": "npx",
      "args": ["-y", "@logic2b/mcp"]
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
      "args": ["-y", "@logic2b/mcp"],
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
