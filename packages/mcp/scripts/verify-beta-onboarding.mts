import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, access, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { CLI_PACKAGE_SELECTOR, MCP_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"

// Intentionally separate from the packed source gate: a passing local tarball
// does not prove that the npm channel advertised to first-time users works.
const run = promisify(execFile)
const cwd = await mkdtemp(join(tmpdir(), "logic2b-beta-onboarding-"))
const env = { ...process.env, npm_config_cache: join(cwd, "npm-cache") }
let passed = false
try {
  const options = { cwd, env, timeout: 180_000 }
  const { stdout } = await run("npx", ["-y", CLI_PACKAGE_SELECTOR, "--version"], options)
  const version = stdout.trim()
  assert.match(version, /^\d+\.\d+\.\d+-rc\.\d+$/)
  const help = await run("npx", ["-y", CLI_PACKAGE_SELECTOR, "--help"], options)
  for (const name of ["init", "add", "status", "update"]) assert.ok(help.stdout.includes(name))
  const pnpm = await run("pnpm", ["dlx", CLI_PACKAGE_SELECTOR, "--version"], options)
  assert.equal(pnpm.stdout.trim(), version, "npm and pnpm beta selectors must resolve the same CLI")

  const target = join(cwd, "my-app")
  await run("npx", ["-y", CLI_PACKAGE_SELECTOR, "init", "--template", "vite",
    "--starter", "marketing", "--cwd", target, "--no-install"], options)
  await run("npx", ["-y", CLI_PACKAGE_SELECTOR, "add", "button", "--cwd", target], options)
  await Promise.all(["package.json", "components.json", "src/main.tsx", "src/components/ui/button.tsx"].map(
    (path) => access(join(target, path)),
  ))
  console.log(`✓ advertised npm/pnpm CLI: ${CLI_PACKAGE_SELECTOR} resolved ${version}; help/init/add verified`)

  const client = new Client({ name: "logic2b-beta-onboarding", version: "1.0.0" })
  const transport = new StdioClientTransport({
    command: "npx", args: ["-y", MCP_PACKAGE_SELECTOR], cwd,
    env: Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
    stderr: "pipe",
  })
  try {
    await client.connect(transport, { timeout: 180_000 })
    assert.equal(client.getServerVersion()?.version, version, "published CLI and MCP candidates must match")
    const { tools } = await client.listTools()
    for (const name of ["install_plan", "scaffold_plan", "get_component", "lint_theme"]) {
      assert.ok(tools.some((tool) => tool.name === name), `${name} missing from published MCP`)
    }
    const result = await client.callTool({ name: "install_plan", arguments: { items: ["button"], version: "next" } })
    assert.ok(!result.isError, JSON.stringify(result.content))
    const content = result.content as Array<{ type: string; text?: string }>
    const plan = JSON.parse(content[0]!.text!)
    assert.ok(plan.files.length > 0)
    console.log(`✓ advertised stdio: ${MCP_PACKAGE_SELECTOR} resolved ${client.getServerVersion()?.version}; handshake/install_plan verified`)
  } finally {
    await client.close()
  }
  const endpoint = new URL("https://ui.logic2b.com/mcp")
  assert.equal((await fetch(endpoint, { signal: AbortSignal.timeout(30_000) })).status, 405)
  const remote = new Client({ name: "logic2b-beta-onboarding", version: "1.0.0" })
  try {
    await remote.connect(new StreamableHTTPClientTransport(endpoint))
    assert.ok((await remote.listTools()).tools.some((tool) => tool.name === "install_plan"))
    console.log(`✓ remote MCP: GET 405 and streamable HTTP handshake verified (${remote.getServerVersion()?.version})`)
  } finally {
    await remote.close()
  }
  passed = true
} finally {
  if (passed) await rm(cwd, { recursive: true, force: true })
  else console.error(`Beta onboarding fixture kept for inspection: ${cwd}`)
}
