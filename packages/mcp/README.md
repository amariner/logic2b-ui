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
| `get_component` | Fetch an item's full payload by `name`: dependencies, registry dependencies and the complete source of every file. |

### Act on a project

| Tool | What it does |
| --- | --- |
| `install_plan` | Resolve items into an executable plan: every file to write (project-relative path + full content, registry dependencies resolved) and the npm dependencies to add. No command to run — write the files, add the deps, done. |
| `get_theme` | The theme.css stylesheet, its npm deps, and the customization catalog (base scales, accents, chart palettes, radii, fonts). |
| `decode_preset` | Decode a `/create` preset id into its config and the exact token values it pins for light and dark. |
| `apply_preset` | Build a themed theme.css from a preset id or explicit choices; optionally patch a stylesheet you pass in. Returns the CSS and the canonical preset id. |

`get_component` returns exactly what `npx logic2b add <name>` installs;
`install_plan` turns that into file writes an agent can execute directly.

## Usage

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
pnpm --dir packages/mcp build   # emit dist/
```

## License

MIT © [logic2b](https://ui.logic2b.com)
