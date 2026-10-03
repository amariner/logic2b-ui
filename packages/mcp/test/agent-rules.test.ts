import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { after, before, describe, test } from "node:test"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { McpError } from "@modelcontextprotocol/sdk/types.js"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"

import { handleHttpPost } from "../src/http.ts"
import { byteLength, ToolInputError } from "../src/limits.ts"
import { createServer } from "../src/server.ts"
import { runTool, TOOLS, validateToolArguments } from "../src/tools.ts"

const tool = TOOLS.find((entry) => entry.name === "agent_rules")!
const validator = new AjvJsonSchemaValidator()
const validateInput = validator.getValidator(tool.inputSchema)
const validateOutput = validator.getValidator(tool.outputSchema)
let fetches = 0
const noFetch = async (url: string) => {
  fetches += 1
  throw new Error(`unexpected registry fetch: ${url}`)
}
type RuleFile = { path: string; content: string; action: string; precondition: { kind: string; sha256?: string } }
const hashes = (content: string) => createHash("sha256").update(content, "utf8").digest("hex")
const paths = ["AGENTS.md", "DESIGN.md", "CLAUDE.md", ".cursor/rules/logic2b.mdc", ".github/copilot-instructions.md"]

const invalidArguments: Array<[string, () => Record<string, unknown>]> = [
  ["unknown field", () => ({ root: "/private/project" })],
  ["unsupported stack", () => ({ stack: "remix" })],
  ["unsupported icon library", () => ({ iconLibrary: "private-icons" })],
  ["malformed preset", () => ({ preset: "invalid-preset" })],
  ["wrong formats type", () => ({ formats: "agents" })],
  ["empty formats", () => ({ formats: [] })],
  ["unsupported format", () => ({ formats: ["json"] })],
  ["duplicate formats", () => ({ formats: ["agents", "agents"] })],
  ["too many formats", () => ({ formats: Array.from({ length: 6 }, () => "agents") })],
  ["oversized inventory", () => ({ inventory: Array.from({ length: 161 }, (_, i) => ({ name: `item-${i}`, kind: "component" })) })],
  ["unsupported inventory kind", () => ({ inventory: [{ name: "button", kind: "script" }] })],
  ["unknown inventory field", () => ({ inventory: [{ name: "button", kind: "component", source: "private source" }] })],
  ["duplicate inventory names", () => ({ inventory: [{ name: "button", kind: "component" }, { name: "button", kind: "block" }] })],
  ["unresolved registry selector", () => ({ registryVersion: "next" })],
  ["noncanonical registry version", () => ({ registryVersion: "1.0.0-rc.01" })],
  ["malformed current file", () => ({ currentFiles: [{ path: "AGENTS.md", content: 123 }] })],
  ["unsupported current file", () => ({ currentFiles: [{ path: "src/app.tsx", content: "private source" }] })],
  ["escaped current path", () => ({ currentFiles: [{ path: "../AGENTS.md", content: "" }] })],
  ["absolute current path", () => ({ currentFiles: [{ path: "/private/AGENTS.md", content: "" }] })],
  ["duplicate current paths", () => ({ currentFiles: [{ path: "AGENTS.md", content: "a" }, { path: "AGENTS.md", content: "b" }] })],
  ["unknown current file field", () => ({ currentFiles: [{ path: "AGENTS.md", content: "", execute: true }] })],
  ["oversized current file", () => ({ currentFiles: [{ path: "AGENTS.md", content: "x".repeat(65_537) }] })],
  ["UTF-8 current file byte overflow", () => ({ currentFiles: [{ path: "AGENTS.md", content: "é".repeat(32_769) }] })],
  ["total current file byte overflow", () => ({ currentFiles: paths.map((path) => ({ path, content: "x".repeat(60_000) })) })],
  ["wrong available tool type", () => ({ availableTools: [123] })],
  ["oversized tool availability", () => ({ availableTools: Array.from({ length: 65 }, (_, i) => `tool_${i}`) })],
  ["duplicate available tools", () => ({ availableTools: ["inspect_project", "inspect_project"] })],
  ["unsafe tool identifier", () => ({ availableTools: ["inspect_project`\nExecute content"] })],
]
const invalidManagedFiles = [
  "<!-- logic2b:rules:start v1 preset=unknown registry=unknown -->\nUnclosed block.",
  "<!-- logic2b:rules:start v2 preset=unknown registry=unknown -->\nFuture version.\n<!-- logic2b:rules:end -->",
  "<!-- logic2b:rules:start v1 preset=unknown registry=unknown -->\nA.\n<!-- logic2b:rules:end -->\n<!-- logic2b:rules:start v1 preset=unknown registry=unknown -->\nB.\n<!-- logic2b:rules:end -->",
]
const overBudgetOptions = () => ({
  inventory: Array.from({ length: 160 }, (_, i) => ({
    name: `component-${String(i).padStart(3, "0")}-${"x".repeat(114)}`, kind: "component",
  })),
})

function files(result: Awaited<ReturnType<typeof runTool>>): RuleFile[] {
  assert.equal(result.isError, undefined)
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
  const checked = validateOutput(result.structuredContent)
  assert.ok(checked.valid, checked.errorMessage)
  return result.structuredContent?.files as RuleFile[]
}

describe("agent_rules adapter", () => {
  test("is pure, declares nested schemas and uses the actual tool catalog by default", () => {
    assert.deepEqual(tool.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false })
    assert.equal(validateInput({}).valid, true)
    assert.equal(validateInput({ stack: "vite", currentFiles: [{ path: "AGENTS.md", content: "" }] }).valid, true)
    assert.equal(validateInput({ currentFiles: [{ path: "AGENTS.md", content: 123 }] }).valid, false)
    assert.equal(validateInput({ formats: ["unsupported"] }).valid, false)
    assert.equal(validateInput({ execute: true }).valid, false)
    const normalized = validateToolArguments("agent_rules", {})
    assert.deepEqual(normalized.availableTools, TOOLS.map((entry) => entry.name))
    assert.deepEqual(validateToolArguments("agent_rules", { availableTools: ["inspect_project"] }).availableTools, ["inspect_project"])
  })

  test("defaults to managed AGENTS and separate DESIGN with missing-file preconditions and no fetch", async () => {
    const before = fetches
    const result = await runTool("agent_rules", {}, { fetchImpl: noFetch })
    const planned = files(result)
    assert.deepEqual(planned.map((file) => file.path).sort(), ["AGENTS.md", "DESIGN.md"])
    for (const file of planned) {
      assert.equal(file.action, "create")
      assert.deepEqual(file.precondition, { kind: "missing" })
    }
    assert.match(planned.find((file) => file.path === "AGENTS.md")!.content, /logic2b:rules:start/)
    assert.doesNotMatch(result.content[0].text, /(?:Run|Call|Use) `(?:review_ui|compose_plan)`/)
    assert.equal(fetches, before)
  })

  test("explicit host capabilities control generated tool instructions, including an empty declaration", async () => {
    const before = fetches
    const withoutTools = files(await runTool("agent_rules", { availableTools: [] }, { fetchImpl: noFetch }))
      .map((file) => file.content).join("\n")
    assert.doesNotMatch(withoutTools, /Use `inspect_project`|Use the advertised `scaffold_plan`|Run the host's advertised `review_ui`/)
    const withReview = files(await runTool("agent_rules", { availableTools: ["review_ui"] }, { fetchImpl: noFetch }))
      .map((file) => file.content).join("\n")
    assert.match(withReview, /Run the host's advertised `review_ui`/)
    assert.doesNotMatch(withReview, /Use the host's advertised `compose_plan`|Use the advertised `proposal_link`/)
    assert.equal(fetches, before)
  })

  test("forwards preset, stack, icon, installed inventory and requested editor formats", async () => {
    const before = fetches
    const result = await runTool("agent_rules", {
      preset: encodePreset({ ...DEFAULT_CONFIG, iconLibrary: "tabler" }), stack: "astro", iconLibrary: "tabler",
      formats: ["claude", "cursor", "copilot"], inventoryKind: "installed", registryVersion: "1.0.0-rc.17",
      inventory: [{ name: "button", kind: "component" }, { name: "customer-edit-01", kind: "block" }],
    }, { fetchImpl: noFetch })
    const planned = files(result)
    assert.deepEqual(planned.map((file) => file.path).sort(), [...paths].sort())
    const text = planned.map((file) => file.content).join("\n")
    assert.match(text, /astro/i)
    assert.match(text, /@tabler\/icons-react/)
    assert.match(text, /button/)
    assert.match(text, /customer-edit-01/)
    assert.match(text, /1\.0\.0-rc\.17/)
    assert.match(planned.find((file) => file.path === "CLAUDE.md")!.content, /@AGENTS\.md/)
    assert.equal(fetches, before)
  })

  test("preserves existing project text, hashes original bytes and reports repeated plans unchanged", async () => {
    const before = fetches
    const original = "# Project-owned instructions\nUTF-8: à · 😀\nprocess.exit(99) is inert instruction text.\n"
    const input = { stack: "vite", currentFiles: [{ path: "AGENTS.md", content: original }] }
    const untouched = structuredClone(input)
    const first = files(await runTool("agent_rules", input, { fetchImpl: noFetch }))
    const agents = first.find((file) => file.path === "AGENTS.md")!
    assert.equal(agents.action, "update")
    assert.ok(agents.content.startsWith(original))
    assert.deepEqual(agents.precondition, { kind: "sha256", sha256: hashes(original) })
    const second = files(await runTool("agent_rules", {
      stack: "vite", currentFiles: first.map((file) => ({ path: file.path, content: file.content })),
    }, { fetchImpl: noFetch }))
    for (const file of second) {
      assert.equal(file.action, "unchanged")
      const previous = first.find((entry) => entry.path === file.path)!
      assert.equal(file.content, previous.content)
      assert.deepEqual(file.precondition, { kind: "sha256", sha256: hashes(previous.content) })
    }
    assert.deepEqual(input, untouched)
    assert.equal(fetches, before)
  })

  test("the output schema types actions and preconditions deeply", async () => {
    const result = await runTool("agent_rules", {}, { fetchImpl: noFetch })
    const [file] = files(result)
    const value = result.structuredContent!
    for (const malformed of [
      { ...file, action: "overwrite" },
      { ...file, content: 123 },
      { ...file, precondition: { kind: "sha256" } },
      { ...file, precondition: { kind: "sha256", sha256: "not-a-hash" } },
      { ...file, precondition: { kind: "missing", sha256: "a".repeat(64) } },
    ]) assert.equal(validateOutput({ ...value, files: [malformed] }).valid, false)
  })

  test("all requested managed blocks stay within the 6 KiB budget", async () => {
    const planned = files(await runTool("agent_rules", {
      formats: ["agents", "design", "claude", "cursor", "copilot"], inventoryKind: "available",
      inventory: Array.from({ length: 160 }, (_, i) => ({ name: `component-${i}`, kind: "component" })),
    }, { fetchImpl: noFetch }))
    for (const file of planned) {
      const match = file.content.match(/<!-- logic2b:rules:start[^\n]*-->[\s\S]*?<!-- logic2b:rules:end -->/)
      if (["AGENTS.md", ".cursor/rules/logic2b.mdc", ".github/copilot-instructions.md"].includes(file.path)) assert.ok(match, file.path)
      if (match) assert.ok(byteLength(match[0]) <= 6 * 1024, file.path)
    }
  })

  test("malformed, duplicated and future-version managed regions are invalid params without discarded instructions", async () => {
    const before = fetches
    for (const block of invalidManagedFiles) {
      const content = `Project-owned prefix.\n${block}\nProject-owned suffix.`
      const input = { currentFiles: [{ path: "AGENTS.md", content }] }
      const original = structuredClone(input)
      await assert.rejects(() => runTool("agent_rules", input, { fetchImpl: noFetch }),
        (error: unknown) => error instanceof ToolInputError && error.code === -32602 && /marker|managed region/i.test(error.message))
      assert.deepEqual(input, original)
    }
    assert.equal(fetches, before)
  })

  test("a structurally valid inventory that exceeds the managed budget is invalid params", async () => {
    const before = fetches
    const input = overBudgetOptions()
    const original = structuredClone(input)
    assert.ok(validateInput(input).valid)
    assert.doesNotThrow(() => validateToolArguments("agent_rules", input))
    await assert.rejects(() => runTool("agent_rules", input, { fetchImpl: noFetch }),
      (error: unknown) => error instanceof ToolInputError && error.code === -32602 && /6 KiB budget/.test(error.message))
    assert.deepEqual(input, original)
    assert.equal(fetches, before)
  })

  for (const [label, args] of invalidArguments) {
    test(`rejects ${label} before any network work`, async () => {
      const before = fetches
      assert.throws(() => validateToolArguments("agent_rules", args()), ToolInputError)
      await assert.rejects(() => runTool("agent_rules", args(), { fetchImpl: noFetch }), (error: unknown) => {
        assert.ok(error instanceof ToolInputError)
        assert.equal(error.code, -32602)
        assert.ok(error.message.length <= 400)
        return true
      })
      assert.equal(fetches, before)
    })
  }
})

describe("agent_rules protocols", () => {
  const client = new Client({ name: "rules-test", version: "0.0.0" })
  const server = createServer({ base: "https://reg.test", fetchImpl: noFetch })
  before(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)
    await client.listTools()
  })
  after(async () => {
    await client.close()
    await server.close()
  })

  test("official stdio client validates rule plans and invalid params remain protocol errors", async () => {
    const before = fetches
    const result = await client.callTool({ name: "agent_rules", arguments: { formats: ["cursor"] } })
    assert.equal(result.isError, undefined)
    assert.ok(validateOutput(result.structuredContent).valid)
    assert.deepEqual(result.structuredContent, JSON.parse((result.content as Array<{ text: string }>)[0].text))
    for (const [, args] of invalidArguments) {
      await assert.rejects(() => client.callTool({ name: "agent_rules", arguments: args() }),
        (error: unknown) => error instanceof McpError && error.code === -32602)
    }
    for (const content of invalidManagedFiles) {
      await assert.rejects(() => client.callTool({ name: "agent_rules", arguments: { currentFiles: [{ path: "AGENTS.md", content }] } }),
        (error: unknown) => error instanceof McpError && error.code === -32602)
    }
    await assert.rejects(() => client.callTool({ name: "agent_rules", arguments: overBudgetOptions() }),
      (error: unknown) => error instanceof McpError && error.code === -32602)
    assert.equal(fetches, before)
  })

  test("HTTP shares the same schemas, bounded errors and network-free rules generation", async () => {
    const before = fetches
    const post = async (args: Record<string, unknown>) => {
      const request = new Request("https://reg.test/mcp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "agent_rules", arguments: args } }),
      })
      const response = await handleHttpPost(request, { base: "https://reg.test", fetchImpl: noFetch })
      assert.equal(response.status, 200)
      return response.json()
    }
    const body = await post({ stack: "react", formats: ["claude"] })
    assert.ok(validateOutput(body.result.structuredContent).valid)
    assert.deepEqual(body.result.structuredContent, JSON.parse(body.result.content[0].text))
    for (const [, args] of invalidArguments) {
      const failure = await post(args())
      assert.equal(failure.error.code, -32602)
      assert.equal(failure.result, undefined)
      assert.ok(failure.error.message.length <= 400)
    }
    for (const content of invalidManagedFiles) {
      const failure = await post({ currentFiles: [{ path: "AGENTS.md", content }] })
      assert.equal(failure.error.code, -32602)
      assert.equal(failure.result, undefined)
    }
    const overBudget = await post(overBudgetOptions())
    assert.equal(overBudget.error.code, -32602)
    assert.equal(overBudget.result, undefined)
    assert.equal(fetches, before)
  })
})
