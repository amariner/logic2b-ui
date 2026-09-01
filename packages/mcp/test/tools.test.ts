import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { describe, test } from "node:test"

import {
  demosIndexUrl,
  demoUrl,
  changelogUrl,
  indexUrl,
  itemUrl,
  versionsUrl,
  type FetchLike,
  type IndexItem,
} from "../src/registry.ts"
import { runTool, TOOLS } from "../src/tools.ts"

const index: IndexItem[] = [
  {
    name: "button",
    type: "registry:ui",
    title: "Button",
    description: "A clickable button.",
    accessibility: "/r/button.json#accessibility",
    api: "/r/button.json#api",
  },
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
        "list_registry_versions",
        "get_changelog",
        "get_demo",
        "add_command",
        "install_plan",
        "scaffold_plan",
        "get_theme",
        "export_tokens",
        "decode_preset",
        "apply_preset",
        "contrast_audit",
        "lint_theme",
      ]
    )
  })

})

describe("runTool — versioned registry", () => {
  const item = {
    name: "button",
    type: "registry:ui",
    description: "Immutable button.",
    files: [{ path: "ui/button.tsx", type: "registry:ui", content: "// immutable" }],
  }
  const itemText = JSON.stringify(item)
  const integrity = `sha256-${createHash("sha256").update(itemText).digest("base64")}`
  const routes: Record<string, string> = {
    [versionsUrl(base)]: JSON.stringify({
      schemaVersion: 1,
      latest: "1.0.0",
      channels: { latest: "1.0.0" },
      versions: [
        {
          version: "1.0.0",
          channel: "latest",
          releasedAt: "2026-08-29",
          manifest: "/r/versions/1.0.0.json",
        },
      ],
    }),
    [`${base}/r/versions/1.0.0.json`]: JSON.stringify({
      schemaVersion: 1,
      version: "1.0.0",
      channel: "latest",
      releasedAt: "2026-08-29",
      items: [
        {
          name: "button",
          type: "registry:ui",
          description: "Immutable button.",
          version: "1.0.0",
          registryVersion: "1.0.0",
          integrity,
          content: "/r/content/button-v1.json",
          changelog: "/r/changelog/button.json",
        },
      ],
    }),
    [`${base}/r/content/button-v1.json`]: itemText,
    [changelogUrl(base, "button")]: JSON.stringify({
      schemaVersion: 1,
      name: "button",
      currentVersion: "1.0.0",
      changes: [
        { version: "1.0.0", releasedAt: "2026-08-29", kind: "baseline", summary: "Initial." },
      ],
    }),
  }
  const fetchImpl: FetchLike = async (url: string) =>
    url in routes
      ? { ok: true, status: 200, text: async () => routes[url] }
      : { ok: false, status: 404, text: async () => "Not found" }

  test("lists release metadata and per-item changelogs", async () => {
    const versions = parseText(
      await runTool("list_registry_versions", {}, { base, fetchImpl })
    )
    assert.equal(versions.latest, "1.0.0")
    const changes = parseText(
      await runTool("get_changelog", { name: "button" }, { base, fetchImpl })
    )
    assert.equal(changes.changes[0].kind, "baseline")
  })

  test("installs against one resolved immutable version", async () => {
    const plan = parseText(
      await runTool(
        "install_plan",
        { items: ["button"], version: "latest" },
        { base, fetchImpl }
      )
    )
    assert.equal(plan.requestedVersion, "latest")
    assert.equal(plan.registryVersion, "1.0.0")
    assert.equal(plan.items[0].integrity, integrity)
    assert.equal(plan.files[0].content, "// immutable")

    const command = parseText(
      await runTool(
        "add_command",
        { items: ["button"], version: "latest" },
        { base, fetchImpl }
      )
    )
    assert.match(command.commands.npm, /--registry-version 1\.0\.0$/)
  })
})

describe("runTool", () => {
  const fetchImpl = fakeFetch({
    [indexUrl(base)]: index,
    [itemUrl(base, "button")]: {
      name: "button",
      type: "registry:ui",
      description: "x",
      files: [],
      accessibility: {
        support: "native",
        pattern: "button",
        keyboard: [{ keys: ["Enter", "Space"], action: "Activate." }],
        aria: ["Uses native button semantics."],
        consumer: ["Provide an accessible name."],
      },
      api: {
        source: "src/ui/button.tsx",
        exports: [
          {
            name: "Button",
            kind: "component",
            propsType: 'React.ComponentProps<"button">',
            props: [
              { name: "asChild", type: "boolean", required: false, default: "false" },
            ],
          },
        ],
      },
    },
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
    assert.equal(payload.items[0].accessibility, "/r/button.json#accessibility")
    assert.equal(payload.items[0].api, "/r/button.json#api")
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
    assert.equal(parseText(r).accessibility.pattern, "button")
    assert.equal(parseText(r).api.exports[0].name, "Button")
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
    [indexUrl(base)]: [
      { name: "button", type: "registry:ui", description: "x" },
      { name: "theme", type: "registry:style", description: "the theme" },
      { name: "login-01", type: "registry:block", description: "login" },
    ],
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
    [itemUrl(base, "login-01")]: {
      name: "login-01", type: "registry:block", description: "login",
      dependencies: ["lucide-react"],
      files: [
        {
          path: "blocks/login-01/login-form.tsx",
          type: "registry:block",
          content: "export function LoginForm() { return null }",
        },
      ],
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

  test("scaffold_plan returns a complete shell through the MCP dispatcher", async () => {
    const r = await runTool(
      "scaffold_plan",
      { framework: "vite", starter: "auth", name: "agent-app" },
      { base, fetchImpl }
    )
    assert.ok(!r.isError)
    const plan = parseText(r)
    assert.equal(plan.projectName, "agent-app")
    assert.ok(plan.files.some((file: { path: string }) => file.path === "package.json"))
    assert.ok(
      plan.files.some(
        (file: { path: string }) => file.path === "src/components/login-01/login-form.tsx"
      )
    )
  })

  test("scaffold_plan validates framework and starter names", async () => {
    const r = await runTool(
      "scaffold_plan",
      { framework: "remix", starter: "auth" },
      { base, fetchImpl }
    )
    assert.ok(r.isError)
    assert.match(r.content[0].text, /framework.*next, vite, astro/)
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

  test("export_tokens returns a portable light/dark DTCG bundle", async () => {
    const r = await runTool(
      "export_tokens",
      { accent: "blue", radius: "xl", iconLibrary: "tabler" },
      { base, fetchImpl: fakeFetch({}) }
    )
    assert.ok(!r.isError)
    const exported = parseText(r)
    assert.equal(exported.bundle.global.radius.$value.value, 1)
    assert.equal(exported.bundle.light.primary.$type, "color")
    assert.match(exported.bundle.light.primary.$value, /^oklch\(/)
    assert.equal(exported.bundle.dark.primary.$type, "color")
    assert.deepEqual(exported.tokensStudio.$metadata.tokenSetOrder, [
      "global",
      "light",
      "dark",
    ])
    assert.deepEqual(
      exported.tokensStudio.$themes.map((theme: { name: string }) => theme.name),
      ["Light", "Dark"],
    )
    assert.match(
      exported.defaultArtifacts.tokensStudio,
      /logic2b\.tokens-studio\.json$/,
    )
  })

  test("decode_preset explains an invalid id", async () => {
    const r = await runTool("decode_preset", { preset: "???" }, { base, fetchImpl })
    assert.ok(r.isError)
    assert.match(r.content[0].text, /not a valid preset id/)
  })

  test("apply_preset patches the registry stylesheet from explicit options", async () => {
    const r = await runTool(
      "apply_preset",
      { accent: "blue", radius: "xl", iconLibrary: "tabler" },
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
    assert.equal(parseText(decoded).config.iconLibrary, "tabler")
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

  test("lint_theme verifies an exact applied preset", async () => {
    const applied = await runTool(
      "apply_preset",
      { accent: "blue", radius: "xl", css: THEME_CSS },
      { base, fetchImpl }
    )
    const theme = parseText(applied)
    const r = await runTool("lint_theme", {
      css: theme.file.content,
      preset: theme.preset,
    })
    assert.ok(!r.isError)
    const result = parseText(r)
    assert.equal(result.valid, true)
    assert.equal(result.clean, true)
    assert.equal(result.summary.errors, 0)
    assert.equal(result.expectedConfig.theme, "blue")
  })

  test("lint_theme returns actionable contract and drift issues", async () => {
    const incomplete = await runTool("lint_theme", { css: THEME_CSS })
    assert.ok(!incomplete.isError)
    const missing = parseText(incomplete)
    assert.equal(missing.valid, false)
    assert.ok(
      missing.issues.some(
        (issue: { code: string; token?: string }) =>
          issue.code === "missing-token" && issue.token === "background"
      )
    )

    const applied = parseText(
      await runTool("apply_preset", { css: THEME_CSS }, { base, fetchImpl })
    )
    const drifted = applied.file.content.replace(
      "--sidebar-ring: oklch(0.708 0 0)",
      "--sidebar-ring: oklch(0.4 0 0)"
    )
    const linted = parseText(
      await runTool("lint_theme", { css: drifted, preset: applied.preset })
    )
    assert.ok(
      linted.issues.some(
        (issue: { code: string; token?: string }) =>
          issue.code === "derived-token-drift" && issue.token === "sidebar-ring"
      )
    )
  })

  test("lint_theme validates its input without fetching", async () => {
    const missing = await runTool("lint_theme", {}, { fetchImpl: fakeFetch({}) })
    assert.ok(missing.isError)
    assert.match(missing.content[0].text, /"css" argument is required/)

    const badPreset = await runTool(
      "lint_theme",
      { css: THEME_CSS, preset: "not-a-preset" },
      { fetchImpl: fakeFetch({}) }
    )
    assert.ok(badPreset.isError)
    assert.match(badPreset.content[0].text, /not a valid preset id/)
  })
})

describe("runTool — custom accents", () => {
  const fetchImpl = fakeFetch({
    [indexUrl(base)]: [
      { name: "theme", type: "registry:style", description: "the theme" },
    ],
    [itemUrl(base, "theme")]: {
      name: "theme", type: "registry:style", description: "the theme",
      files: [{ path: "theme.css", type: "registry:style", content: THEME_CSS }],
    },
  })

  test("apply_preset accepts a custom accent key and round-trips it", async () => {
    const r = await runTool("apply_preset", { accent: "h250c0.2" }, { base, fetchImpl })
    assert.ok(!r.isError)
    const out = parseText(r)
    assert.equal(out.config.theme, "h250c0.2")
    assert.match(out.file.content, /--primary: oklch\(0\.55 0\.2 250\);/)
    const decoded = await runTool("decode_preset", { preset: out.preset }, { base, fetchImpl })
    assert.equal(parseText(decoded).config.theme, "h250c0.2")
  })

  test("apply_preset still rejects malformed custom keys", async () => {
    const r = await runTool("apply_preset", { accent: "h400c0.2" }, { base, fetchImpl })
    assert.ok(r.isError)
    assert.match(r.content[0].text, /h<hue>c<chroma>/)
  })

  test("contrast_audit audits a custom accent", async () => {
    const r = await runTool("contrast_audit", { accent: "h250c0.2" }, { base, fetchImpl })
    assert.ok(!r.isError)
    const out = parseText(r)
    const pair = out.light.find(
      (p: { fg: string; bg: string }) => p.bg === "primary"
    )
    assert.ok(pair, "primary pair audited")
  })
})
