import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { LIMITS, ToolInputError, echo } from "../src/limits.ts"
import type { FetchLike } from "../src/registry.ts"
import { runTool, TOOLS, validateToolArguments } from "../src/tools.ts"
import { ImmutableRegistry } from "./helpers/immutable-registry.ts"

const base = "https://reg.test"
const noFetch: FetchLike = async (url) => {
  throw new Error(`unexpected registry fetch: ${url}`)
}

/** Every case must fail before any registry request is attempted. */
async function rejectsInput(name: string, args: unknown, pattern: RegExp) {
  await assert.rejects(
    () => runTool(name, args, { base, fetchImpl: noFetch }),
    (error: unknown) => {
      assert.ok(error instanceof ToolInputError, `${name}: expected ToolInputError, got ${String(error)}`)
      assert.equal(error.code, -32602)
      assert.match(error.message, pattern)
      assert.ok(error.message.length <= 400, "bounded error message")
      return true
    }
  )
}

describe("input limits", () => {
  test("limits are documented in the public input schemas", () => {
    const byName = new Map(TOOLS.map((tool) => [tool.name, tool.inputSchema as { properties: Record<string, Record<string, unknown>> }]))
    assert.equal(byName.get("search_components")!.properties.query.maxLength, LIMITS.queryLength)
    assert.equal(byName.get("search_components")!.properties.limit.maximum, LIMITS.searchLimit)
    assert.equal(byName.get("install_plan")!.properties.items.maxItems, LIMITS.items)
    assert.equal(byName.get("install_plan")!.properties.items.uniqueItems, true)
    assert.equal(byName.get("get_component")!.properties.name.maxLength, LIMITS.nameLength)
    assert.equal(byName.get("get_component")!.properties.version.maxLength, LIMITS.versionLength)
    assert.equal(byName.get("contrast_audit")!.properties.tokens.maxProperties, LIMITS.tokenEntries)
    assert.equal(byName.get("scaffold_plan")!.properties.name.maxLength, LIMITS.projectNameLength)
    assert.match(String(byName.get("lint_theme")!.properties.css.description), new RegExp(String(LIMITS.cssBytes)))
  })

  test("rejects unknown tools and non-object arguments", async () => {
    await rejectsInput("nope", {}, /Unknown tool "nope"\. Available tools: list_components/)
    await rejectsInput("list_components", [], /must be a JSON object/)
    await rejectsInput("list_components", "x", /must be a JSON object/)
    assert.deepEqual(validateToolArguments("list_components", undefined), {})
    assert.deepEqual(validateToolArguments("get_theme", null), {})
  })

  test("rejects wrong argument types", async () => {
    await rejectsInput("list_components", { version: 1 }, /"version" argument must be a string, received number 1/)
    await rejectsInput("list_components", { kind: "widget" }, /"kind" argument must be one of: component, block, chart, theme/)
    await rejectsInput("search_components", { query: ["x"] }, /"query" argument must be a string, received an array/)
    await rejectsInput("search_components", { query: "x", limit: "5" }, /"limit" argument must be an integer between 1 and 100/)
    await rejectsInput("search_components", { query: "x", limit: 1.5 }, /"limit" argument must be an integer/)
    await rejectsInput("get_component", { name: { name: "button" } }, /"name" argument must be a string, received an object/)
    await rejectsInput("add_command", { items: "button" }, /"items" argument must be a non-empty array/)
    await rejectsInput("install_plan", { items: ["button", 1] }, /Every "items" entry must be a non-empty string, received number 1/)
    await rejectsInput("install_plan", { items: ["button"], iconLibrary: "feather" }, /"iconLibrary" argument must be one of: lucide, tabler, phosphor, hugeicons/)
    await rejectsInput("scaffold_plan", { framework: "vite" }, /"starter" argument is required/)
    await rejectsInput("apply_preset", { css: 42 }, /"css" argument must be a string/)
    await rejectsInput("contrast_audit", { tokens: ["oklch(0 0 0)"] }, /"tokens" argument must be an object/)
    await rejectsInput("contrast_audit", { tokens: { primary: 1 } }, /Token "primary" must map to a string/)
    await rejectsInput("decode_preset", {}, /"preset" argument is required/)
  })

  test("rejects oversized, empty, duplicate and unsafe values", async () => {
    await rejectsInput("get_component", { name: "" }, /"name" argument is required/)
    await rejectsInput("get_component", { name: "   " }, /"name" argument is required/)
    await rejectsInput("get_component", { name: "a".repeat(LIMITS.nameLength + 1) }, /must not exceed 128 characters \(received 129\)/)
    await rejectsInput("get_component", { name: "button\0" }, /must not contain NUL/)
    await rejectsInput("list_components", { version: "1".repeat(LIMITS.versionLength + 1) }, /"version" argument must not exceed 64/)
    await rejectsInput("search_components", { query: "x".repeat(LIMITS.queryLength + 1) }, /"query" argument must not exceed 256/)
    await rejectsInput("search_components", { query: "x", limit: 0 }, /between 1 and 100 \(received 0\)/)
    await rejectsInput("search_components", { query: "x", limit: LIMITS.searchLimit + 1 }, /between 1 and 100 \(received 101\)/)
    await rejectsInput("install_plan", { items: [] }, /non-empty array/)
    await rejectsInput("install_plan", { items: Array.from({ length: LIMITS.items + 1 }, (_, i) => `item-${i}`) }, /at most 32 names per call \(received 33\)/)
    await rejectsInput("install_plan", { items: ["button", " button "] }, /Duplicate "items" entry "button"/)
    await rejectsInput("install_plan", { items: [""] }, /Every "items" entry must be a non-empty string/)
    await rejectsInput("install_plan", { items: ["button"], srcDir: "../outside" }, /"srcDir" argument must be a relative directory inside the project \(received "\.\.\/outside"\)/)
    await rejectsInput("install_plan", { items: ["button"], srcDir: "/etc" }, /relative directory/)
    await rejectsInput("install_plan", { items: ["button"], srcDir: "C:\\\\app" }, /relative directory/)
    await rejectsInput("install_plan", { items: ["button"], srcDir: "src//app" }, /relative directory/)
    await rejectsInput("scaffold_plan", { framework: "vite", starter: "auth", name: "n".repeat(LIMITS.projectNameLength + 1) }, /"name" argument must not exceed 64/)
    await rejectsInput("decode_preset", { preset: "p".repeat(LIMITS.presetLength + 1) }, /"preset" argument must not exceed 256/)
    await rejectsInput("lint_theme", { css: "x".repeat(LIMITS.cssBytes + 1) }, /"css" argument must not exceed 1000000 bytes \(received 1000001\)/)
    await rejectsInput("apply_preset", { css: "é".repeat(LIMITS.cssBytes / 2 + 1) }, /must not exceed 1000000 bytes/)
    await rejectsInput("contrast_audit", { tokens: {} }, /at least one token/)
    await rejectsInput(
      "contrast_audit",
      { tokens: Object.fromEntries(Array.from({ length: LIMITS.tokenEntries + 1 }, (_, i) => [`t${i}`, "oklch(0 0 0)"])) },
      /at most 256 tokens \(received 257\)/
    )
    await rejectsInput("contrast_audit", { tokens: { primary: "x".repeat(LIMITS.tokenLength + 1) } }, /at most 256 characters/)
  })

  test("normalizes valid arguments", () => {
    assert.deepEqual(validateToolArguments("install_plan", { items: [" button ", "card"], srcDir: "./", version: " next " }), {
      version: "next", items: ["button", "card"], srcDir: "", iconLibrary: "lucide",
    })
    assert.deepEqual(validateToolArguments("install_plan", { items: ["button"], srcDir: "app/" }).srcDir, "app")
    assert.deepEqual(validateToolArguments("install_plan", { items: ["button"], srcDir: "." }).srcDir, "")
    assert.deepEqual(validateToolArguments("search_components", { query: " login ", limit: 5 }), { query: "login", limit: 5 })
    assert.deepEqual(validateToolArguments("list_components", { kind: "chart", ignored: true }), { kind: "chart" })
  })

  test("echoed input is truncated in error messages", async () => {
    assert.equal(echo("x".repeat(100)).length, LIMITS.echoLength + 1)
    const registry = new ImmutableRegistry({ items: [{ name: "theme", type: "registry:style", files: [] }] })
    const long = "p".repeat(LIMITS.presetLength)
    const result = await runTool("decode_preset", { preset: long }, { base, fetchImpl: registry.fetchImpl })
    assert.ok(result.isError)
    assert.ok(!result.content[0].text.includes(long), "full preset is not echoed")
    assert.ok(result.content[0].text.length < 200)
  })
})

describe("resource limits", () => {
  const big = (bytes: number) => "a".repeat(bytes)

  test("a registry document above the document limit is rejected", async () => {
    const registry = new ImmutableRegistry({
      items: [{
        name: "huge", type: "registry:ui",
        files: [{ path: "ui/huge.tsx", type: "registry:ui", content: big(LIMITS.registryDocumentBytes + 16) }],
      }],
    })
    const result = await runTool("get_component", { name: "huge" }, { base, fetchImpl: registry.fetchImpl })
    assert.ok(result.isError)
    assert.match(result.content[0].text, /above the 4194304-byte document limit/)
  })

  test("a plan whose source exceeds the response limit is an execution error", async () => {
    const half = Math.floor(LIMITS.responseSourceBytes / 2) + 1024
    const registry = new ImmutableRegistry({
      items: [
        { name: "one", type: "registry:ui", files: [{ path: "ui/one.tsx", type: "registry:ui", content: big(half) }] },
        { name: "two", type: "registry:ui", files: [{ path: "ui/two.tsx", type: "registry:ui", content: big(half) }] },
      ],
    })
    const single = await runTool("get_component", { name: "one" }, { base, fetchImpl: registry.fetchImpl })
    assert.ok(!single.isError, "one item under the limit is fine")
    const plan = await runTool("install_plan", { items: ["one", "two"] }, { base, fetchImpl: registry.fetchImpl })
    assert.ok(plan.isError)
    assert.match(plan.content[0].text, /above the 4194304-byte response limit\. Request fewer items per call/)
  })
})
