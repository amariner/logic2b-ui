#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import {
  DEFAULT_REGISTRY,
  fetchIndex,
  fetchItem,
  filterIndex,
  kindOf,
  searchIndex,
  type IndexItem,
} from "./registry.ts"

const KINDS = ["component", "block", "chart", "theme"] as const

const tools = [
  {
    name: "list_components",
    description:
      "List the items available in the logic2b ui registry (components, blocks, charts and the theme). Optionally filter by kind or category. Returns each item's name, kind, title and description.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: KINDS,
          description: "Only return items of this kind.",
        },
        category: {
          type: "string",
          description:
            'Only return items tagged with this category (e.g. "charts-area", "authentication", "dashboard").',
        },
      },
    },
  },
  {
    name: "search_components",
    description:
      "Search the logic2b ui registry by keyword. Ranks by name/title/description match and returns the best-matching items. Use this to find a component, block or chart to install.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: 'Free-text query, e.g. "login form", "donut chart", "data table".',
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_component",
    description:
      "Fetch a registry item's full payload by name: its dependencies, registry dependencies and the complete source of every file. Use this to read or install a component, block or chart. The npm CLI equivalent is `npx logic2b add <name>`.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: 'The item name, e.g. "button", "login-01", "chart-area-04".',
        },
      },
      required: ["name"],
    },
  },
] as const

function summarize(item: IndexItem) {
  return {
    name: item.name,
    kind: kindOf(item),
    title: item.title ?? item.name,
    description: item.description,
    categories: item.categories,
  }
}

function textResult(value: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(value, null, 2) },
    ],
  }
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  }
}

const server = new Server(
  { name: "logic2b-ui", version: "0.1.0" },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params
  const base = DEFAULT_REGISTRY

  try {
    if (name === "list_components") {
      const index = await fetchIndex(base)
      const filtered = filterIndex(index, {
        kind: (args as { kind?: (typeof KINDS)[number] }).kind,
        category: (args as { category?: string }).category,
      })
      return textResult({
        registry: base,
        count: filtered.length,
        items: filtered.map(summarize),
      })
    }

    if (name === "search_components") {
      const query = String((args as { query?: unknown }).query ?? "")
      if (!query.trim()) return errorResult('The "query" argument is required.')
      const limit = Number((args as { limit?: unknown }).limit) || 20
      const index = await fetchIndex(base)
      const results = searchIndex(index, query, limit)
      return textResult({
        registry: base,
        query,
        count: results.length,
        items: results.map(summarize),
      })
    }

    if (name === "get_component") {
      const itemName = String((args as { name?: unknown }).name ?? "")
      if (!itemName.trim()) return errorResult('The "name" argument is required.')
      const item = await fetchItem(base, itemName)
      return textResult(item)
    }

    return errorResult(`Unknown tool: ${name}`)
  } catch (err) {
    return errorResult(
      `logic2b-mcp error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // Logs must go to stderr — stdout is the JSON-RPC channel.
  console.error(`logic2b-ui MCP server ready (registry: ${DEFAULT_REGISTRY})`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
