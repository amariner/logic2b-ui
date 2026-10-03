import { webcrypto } from "node:crypto"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js"

import { SERVER_INSTRUCTIONS } from "./http.ts"
import { ToolInputError } from "./limits.ts"
import { DEFAULT_REGISTRY, type FetchLike } from "./registry.ts"
import { runTool, SERVER_INFO, TOOLS } from "./tools.ts"

export interface StdioServerOptions {
  base?: string
  fetchImpl?: FetchLike
}

/**
 * The local MCP server behind `logic2b-mcp`. Invalid tool arguments and
 * unknown tools surface as JSON-RPC "Invalid params" errors; tool execution
 * failures are `isError` results, exactly like the remote HTTP transport.
 */
export function createServer({ base = DEFAULT_REGISTRY, fetchImpl }: StdioServerOptions = {}): Server {
  // Node 18 exposes WebCrypto through node:crypto without requiring a global
  // flag. Keep this runtime fallback in the Node adapter, outside Worker code.
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true, writable: true })
  }
  const server = new Server(SERVER_INFO, {
    capabilities: { tools: {} },
    instructions: SERVER_INSTRUCTIONS,
  })

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    try {
      return await runTool(name, args, { base, fetchImpl })
    } catch (error) {
      if (error instanceof ToolInputError) throw new McpError(ErrorCode.InvalidParams, error.message)
      throw error
    }
  })

  return server
}
