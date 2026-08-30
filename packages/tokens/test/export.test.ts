import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { DEFAULT_CONFIG } from "../src/index.ts"
import {
  oklchToHex8,
  portableModeTokens,
  portableTokenBundle,
} from "../src/export.ts"

describe("portable token export", () => {
  test("emits a lossless DTCG-shaped light/dark bundle", () => {
    const bundle = portableTokenBundle(DEFAULT_CONFIG)
    assert.equal(bundle.$extensions.logic2b.modes.join(","), "light,dark")
    assert.deepEqual(bundle.light.background, {
      $type: "color",
      $value: "oklch(1 0 0)",
    })
    assert.deepEqual(bundle.global.radius, {
      $type: "dimension",
      $value: { value: 0.625, unit: "rem" },
    })
    assert.equal(bundle.light.radius, undefined)
    assert.equal(bundle.dark.radius, undefined)
    assert.equal(bundle.global["type-leading-base"].$type, "number")
  })

  test("derives deterministic #RRGGBBAA native colors", () => {
    assert.equal(oklchToHex8("oklch(1 0 0)"), "#FFFFFFFF")
    assert.equal(oklchToHex8("oklch(0 0 0 / 10%)"), "#0000001A")
    const native = portableModeTokens(DEFAULT_CONFIG, "dark", {
      nativeColors: true,
    })
    assert.match(String(native.background.$value), /^#[0-9A-F]{8}$/)
    assert.equal(native.background.$type, "color")
  })

  test("rejects values that are not oklch colors", () => {
    assert.throws(() => oklchToHex8("#fff"), /non-oklch color/)
  })
})
