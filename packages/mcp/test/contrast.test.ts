import assert from "node:assert/strict"
import { describe, test } from "node:test"

import * as web from "../../../apps/web/src/lib/contrast.ts"
import {
  apcaContrast,
  auditTokens,
  CONTRAST_PAIRS,
  oklchToRgb,
  parseOklch,
  wcagRatio,
} from "../src/contrast.ts"
import { DEFAULT_CONFIG, presetDeclarations } from "@logic2b/tokens"

const WHITE = oklchToRgb("oklch(1 0 0)")!
const BLACK = oklchToRgb("oklch(0 0 0)")!

describe("mirror of apps/web/src/lib/contrast.ts", () => {
  test("pair table and math agree with the web module", () => {
    assert.deepEqual(CONTRAST_PAIRS, web.CONTRAST_PAIRS)
    const samples = [
      ["oklch(0.985 0 0)", "oklch(0.205 0 0)"],
      ["oklch(0.577 0.245 27.325)", "oklch(1 0 0)"],
      ["oklch(1 0 0 / 10%)", "oklch(0.145 0 0)"],
    ] as const
    for (const [a, b] of samples) {
      assert.deepEqual(oklchToRgb(a), web.oklchToRgb(a))
      const fg = oklchToRgb(a)!
      const bg = oklchToRgb(b)!
      assert.equal(wcagRatio(fg, bg), web.wcagRatio(fg, bg))
      assert.equal(apcaContrast(fg, bg), web.apcaContrast(fg, bg))
    }
  })
})

describe("color math", () => {
  test("parses oklch with and without alpha", () => {
    assert.deepEqual(parseOklch("oklch(0.5 0.1 200)"), { l: 0.5, c: 0.1, h: 200, alpha: 1 })
    assert.deepEqual(parseOklch("oklch(1 0 0 / 15%)"), { l: 1, c: 0, h: 0, alpha: 0.15 })
    assert.equal(parseOklch("#fff"), null)
  })

  test("white/black hits the WCAG and APCA reference values", () => {
    assert.ok(Math.abs(wcagRatio(WHITE, BLACK) - 21) < 0.01)
    assert.ok(Math.abs(apcaContrast(BLACK, WHITE) - 106.04) < 1)
    assert.ok(Math.abs(apcaContrast(WHITE, BLACK) - -107.88) < 1)
  })

  test("identical colors have no contrast", () => {
    assert.ok(Math.abs(wcagRatio(WHITE, WHITE) - 1) < 0.001)
    assert.equal(apcaContrast(WHITE, WHITE), 0)
  })
})

describe("auditTokens", () => {
  test("the default theme is clean except the known dark destructive pair", () => {
    const light = auditTokens(presetDeclarations(DEFAULT_CONFIG, "light"))
    assert.ok(light.length >= 10, `expected sidebar pairs too, got ${light.length}`)
    assert.deepEqual(light.filter((r) => r.warn), [])
    // Dark destructive (white on shadcn's lighter red) is a known upstream
    // trade-off: ~2.8:1 / |Lc| ~56. The audit must keep reporting it.
    const darkWarnings = auditTokens(presetDeclarations(DEFAULT_CONFIG, "dark"))
      .filter((r) => r.warn)
      .map((r) => r.bg)
    assert.deepEqual(darkWarnings, ["destructive"])
  })

  test("flags a failing pair", () => {
    const results = auditTokens({
      foreground: "oklch(0.7 0 0)",
      background: "oklch(0.6 0 0)",
    })
    assert.equal(results.length, 1)
    assert.ok(results[0].warn)
    assert.equal(results[0].wcagLevel, "fail")
  })

  test("composites alpha foregrounds over the pair background", () => {
    const results = auditTokens({
      foreground: "oklch(1 0 0 / 10%)",
      background: "oklch(0.145 0 0)",
    })
    assert.ok(results[0].wcag < 2, "a 10% white wash must not audit like solid white")
  })

  test("skips pairs with missing or unparsable tokens", () => {
    assert.deepEqual(auditTokens({ foreground: "red" }), [])
  })
})
