import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"

import {
  applyPresetToProject,
  COMMAND_IDS,
  documentationUrl,
  fetchRegistryIndex,
  groupRegistryItems,
  normalizeRegistryUrl,
  registryIndexUrl,
  themePathFromCssEntry,
  validateRegistryIndex,
  type RegistryIndexItem,
} from "../src/core.ts"

const items: RegistryIndexItem[] = [
  {
    name: "button",
    type: "registry:ui",
    title: "Button",
    description: "Trigger an action.",
    categories: ["form"],
  },
  {
    name: "login-01",
    type: "registry:block",
    description: "Authentication screen.",
    categories: ["authentication"],
  },
  {
    name: "chart-area-01",
    type: "registry:block",
    description: "Area chart.",
    categories: ["charts", "charts-area"],
  },
  {
    name: "theme",
    type: "registry:theme",
    description: "Theme tokens.",
  },
]

describe("registry contract", () => {
  test("normalizes secure origins and builds the index URL", () => {
    assert.equal(normalizeRegistryUrl("https://example.com/"), "https://example.com")
    assert.equal(
      registryIndexUrl("http://localhost:4321"),
      "http://localhost:4321/r/index.json",
    )
    assert.throws(() => normalizeRegistryUrl("http://example.com"), /HTTPS/)
    assert.throws(
      () => normalizeRegistryUrl("https://user:secret@example.com"),
      /credentials/,
    )
  })

  test("validates and groups only installable public items", () => {
    assert.deepEqual(validateRegistryIndex(items), items)
    assert.deepEqual(
      groupRegistryItems(items).map((group) => [group.label, group.items.length]),
      [
        ["Components", 1],
        ["Blocks", 1],
        ["Charts", 1],
      ],
    )
    assert.deepEqual(
      groupRegistryItems(items, "area chart")[0].items.map((item) => item.name),
      ["chart-area-01"],
    )
    assert.throws(
      () => validateRegistryIndex([{ name: "button; rm", type: "registry:ui", description: "x" }]),
      /invalid contract/,
    )
  })

  test("fetches through the fixed registry index surface", async () => {
    let requested = ""
    const result = await fetchRegistryIndex("https://registry.example", async (url) => {
      requested = url
      return { ok: true, status: 200, json: async () => items }
    })
    assert.equal(requested, "https://registry.example/r/index.json")
    assert.equal(result.length, 4)
  })

  test("builds user-facing documentation routes", () => {
    assert.equal(
      documentationUrl("https://ui.logic2b.com", items[0]),
      "https://ui.logic2b.com/docs/components/button",
    )
    assert.equal(
      documentationUrl("https://ui.logic2b.com", items[1]),
      "https://ui.logic2b.com/blocks/authentication/login-01",
    )
    assert.equal(
      documentationUrl("https://ui.logic2b.com", items[2]),
      "https://ui.logic2b.com/charts/area",
    )
  })
})

describe("preset project patch", () => {
  test("updates theme.css and the stored canonical preset together", () => {
    const requested = encodePreset({
      ...DEFAULT_CONFIG,
      base: "slate",
      theme: "violet",
      radius: "xl",
      iconLibrary: "tabler",
    })
    const config = JSON.stringify({
      style: "default",
      tailwind: { css: "src/styles/globals.css", baseColor: "neutral" },
      aliases: { ui: "@/components/ui" },
      logic2b: { registry: "https://ui.logic2b.com", version: "next" },
    })
    const css = ":root {\n  --background: oklch(1 0 0);\n}\n.dark {\n  --background: oklch(0 0 0);\n}\n"
    const patch = applyPresetToProject(config, css, requested)
    const updated = JSON.parse(patch.config)

    assert.equal(patch.themePath, "src/styles/theme.css")
    assert.equal(patch.presetId, requested)
    assert.equal(updated.tailwind.baseColor, "slate")
    assert.equal(updated.iconLibrary, "tabler")
    assert.equal(updated.logic2b.preset, requested)
    assert.equal(updated.logic2b.version, "next")
    assert.match(patch.themeCss, /--primary: oklch\(/)
    assert.match(patch.themeCss, /--radius: 1rem/)
  })

  test("rejects malformed projects and unsafe theme paths", () => {
    assert.equal(themePathFromCssEntry("styles/global.css"), "styles/theme.css")
    assert.throws(() => themePathFromCssEntry("../global.css"), /unsafe/)
    assert.throws(() => themePathFromCssEntry("C:\\global.css"), /unsafe/)
    assert.throws(
      () => applyPresetToProject("{}", "", encodePreset(DEFAULT_CONFIG)),
      /tailwind\.css/,
    )
    assert.throws(() => applyPresetToProject("{}", "", "invalid"), /Preset id/)
  })
})

test("the extension manifest contributes every registered command", () => {
  const manifest = JSON.parse(readFileSync(resolve("package.json"), "utf8"))
  assert.deepEqual(
    manifest.contributes.commands.map((command: { command: string }) => command.command),
    [...COMMAND_IDS],
  )
})

test("the extension-host bundle stays single-file and within budget", () => {
  const bundlePath = resolve("dist/extension.js")
  const bundle = readFileSync(bundlePath, "utf8")
  assert.ok(statSync(bundlePath).size <= 32 * 1024)
  assert.match(bundle, /require\(["']vscode["']\)/)
  assert.doesNotMatch(bundle, /require\(["']@logic2b\/tokens/)
})
