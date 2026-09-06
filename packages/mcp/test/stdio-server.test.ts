import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { McpError } from "@modelcontextprotocol/sdk/types.js"

import { SERVER_INSTRUCTIONS } from "../src/http.ts"
import { createServer } from "../src/server.ts"
import { SERVER_INFO, TOOLS } from "../src/tools.ts"
import { ImmutableRegistry } from "./helpers/immutable-registry.ts"

/** The stdio package's server over an in-memory transport with the official client. */
describe("local MCP server", () => {
  const base = "https://reg.test"
  const registry = new ImmutableRegistry({
    base,
    items: [{ name: "button", type: "registry:ui", description: "A button.", files: [] }],
  })
  const client = new Client({ name: "logic2b-test", version: "0.0.0" })
  const server = createServer({ base, fetchImpl: registry.fetchImpl })

  before(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)
  })
  after(async () => {
    await client.close()
    await server.close()
  })

  test("advertises the shared identity, instructions and tool catalog", async () => {
    assert.deepEqual(client.getServerVersion(), SERVER_INFO)
    assert.equal(client.getInstructions(), SERVER_INSTRUCTIONS)
    const { tools } = await client.listTools()
    assert.deepEqual(tools.map((tool) => tool.name), TOOLS.map((tool) => tool.name))
  })

  test("unknown tools and invalid arguments are JSON-RPC invalid-params errors", async () => {
    const before = registry.calls.length
    await assert.rejects(
      () => client.callTool({ name: "nope", arguments: {} }),
      (error: unknown) => error instanceof McpError && error.code === -32602 && /Unknown tool "nope"/.test(error.message)
    )
    await assert.rejects(
      () => client.callTool({ name: "search_components", arguments: { query: "x", limit: 500 } }),
      (error: unknown) => error instanceof McpError && error.code === -32602 && /"limit" argument must be between 1 and 100/.test(error.message)
    )
    assert.equal(registry.calls.length, before)
  })

  test("execution failures are isError results and successes are structured", async () => {
    const failure = await client.callTool({ name: "get_component", arguments: { name: "ghost" } })
    assert.equal(failure.isError, true)
    assert.equal(failure.structuredContent, undefined)
    const success = await client.callTool({ name: "list_components", arguments: {} })
    assert.equal(success.isError, undefined)
    assert.equal((success.structuredContent as { registryVersion: string }).registryVersion, "1.0.0")
  })
})
