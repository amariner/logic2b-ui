#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { DEFAULT_REGISTRY } from "./registry.ts"
import { createServer } from "./server.ts"

async function main() {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // Logs must go to stderr — stdout is the JSON-RPC channel.
  console.error(`logic2b-ui MCP server ready (registry: ${DEFAULT_REGISTRY})`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
