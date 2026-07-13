#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import { DEFAULT_REGISTRY } from "./registry.ts"
import { runTool, SERVER_INFO, TOOLS } from "./tools.ts"

const server = new Server(SERVER_INFO, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params
  return runTool(name, args as Record<string, unknown>)
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
