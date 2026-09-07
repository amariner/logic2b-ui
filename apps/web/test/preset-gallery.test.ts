import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

import { CURATED_PRESETS } from "@logic2b/tokens/gallery"
import { CLI_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"
import { runTool } from "../../../packages/mcp/src/tools.ts"

import {
  presetGallery,
  presetGalleryPayload,
} from "../src/data/preset-gallery.ts"

const read = (path: string) => readFileSync(resolve(path), "utf8")

describe("curated preset gallery", () => {
  test("mirrors the shared token catalog in both locales", () => {
    const english = presetGallery("en")
    const spanish = presetGallery("es")
    assert.deepEqual(english.map((entry) => entry.slug), CURATED_PRESETS.map((entry) => entry.slug))
    assert.deepEqual(spanish.map((entry) => entry.slug), english.map((entry) => entry.slug))

    for (let index = 0; index < english.length; index += 1) {
      const entry = english[index]
      const translated = spanish[index]
      assert.equal(entry.preset, translated.preset)
      assert.equal(entry.config, translated.config)
      assert.notEqual(entry.description, translated.description)
      assert.match(entry.links.studio, new RegExp(`^/create\\?preset=${entry.preset}$`))
      assert.equal(entry.command, `npx ${CLI_PACKAGE_SELECTOR} init --preset ${entry.preset}`)
      assert.match(entry.styles.light, /--background:/)
      assert.match(entry.styles.dark, /--background:/)
      assert.deepEqual(entry.audit.readabilityWarnings, [])
      assert.ok(entry.audit.contrastWarnings.length > 0)
    }
  })

  test("publishes deterministic JSON without render-only styles", () => {
    const payload = presetGalleryPayload()
    assert.equal(payload.schemaVersion, 1)
    assert.equal(payload.count, CURATED_PRESETS.length)
    assert.deepEqual(payload.presets.map((entry) => entry.slug), CURATED_PRESETS.map((entry) => entry.slug))
    for (const entry of payload.presets) {
      assert.equal("styles" in entry, false)
      assert.ok(entry.translations.es.description.length > 20)
      assert.ok(entry.audit.contrastWarnings.every((warning) => warning.mode === "light" || warning.mode === "dark"))
    }
  })

  test("web and MCP publish identical presets, commands and measured audits", async () => {
    const result = await runTool("list_presets", {}, {
      fetchImpl: async () => { throw new Error("Preset discovery must not fetch") },
    })
    assert.ok(!result.isError)
    const mcp = JSON.parse(result.content[0].text)
    const web = presetGalleryPayload()
    assert.equal(mcp.count, web.count)
    for (const [index, { translations: _translations, links, ...entry }] of web.presets.entries()) {
      const { links: mcpLinks, ...mcpEntry } = mcp.presets[index]
      assert.deepEqual(mcpEntry, entry)
      assert.equal(mcpLinks.studio, new URL(links.studio, "https://ui.logic2b.com").href)
    }
  })

  test("connects HTML, JSON, search, sitemap and agent discovery", () => {
    const gallery = read("src/components/themes/ThemeGallery.astro")
    assert.match(gallery, /alternateHref=/)
    assert.match(gallery, /data-copy-preset/)
    assert.match(gallery, /contrastWarnings/)
    assert.match(read("src/data/preset-gallery.ts"), /\/create\?preset=/)
    assert.match(read("src/pages/themes/index.json.ts"), /presetGalleryPayload/)
    assert.match(read("src/lib/search-index.ts"), /Theme Gallery/)
    assert.match(read("src/lib/search-index.ts"), /Galería de temas/)
    assert.match(read("src/pages/sitemap.xml.ts"), /"\/themes"/)
    assert.match(read("src/pages/sitemap.xml.ts"), /"\/es\/themes"/)
    assert.match(read("src/pages/llms.txt.ts"), /themes\/index\.json/)
    assert.match(read("src/pages/es/llms.txt.ts"), /themes\/index\.json/)
  })
})
