import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  demosIndexUrl,
  demoUrl,
  indexUrl,
  itemUrl,
  type FetchLike,
  type IndexItem,
} from "../src/registry.ts"
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
  test("exposes the registry and theme tools", () => {
    assert.deepEqual(
      TOOLS.map((t) => t.name),
      [
        "list_components",
        "search_components",
        "get_component",
        "get_demo",
        "add_command",
        "install_plan",
        "get_theme",
        "decode_preset",
        "apply_preset",
      ]
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

describe("runTool — demos and add_command", () => {
  const fetchImpl = fakeFetch({
    [indexUrl(base)]: index,
    [demosIndexUrl(base)]: [
      { item: "button", demos: ["button-demo", "button-outline-demo"] },
      { item: "login-01", demos: ["login-01-demo"] },
    ],
    [demoUrl(base, "button-demo")]: {
      name: "button-demo", item: "button", content: 'import { Button } from "@/components/ui/button"',
    },
    [demoUrl(base, "button-outline-demo")]: {
      name: "button-outline-demo", item: "button", content: "// outline",
    },
  })

  test("get_demo by item returns every demo with source", async () => {
    const r = await runTool("get_demo", { name: "button" }, { base, fetchImpl })
    assert.ok(!r.isError)
    const payload = parseText(r)
    assert.equal(payload.count, 2)
    assert.match(payload.demos[0].content, /@\/components\/ui\/button/)
  })

  test("get_demo by demo name returns just that demo", async () => {
    const r = await runTool("get_demo", { name: "button-outline-demo" }, { base, fetchImpl })
    const payload = parseText(r)
    assert.equal(payload.count, 1)
    assert.equal(payload.item, "button")
  })

  test("get_demo for an unknown name lists what has demos", async () => {
    const r = await runTool("get_demo", { name: "ghost" }, { base, fetchImpl })
    assert.ok(r.isError)
    assert.match(r.content[0].text, /button, login-01/)
  })

  test("add_command builds per-PM commands for valid items", async () => {
    const r = await runTool("add_command", { items: ["button", "login-01"] }, { base, fetchImpl })
    assert.ok(!r.isError)
    const payload = parseText(r)
    assert.equal(payload.commands.npm, "npx logic2b@latest add button login-01")
    assert.equal(payload.commands.pnpm, "pnpm dlx logic2b@latest add button login-01")
    assert.ok(payload.notes.some((n: string) => n.includes("install_plan")))
  })

  test("add_command rejects unknown items", async () => {
    const r = await runTool("add_command", { items: ["button", "ghost"] }, { base, fetchImpl })
    assert.ok(r.isError)
    assert.match(r.content[0].text, /Unknown item\(s\): ghost/)
  })
})

const THEME_CSS = `:root {
  --radius: 0.625rem;
  --primary: oklch(0.205 0 0);
}

.dark {
  --primary: oklch(0.922 0 0);
}`

describe("runTool — acting tools", () => {
  const fetchImpl = fakeFetch({
    [itemUrl(base, "button")]: {
      name: "button", type: "registry:ui", description: "x",
      dependencies: ["radix-ui"],
      files: [{ path: "ui/button.tsx", type: "registry:ui", content: "// button" }],
    },
    [itemUrl(base, "theme")]: {
      name: "theme", type: "registry:style", description: "the theme",
      dependencies: ["tw-animate-css"],
      files: [{ path: "theme.css", type: "registry:style", content: THEME_CSS }],
      docs: "Import it.",
    },
  })

  test("install_plan returns files, deps and notes", async () => {
    const r = await runTool("install_plan", { items: ["button"] }, { base, fetchImpl })
    assert.ok(!r.isError)
    const plan = parseText(r)
    assert.deepEqual(plan.files, [{ path: "src/components/ui/button.tsx", content: "// button" }])
    assert.deepEqual(plan.npmDependencies, ["radix-ui"])
    assert.ok(plan.notes.some((n: string) => n.includes('"@/*"')))
  })

  test("install_plan requires a non-empty items array", async () => {
    const r = await runTool("install_plan", { items: [] }, { base, fetchImpl })
    assert.ok(r.isError)
  })

  test("get_theme returns the stylesheet and the option catalog", async () => {
    const r = await runTool("get_theme", {}, { base, fetchImpl })
    assert.ok(!r.isError)
    const theme = parseText(r)
    assert.equal(theme.file.path, "src/styles/theme.css")
    assert.match(theme.file.content, /--primary/)
    assert.ok(theme.options.base.includes("slate"))
    assert.ok(theme.options.accent.includes("violet"))
    assert.equal(theme.defaults.base, "neutral")
  })

  test("decode_preset explains an invalid id", async () => {
    const r = await runTool("decode_preset", { preset: "???" }, { base, fetchImpl })
    assert.ok(r.isError)
    assert.match(r.content[0].text, /not a valid preset id/)
  })

  test("apply_preset patches the registry stylesheet from explicit options", async () => {
    const r = await runTool(
      "apply_preset",
      { accent: "blue", radius: "xl" },
      { base, fetchImpl }
    )
    assert.ok(!r.isError)
    const out = parseText(r)
    assert.match(out.file.content, /--primary: oklch\(0\.546 0\.245 262\.881\);/)
    assert.match(out.file.content, /--radius: 1rem;/)
    assert.deepEqual(out.npmDependencies, ["tw-animate-css"])
    // The id round-trips through decode_preset.
    const decoded = await runTool("decode_preset", { preset: out.preset }, { base, fetchImpl })
    assert.equal(parseText(decoded).config.theme, "blue")
  })

  test("apply_preset patches caller-provided css without fetching", async () => {
    const r = await runTool(
      "apply_preset",
      { accent: "green", css: THEME_CSS },
      { base, fetchImpl: fakeFetch({}) }
    )
    assert.ok(!r.isError)
    const out = parseText(r)
    assert.match(out.file.content, /--primary: oklch\(0\.548 0\.166 156\.743\);/)
    assert.equal(out.npmDependencies, undefined)
  })

  test("apply_preset rejects unknown option values", async () => {
    const r = await runTool("apply_preset", { accent: "neon" }, { base, fetchImpl })
    assert.ok(r.isError)
    assert.match(r.content[0].text, /Unknown accent "neon"/)
  })
})
