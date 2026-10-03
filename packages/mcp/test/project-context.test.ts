import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { McpError } from "@modelcontextprotocol/sdk/types.js"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"

import { handleHttpPost } from "../src/http.ts"
import { byteLength, LIMITS, ToolInputError } from "../src/limits.ts"
import { createServer } from "../src/server.ts"
import { runTool, TOOLS, validateToolArguments } from "../src/tools.ts"

const tool = TOOLS.find((entry) => entry.name === "inspect_project")!
const validator = new AjvJsonSchemaValidator()
const validateInput = validator.getValidator(tool.inputSchema)
const validateOutput = validator.getValidator(tool.outputSchema)
const capabilities = { fileWrites: false, dependencyInstall: false, browser: true }
let fetches = 0
const noFetch = async (url: string) => {
  fetches += 1
  throw new Error(`unexpected registry fetch: ${url}`)
}

function snapshot() {
  return {
    schemaVersion: 1,
    configs: [],
    capabilities: { ...capabilities },
  }
}

function oversizedDetailSnapshot() {
  const directory = "x".repeat(200)
  return {
    ...snapshot(),
    configs: [
      { path: "tsconfig.json", kind: "tsconfig", data: { compilerOptions: { paths: { "@/*": ["app/*"] } } } },
      { path: "components.json", kind: "components", data: { aliases: { ui: `@/${directory}` } } },
      { path: ".logic2b/manifest.json", kind: "manifest", data: {
        schemaVersion: 1, registry: {}, items: { button: { files: Array.from({ length: LIMITS.projectInventoryEntries }, (_, i) => `ui/file-${i}.tsx`) } },
      } },
    ],
    files: Array.from({ length: LIMITS.projectInventoryEntries }, (_, i) => ({
      path: `app/${directory}/file-${i}.tsx`, sha256: "a".repeat(64), baselineSha256: "a".repeat(64),
    })),
  }
}

const invalidArguments: Array<[string, () => Record<string, unknown>]> = [
  ["missing snapshot", () => ({})],
  ["serialized snapshot", () => ({ snapshot: JSON.stringify(snapshot()) })],
  ["unsupported schema version", () => ({ snapshot: { ...snapshot(), schemaVersion: 2 } })],
  ["unknown snapshot field", () => ({ snapshot: { ...snapshot(), source: "private source" } })],
  ["unknown tool argument", () => ({ snapshot: snapshot(), root: "/private/project" })],
  ["unknown capability", () => ({ snapshot: { ...snapshot(), capabilities: { ...capabilities, shell: true } } })],
  ["nonboolean capability", () => ({ snapshot: { ...snapshot(), capabilities: { ...capabilities, browser: "yes" } } })],
  ["missing capability", () => ({ snapshot: { ...snapshot(), capabilities: { fileWrites: false, browser: true } } })],
  ["nonboolean details", () => ({ snapshot: snapshot(), details: "all" })],
  ["null details", () => ({ snapshot: snapshot(), details: null })],
  ["malformed config data", () => ({ snapshot: { ...snapshot(), configs: [{ path: "package.json", kind: "package", data: "{" }] } })],
  ["raw source payload", () => ({ snapshot: { ...snapshot(), configs: [{ path: "package.json", kind: "package", data: {}, content: "private source" }] } })],
  ["absolute path", () => ({ snapshot: { ...snapshot(), configs: [{ path: "/private/package.json", kind: "package", data: {} }] } })],
  ["escaped path", () => ({ snapshot: { ...snapshot(), configs: [{ path: "../package.json", kind: "package", data: {} }] } })],
  ["Windows absolute path", () => ({ snapshot: { ...snapshot(), configs: [{ path: "C:\\private\\package.json", kind: "package", data: {} }] } })],
  ["oversized path", () => ({ snapshot: { ...snapshot(), configs: [{ path: `${"x".repeat(257)}.json`, kind: "package", data: {} }] } })],
  ["duplicate normalized targets", () => ({ snapshot: { ...snapshot(), configs: [
    { path: "package.json", kind: "package", data: {} },
    { path: "./package.json", kind: "package", data: {} },
  ] } })],
  ["inventory over limit", () => ({ snapshot: { ...snapshot(), directories: Array.from({ length: 1001 }, (_, i) => `src/dir-${i}`) } })],
  ["configuration bytes over limit", () => ({ snapshot: { ...snapshot(), configs: [{
    path: "package.json", kind: "package", data: { dependencies: { next: "x".repeat(128 * 1024) } },
  }] } })],
  ["configuration entries over limit", () => ({ snapshot: { ...snapshot(), configs: Array.from({ length: LIMITS.projectConfigEntries + 1 }, (_, i) => ({
    path: `app-${i}/package.json`, kind: "package", data: {},
  })) } })],
  ["absolute tsconfig baseUrl", () => ({ snapshot: { ...snapshot(), configs: [{ path: "tsconfig.json", kind: "tsconfig", data: { compilerOptions: { baseUrl: "/private/__PRIVATE_CONFIGURATION__" } } }] } })],
  ["URL tsconfig alias target", () => ({ snapshot: { ...snapshot(), configs: [{ path: "tsconfig.json", kind: "tsconfig", data: { compilerOptions: { paths: { "@/*": ["https://user:__PRIVATE_CREDENTIAL__@private.invalid/*"] } } } }] } })],
  ["URL tsconfig extends", () => ({ snapshot: { ...snapshot(), configs: [{ path: "tsconfig.json", kind: "tsconfig", data: { extends: "https://user:__PRIVATE_CREDENTIAL__@private.invalid/config.json" } }] } })],
  ["absolute tsconfig reference", () => ({ snapshot: { ...snapshot(), configs: [{ path: "tsconfig.json", kind: "tsconfig", data: { references: [{ path: "/private/__PRIVATE_CONFIGURATION__/tsconfig.json" }] } }] } })],
  ["URL workspace package", () => ({ snapshot: { ...snapshot(), configs: [{ path: "package.json", kind: "package", data: { workspaces: ["https://user:__PRIVATE_CREDENTIAL__@private.invalid/app"] } }] } })],
]

describe("inspect_project adapter", () => {
  test("is a pure read-only tool with a real nested snapshot contract", () => {
    assert.deepEqual(tool.annotations, {
      readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false,
    })
    assert.equal(validateInput({ snapshot: snapshot() }).valid, true)
    assert.equal(validateInput({ snapshot: { ...snapshot(), schemaVersion: 2 } }).valid, false)
    assert.equal(validateInput({ snapshot: { ...snapshot(), capabilities: { browser: "yes" } } }).valid, false)
    assert.equal(validateInput({ snapshot: snapshot(), details: "all" }).valid, false)
    assert.equal(validateInput({ snapshot: snapshot(), root: "/private/project" }).valid, false)
    const schema = tool.inputSchema.properties.snapshot as { properties: Record<string, { maxItems?: number }> }
    assert.equal(schema.properties.configs.maxItems, LIMITS.projectConfigEntries)
  })

  test("compact and detailed results share JSON text and structured values without I/O", async () => {
    const input = snapshot()
    const original = structuredClone(input)
    const before = fetches
    const compact = await runTool("inspect_project", { snapshot: input }, { fetchImpl: noFetch })
    const detailed = await runTool("inspect_project", { snapshot: input, details: true }, { fetchImpl: noFetch })
    for (const result of [compact, detailed]) {
      assert.equal(result.isError, undefined)
      assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
      const checked = validateOutput(result.structuredContent)
      assert.ok(checked.valid, checked.errorMessage)
      assert.equal(result.structuredContent?.schemaVersion, 1)
      assert.ok(result.structuredContent?.summary)
      assert.equal("configs" in result.structuredContent!, false, "raw configs are not returned")
    }
    assert.equal(compact.structuredContent?.context, undefined)
    const context = detailed.structuredContent?.context as Record<string, unknown>
    assert.deepEqual(context.capabilities, capabilities)
    assert.equal(context.framework && typeof context.framework, "object")
    assert.equal(byteLength(compact.content[0].text) < byteLength(detailed.content[0].text), true)
    assert.ok(byteLength(compact.content[0].text) <= LIMITS.projectCompactBytes)
    assert.ok(byteLength(detailed.content[0].text) <= LIMITS.projectDetailBytes)
    assert.deepEqual(input, original, "caller snapshot is not modified")
    assert.equal(fetches, before)
  })

  test("configuration is inert and only selected metadata reaches the result", async () => {
    const before = fetches
    const result = await runTool("inspect_project", {
      snapshot: {
        ...snapshot(),
        configs: [{
          path: "package.json", kind: "package",
          data: {
            name: "__PRIVATE_PROJECT_NAME__",
            scripts: { postinstall: "__MCP_SNAPSHOT_INERT__" },
            repository: "https://private.invalid/__PRIVATE_REMOTE__",
            dependencies: { vite: "7.1.0", react: "19.1.0" },
          },
        }],
      },
      details: true,
    }, { fetchImpl: noFetch })
    assert.equal(result.isError, undefined)
    assert.ok(validateOutput(result.structuredContent).valid)
    assert.doesNotMatch(result.content[0].text, /__PRIVATE_PROJECT_NAME__|__MCP_SNAPSHOT_INERT__|__PRIVATE_REMOTE__|postinstall/)
    const context = result.structuredContent?.context as { framework: { name: string } }
    assert.equal(context.framework.name, "vite")
    assert.equal(fetches, before)
  })

  test("confirmed custom locations and modified installed files are present only in requested detail", async () => {
    const before = fetches
    const path = "app/design/primitives/button.tsx"
    const sha256 = "a".repeat(64)
    const input = {
      ...snapshot(),
      configs: [
        { path: "package.json", kind: "package", data: { dependencies: { next: "16.0.0", react: "19.1.0" } } },
        { path: "tsconfig.json", kind: "tsconfig", data: { compilerOptions: { baseUrl: ".", paths: { "@/*": ["app/*"] } } } },
        { path: "components.json", kind: "components", data: { aliases: { ui: "@/design/primitives" }, tailwind: { css: "app/theme.css" } } },
        { path: ".logic2b/manifest.json", kind: "manifest", data: {
          schemaVersion: 1, registry: { url: "https://private.invalid", resolvedVersion: "1.0.0-rc.17" },
          items: { button: { version: "1.0.0-rc.17", files: ["ui/button.tsx"] } },
        } },
      ],
      files: [{ path, sha256, baselineSha256: "b".repeat(64) }],
    }
    const compact = await runTool("inspect_project", { snapshot: input }, { fetchImpl: noFetch })
    const detailed = await runTool("inspect_project", { snapshot: input, details: true }, { fetchImpl: noFetch })
    assert.ok(validateOutput(compact.structuredContent).valid)
    assert.ok(validateOutput(detailed.structuredContent).valid)
    const summary = compact.structuredContent?.summary as {
      sourceRoot: string; locations: { ui: string }; inventory: { modifiedFiles: number; inspectedFiles: number },
    }
    assert.equal(summary.sourceRoot, "app")
    assert.equal(summary.locations.ui, "app/design/primitives")
    assert.equal(summary.inventory.modifiedFiles, 1)
    assert.equal(summary.inventory.inspectedFiles, 1)
    assert.doesNotMatch(compact.content[0].text, /button\.tsx|private\.invalid/)
    const context = detailed.structuredContent?.context as { installed: Array<{ name: string; files: Array<{ path: string; sha256: string; modified: boolean }> }> }
    assert.deepEqual(context.installed[0].files, [{ path, sha256, modified: true }])
    assert.doesNotMatch(detailed.content[0].text, /private\.invalid/)
    assert.equal(fetches, before)
  })

  test("the maximum selected-file inventory stays opt-in and within both response budgets", async () => {
    const before = fetches
    const input = {
      ...snapshot(),
      files: Array.from({ length: LIMITS.projectInventoryEntries }, (_, i) => ({ path: `src/selected-${i}.tsx`, sha256: "a".repeat(64) })),
    }
    const compact = await runTool("inspect_project", { snapshot: input }, { fetchImpl: noFetch })
    const detailed = await runTool("inspect_project", { snapshot: input, details: true }, { fetchImpl: noFetch })
    assert.ok(validateOutput(compact.structuredContent).valid)
    assert.ok(validateOutput(detailed.structuredContent).valid)
    assert.doesNotMatch(compact.content[0].text, /selected-\d+\.tsx/)
    assert.equal((detailed.structuredContent?.context as { observedFiles: unknown[] }).observedFiles.length, LIMITS.projectInventoryEntries)
    assert.ok(byteLength(compact.content[0].text) <= LIMITS.projectCompactBytes)
    assert.ok(byteLength(detailed.content[0].text) <= LIMITS.projectDetailBytes)
    assert.ok(byteLength(detailed.content[0].text) > 20 * byteLength(compact.content[0].text))
    assert.equal(fetches, before)
  })

  test("output schema rejects malformed nested capabilities and installed-file hashes", async () => {
    const result = await runTool("inspect_project", { snapshot: snapshot(), details: true }, { fetchImpl: noFetch })
    const data = result.structuredContent!
    const context = data.context as Record<string, unknown>
    assert.equal(validateOutput({ ...data, schemaVersion: 2 }).valid, false)
    assert.equal(validateOutput({ ...data, context: { ...context, capabilities: { ...capabilities, browser: "yes" } } }).valid, false)
    assert.equal(validateOutput({ ...data, context: { ...context, installed: [{ name: "button", files: [{ path: "src/button.tsx", sha256: 123 }] }] } }).valid, false)
  })

  for (const [label, args] of invalidArguments) {
    test(`rejects ${label} as invalid params before any fetch`, async () => {
      const before = fetches
      assert.throws(() => validateToolArguments("inspect_project", args()), ToolInputError)
      await assert.rejects(() => runTool("inspect_project", args(), { fetchImpl: noFetch }), (error: unknown) => {
        assert.ok(error instanceof ToolInputError)
        assert.equal(error.code, -32602)
        assert.ok(error.message.length <= 400, "bounded, actionable error")
        assert.doesNotMatch(error.message, /__PRIVATE_CONFIGURATION__|__PRIVATE_CREDENTIAL__/)
        return true
      })
      assert.equal(fetches, before)
    })
  }

  test("an otherwise valid snapshot rejects detail above the result budget while compact remains useful", async () => {
    const before = fetches
    const input = oversizedDetailSnapshot()
    assert.doesNotThrow(() => validateToolArguments("inspect_project", { snapshot: input, details: true }))
    const compact = await runTool("inspect_project", { snapshot: input }, { fetchImpl: noFetch })
    assert.ok(validateOutput(compact.structuredContent).valid)
    assert.ok(byteLength(compact.content[0].text) <= LIMITS.projectCompactBytes)
    await assert.rejects(() => runTool("inspect_project", { snapshot: input, details: true }, { fetchImpl: noFetch }),
      (error: unknown) => error instanceof ToolInputError && error.code === -32602 && /512 KiB detail.*select a smaller/.test(error.message))
    assert.equal(fetches, before)
  })
})

describe("inspect_project protocol boundaries", () => {
  const client = new Client({ name: "inspection-test", version: "0.0.0" })
  const server = createServer({ base: "https://reg.test", fetchImpl: noFetch })
  before(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)
  })

  test("private specifiers in recognized configuration fields are sanitized before output", async () => {
    const before = fetches
    const args = {
      snapshot: {
        ...snapshot(),
        configs: [
          { path: "package.json", kind: "package", data: { dependencies: {
            vite: "https://user:__PRIVATE_CREDENTIAL__@private.invalid/vite",
            react: "file:../../__PRIVATE_DIRECTORY__",
            tailwindcss: "workspace:__PRIVATE_PACKAGE__",
          } } },
          { path: "components.json", kind: "components", data: {
            iconLibrary: "__PRIVATE_ICON__",
            logic2b: { version: "https://user:__PRIVATE_CREDENTIAL__@private.invalid/version", preset: "__PRIVATE_PRESET__" },
          } },
          { path: ".logic2b/manifest.json", kind: "manifest", data: {
            schemaVersion: 1,
            registry: { url: "https://user:__PRIVATE_CREDENTIAL__@private.invalid", requestedVersion: "next" },
            items: {},
          } },
        ],
      },
      details: true,
    }
    const normalized = validateToolArguments("inspect_project", args)
    assert.doesNotMatch(JSON.stringify(normalized), /__PRIVATE_/)
    const result = await runTool("inspect_project", args, { fetchImpl: noFetch })
    assert.equal(result.isError, undefined)
    assert.ok(validateOutput(result.structuredContent).valid)
    assert.doesNotMatch(result.content[0].text, /__PRIVATE_|private\.invalid/)
    assert.equal(fetches, before)
  })
  after(async () => {
    await client.close()
    await server.close()
  })

  test("official stdio client validates the same compact and detailed results", async () => {
    const before = fetches
    await client.listTools()
    for (const details of [false, true]) {
      const result = await client.callTool({ name: "inspect_project", arguments: { snapshot: snapshot(), details } })
      assert.equal(result.isError, undefined)
      assert.ok(validateOutput(result.structuredContent).valid)
      assert.deepEqual(result.structuredContent, JSON.parse((result.content as Array<{ text: string }>)[0].text))
    }
    assert.equal(fetches, before)
  })

  test("invalid snapshots are stdio McpError -32602 with no successful payload", async () => {
    const before = fetches
    for (const [, args] of invalidArguments) {
      await assert.rejects(() => client.callTool({ name: "inspect_project", arguments: args() }),
        (error: unknown) => error instanceof McpError && error.code === -32602)
    }
    await assert.rejects(() => client.callTool({ name: "inspect_project", arguments: { snapshot: oversizedDetailSnapshot(), details: true } }),
      (error: unknown) => error instanceof McpError && error.code === -32602 && /512 KiB detail/.test(error.message))
    assert.equal(fetches, before)
  })

  test("HTTP inspection stays network-free and returns invalid params for malformed snapshots", async () => {
    const before = fetches
    const post = async (args: Record<string, unknown>) => {
      const request = new Request("https://reg.test/mcp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "inspect_project", arguments: args } }),
      })
      const response = await handleHttpPost(request, { base: "https://reg.test", fetchImpl: noFetch })
      assert.equal(response.status, 200)
      return response.json()
    }
    for (const details of [false, true]) {
      const body = await post({ snapshot: snapshot(), details })
      assert.ok(validateOutput(body.result.structuredContent).valid)
      assert.deepEqual(body.result.structuredContent, JSON.parse(body.result.content[0].text))
    }
    for (const [, args] of invalidArguments) {
      const body = await post(args())
      assert.equal(body.error.code, -32602)
      assert.equal(body.result, undefined)
      assert.ok(body.error.message.length <= 400)
    }
    const overBudget = await post({ snapshot: oversizedDetailSnapshot(), details: true })
    assert.equal(overBudget.error.code, -32602)
    assert.match(overBudget.error.message, /512 KiB detail/)
    assert.equal(overBudget.result, undefined)
    assert.equal(fetches, before)
  })
})
