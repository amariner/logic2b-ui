/** E2E check of the remote MCP endpoint using the official SDK client. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

const url = process.argv[2] ?? "http://localhost:8787/mcp"

function fail(msg: string): never {
  console.error(`✗ FAIL: ${msg}`)
  process.exit(1)
}

function ok(msg: string) {
  console.log(`✓ ${msg}`)
}

const client = new Client({ name: "mcp-e2e", version: "0.0.0" })
const transport = new StreamableHTTPClientTransport(new URL(url))

await client.connect(transport)
const serverVersion = client.getServerVersion()
const caps = client.getServerCapabilities()
if (serverVersion?.name !== "logic2b-ui") fail(`serverInfo.name = ${serverVersion?.name}`)
if (!caps?.tools) fail("server did not declare tools capability")
ok(`connected: ${serverVersion.name}@${serverVersion.version} (protocol negotiated)`)

const { tools } = await client.listTools()
const names = tools.map((t) => t.name).sort()
if (JSON.stringify(names) !== JSON.stringify(["get_component", "list_components", "search_components"]))
  fail(`tools/list = ${names.join(", ")}`)
ok(`tools/list → ${names.join(", ")}`)

function firstText(r: { content?: unknown }): string {
  const c = (r as { content: { type: string; text: string }[] }).content
  if (!c?.[0] || c[0].type !== "text") fail("tool result has no text content")
  return c[0].text
}

const list = await client.callTool({ name: "list_components", arguments: { kind: "chart" } })
const listPayload = JSON.parse(firstText(list))
if (!(listPayload.count > 0)) fail("list_components kind=chart returned 0 items")
if (listPayload.items.some((i: { kind: string }) => i.kind !== "chart"))
  fail("list_components kind=chart returned non-chart items")
ok(`list_components(kind=chart) → ${listPayload.count} charts (registry: ${listPayload.registry})`)

const search = await client.callTool({ name: "search_components", arguments: { query: "login form" } })
const searchPayload = JSON.parse(firstText(search))
if (!searchPayload.items[0]?.name?.startsWith("login"))
  fail(`search top hit = ${searchPayload.items[0]?.name}`)
ok(`search_components("login form") → top hit ${searchPayload.items[0].name}`)

const get = await client.callTool({ name: "get_component", arguments: { name: "button" } })
const item = JSON.parse(firstText(get))
if (item.name !== "button" || !item.files?.[0]?.content?.includes("buttonVariants"))
  fail("get_component(button) payload missing source")
ok(`get_component(button) → ${item.files.length} file(s), source ${item.files[0].content.length} chars`)

const ghost = await client.callTool({ name: "get_component", arguments: { name: "ghost-nope" } })
if (!ghost.isError) fail("get_component(ghost-nope) should be isError")
ok("get_component(unknown) → clean isError result")

await client.ping()
ok("ping → pong")

await client.close()
console.log(`\nALL PASS against ${url}`)
