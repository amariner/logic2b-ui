import assert from "node:assert/strict"
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// M1-04 includes the bounded Babel TSX/JSX parser. These are project budgets,
// not Cloudflare plan quotas. Count every emitted module so code splitting
// cannot hide a parser or other dependency from the total deployment budget.
export const MCP_CHUNK_BUDGET = 1024 * 1024
export const SERVER_MODULE_BUDGET = 2 * 1024 * 1024

export function checkMcpWorkerBudget(serverDir) {
  const chunksDir = join(serverDir, "chunks")
  const chunks = readdirSync(chunksDir).filter(name => /^mcp_.*\.mjs$/.test(name))
  assert.equal(chunks.length, 1, `expected one mcp_*.mjs chunk, found: ${chunks.join(", ") || "none"}`)
  const mcpBytes = statSync(join(chunksDir, chunks[0])).size
  const modules = []
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (/\.(?:m?js|wasm)$/.test(entry.name)) modules.push(statSync(path).size)
    }
  }
  visit(serverDir)
  const totalBytes = modules.reduce((sum, size) => sum + size, 0)
  assert.ok(mcpBytes <= MCP_CHUNK_BUDGET, `MCP chunk ${mcpBytes} exceeds ${MCP_CHUNK_BUDGET} bytes`)
  assert.ok(totalBytes <= SERVER_MODULE_BUDGET, `Server modules ${totalBytes} exceed ${SERVER_MODULE_BUDGET} bytes`)
  return { mcpBytes, totalBytes, moduleCount: modules.length }
}
