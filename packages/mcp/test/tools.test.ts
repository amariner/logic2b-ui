import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { indexUrl, itemUrl, type FetchLike, type IndexItem } from "../src/registry.ts"
import { runTool, TOOLS } from "../src/tools.ts"

const index: IndexItem[] = [
  { name: "button", type: "registry:ui", title: "Button", description: "A clickable button." },
  {
    name: "login-01",
    type: "registry:block",
    title: "Login",
    description: "A centered login form.",
    categories: ["authentication"],
  },
  {
    name: "chart-area-01",
    type: "registry:block",
    title: "Area Chart",
    description: "A single-series area chart.",
    categories: ["charts", "charts-area"],
  },
]

const base = "https://reg.test"

function fakeFetch(routes: Record<string, unknown>): FetchLike {
  return async (url: string) => {
    if (url in routes) {
      return { ok: true, status: 200, text: async () => JSON.stringify(routes[url]) }
    }
    return { ok: false, status: 404, text: async () => "Not found" }
  }
}

function parseText(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0].text)
}

describe("TOOLS", () => {
  test("exposes the three registry tools", () => {
    assert.deepEqual(
      TOOLS.map((t) => t.name),
      ["list_components", "search_components", "get_component"]
    )
  })
})

describe("runTool", () => {
  const fetchImpl = fakeFetch({
    [indexUrl(base)]: index,
    [itemUrl(base, "button")]: { name: "button", type: "registry:ui", description: "x", files: [] },
  })

  test("list_components returns every item with kind summaries", async () => {
    const r = await runTool("list_components", {}, { base, fetchImpl })
    assert.ok(!r.isError)
    const payload = parseText(r)
    assert.equal(payload.count, 3)
    assert.deepEqual(
      payload.items.map((i: { kind: string }) => i.kind),
      ["component", "block", "chart"]
    )
  })

  test("list_components honors the kind filter", async () => {
    const r = await runTool("list_components", { kind: "chart" }, { base, fetchImpl })
    const payload = parseText(r)
    assert.deepEqual(payload.items.map((i: { name: string }) => i.name), ["chart-area-01"])
  })

  test("search_components requires a query", async () => {
    const r = await runTool("search_components", {}, { base, fetchImpl })
    assert.ok(r.isError)
  })

  test("search_components ranks name matches first", async () => {
    const r = await runTool("search_components", { query: "login" }, { base, fetchImpl })
    const payload = parseText(r)
    assert.equal(payload.items[0].name, "login-01")
  })

  test("get_component returns the full payload", async () => {
    const r = await runTool("get_component", { name: "button" }, { base, fetchImpl })
    assert.ok(!r.isError)
    assert.equal(parseText(r).name, "button")
  })

  test("get_component surfaces a fetch error as isError text", async () => {
    const r = await runTool("get_component", { name: "ghost" }, { base, fetchImpl })
    assert.ok(r.isError)
    assert.match(r.content[0].text, /HTTP 404/)
  })

  test("unknown tool is an isError result, not a throw", async () => {
    const r = await runTool("nope", {}, { base, fetchImpl })
    assert.ok(r.isError)
    assert.match(r.content[0].text, /Unknown tool/)
  })
})
