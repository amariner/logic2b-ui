import {
  DEFAULT_REGISTRY,
  fetchIndex,
  fetchItem,
  filterIndex,
  kindOf,
  searchIndex,
  type FetchLike,
  type IndexItem,
} from "./registry.ts"

export const SERVER_INFO = { name: "logic2b-ui", version: "0.1.0" } as const

export const KINDS = ["component", "block", "chart", "theme"] as const

export const TOOLS = [
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

// Type alias (not interface) on purpose: aliases get an implicit index
// signature, which the SDK's CallToolResult requires for assignability.
export type ToolResult = {
  content: { type: "text"; text: string }[]
  isError?: boolean
}

export interface RunToolOptions {
  /** Registry base URL used both to fetch data and in result payloads. */
  base?: string
  /** Fetch implementation (defaults to global fetch); lets the remote MCP
   *  worker read the co-located static assets instead of the network. */
  fetchImpl?: FetchLike
}

function summarize(item: IndexItem) {
  return {
    name: item.name,
    kind: kindOf(item),
    title: item.title ?? item.name,
    description: item.description,
    categories: item.categories,
  }
}

function textResult(value: unknown): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  }
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  }
}

/** Execute one registry tool by name. Transport-agnostic: the stdio server and
 *  the remote /mcp worker both dispatch through here. */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  { base = DEFAULT_REGISTRY, fetchImpl }: RunToolOptions = {}
): Promise<ToolResult> {
  try {
    if (name === "list_components") {
      const index = await fetchIndex(base, fetchImpl)
      const filtered = filterIndex(index, {
        kind: args.kind as (typeof KINDS)[number] | undefined,
        category: args.category as string | undefined,
      })
      return textResult({
        registry: base,
        count: filtered.length,
        items: filtered.map(summarize),
      })
    }

    if (name === "search_components") {
      const query = String(args.query ?? "")
      if (!query.trim()) return errorResult('The "query" argument is required.')
      const limit = Number(args.limit) || 20
      const index = await fetchIndex(base, fetchImpl)
      const results = searchIndex(index, query, limit)
      return textResult({
        registry: base,
        query,
        count: results.length,
        items: results.map(summarize),
      })
    }

    if (name === "get_component") {
      const itemName = String(args.name ?? "")
      if (!itemName.trim()) return errorResult('The "name" argument is required.')
      const item = await fetchItem(base, itemName, fetchImpl)
      return textResult(item)
    }

    return errorResult(`Unknown tool: ${name}`)
  } catch (err) {
    return errorResult(
      `logic2b-mcp error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
