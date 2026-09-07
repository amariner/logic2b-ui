import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { auditTokens } from "../src/contrast.ts"
import { CURATED_PRESETS, getCuratedPreset } from "../src/gallery.ts"
import {
  auditTypeset,
  decodePreset,
  encodePreset,
  presetDeclarations,
} from "../src/index.ts"

describe("curated preset gallery", () => {
  test("uses unique stable slugs and canonical preset ids", () => {
    assert.equal(CURATED_PRESETS.length, 8)
    assert.equal(new Set(CURATED_PRESETS.map((entry) => entry.slug)).size, 8)
    assert.equal(new Set(CURATED_PRESETS.map((entry) => entry.preset)).size, 8)

    for (const entry of CURATED_PRESETS) {
      assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      assert.deepEqual(decodePreset(entry.preset), entry.config)
      assert.equal(encodePreset(entry.config), entry.preset)
      assert.ok(entry.tags.length >= 3)
    }
  })

  test("keeps every editorial typeset pairing inside the readability guardrails", () => {
    for (const entry of CURATED_PRESETS) {
      assert.deepEqual(
        auditTypeset(entry.config).filter((check) => !check.ok),
        [],
        `${entry.slug} has a readability warning`,
      )
    }
  })

  test("keeps contrast output measurable for both modes", () => {
    for (const entry of CURATED_PRESETS) {
      const light = auditTokens(presetDeclarations(entry.config, "light"))
      const dark = auditTokens(presetDeclarations(entry.config, "dark"))
      assert.ok(light.length > 0)
      assert.equal(light.length, dark.length)
      assert.ok([...light, ...dark].every((result) => Number.isFinite(result.wcag)))
    }
  })

  test("looks up known slugs without inventing fallbacks", () => {
    assert.equal(getCuratedPreset("foundation"), CURATED_PRESETS[0])
    assert.equal(getCuratedPreset("unknown"), undefined)
  })
})
