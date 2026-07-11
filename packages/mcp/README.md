# @logic2b/mcp

An [MCP](https://modelcontextprotocol.io) server that exposes the
[logic2b ui](https://ui.logic2b.com) registry to coding agents. Point your
agent at it and it can discover and read every component, block and chart —
including full source — without leaving the conversation.

## Tools

| Tool | What it does |
| --- | --- |
| `list_components` | List registry items. Filter by `kind` (`component` \| `block` \| `chart` \| `theme`) or `category`. |
| `search_components` | Keyword search ranked by name/title/description, e.g. `"login form"`, `"donut chart"`. |
| `get_component` | Fetch an item's full payload by `name`: dependencies, registry dependencies and the complete source of every file. |

`get_component` returns exactly what `npx logic2b add <name>` installs, so an
agent can read a component's source or hand it to you to drop into a project.

## Usage

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
