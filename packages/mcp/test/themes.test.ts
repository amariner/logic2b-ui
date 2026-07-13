import assert from "node:assert/strict"
import { describe, test } from "node:test"

import * as cli from "../../cli/src/themes.ts"
import {
  ACCENTS,
  applyPresetToCss,
  BASE_COLORS,
  CHARTS,
  decodePreset,
  DEFAULT_CONFIG,
  encodePreset,
  FONTS,
  presetDeclarations,
  RADII,
} from "../src/themes.ts"

describe("mirror of packages/cli/src/themes.ts", () => {
  // The MCP copy must stay in lockstep with the CLI copy (single source of
  // truth is a roadmap item — until then, this test is the sync guard).
  test("token tables are identical", () => {
    assert.deepEqual(BASE_COLORS, cli.BASE_COLORS)
    assert.deepEqual(ACCENTS, cli.ACCENTS)
    assert.deepEqual(CHARTS, cli.CHARTS)
    assert.deepEqual(RADII, cli.RADII)
    assert.deepEqual(FONTS, cli.FONTS)
    assert.deepEqual(DEFAULT_CONFIG, cli.DEFAULT_CONFIG)
  })

  test("decodePreset agrees with the CLI for a sample id", () => {
    const id = encodePreset({
      base: "slate", theme: "violet", chart: "violet",
      radius: "lg", font: "grotesk", heading: "grotesk",
    })
    assert.deepEqual(decodePreset(id), cli.decodePreset(id))
  })

  test("declarations agree with the CLI for both modes", () => {
    const cfg = { ...DEFAULT_CONFIG, base: "zinc", theme: "green" }
    assert.deepEqual(presetDeclarations(cfg, "light"), cli.presetDeclarations(cfg, "light"))
    assert.deepEqual(presetDeclarations(cfg, "dark"), cli.presetDeclarations(cfg, "dark"))
  })
})

describe("encodePreset / decodePreset", () => {
  test("round-trips every table combination shape", () => {
    const cfg = {
      base: "stone", theme: "rose", chart: "rose",
      radius: "sm", font: "serif", heading: "inter",
    }
    assert.deepEqual(decodePreset(encodePreset(cfg)), cfg)
  })

  test("ids are URL-safe (no +, / or padding)", () => {
    const id = encodePreset(DEFAULT_CONFIG)
    assert.doesNotMatch(id, /[+/=]/)
  })

  test("rejects garbage, wrong arity and unknown values", () => {
    assert.equal(decodePreset("%%%"), null)
    assert.equal(decodePreset(btoa("just|two")), null)
    assert.equal(decodePreset(btoa("nope|base|default|default|inter|inter")), null)
  })
})

describe("applyPresetToCss", () => {
  const css = `:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --primary: oklch(0.922 0 0);
}

@theme inline {
  --color-primary: var(--primary);
}`

  test("rewrites tokens in both blocks and keeps the rest", () => {
    const cfg = { ...DEFAULT_CONFIG, theme: "blue", radius: "xl" }
    const out = applyPresetToCss(css, cfg)
    assert.match(out, /:root \{[^}]*--primary: oklch\(0\.546 0\.245 262\.881\);/s)
    assert.match(out, /\.dark \{[^}]*--primary: oklch\(0\.623 0\.214 259\.815\);/s)
    assert.match(out, /--radius: 1rem;/)
    assert.match(out, /@theme inline/)
  })

  test("appends declarations the stylesheet lacks (e.g. sidebar tokens)", () => {
    const out = applyPresetToCss(css, DEFAULT_CONFIG)
    assert.match(out, /--sidebar: oklch\(0\.985 0 0\);/)
    assert.match(out, /--font-heading:/)
  })
})
