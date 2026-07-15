import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  applyPresetToCss,
  auditTypeset,
  buildTypesetCss,
  decodePreset,
  DEFAULT_CONFIG,
  encodePreset,
  presetDeclarations,
  resolveTokens,
  resolveTypeset,
} from "../src/index.ts"

const encode = (raw: string) =>
  Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

// The default preset /create shows on load.
const DEFAULT_ID = encode(
  "neutral|base|default|default|inter|inter|mono|default|default|default|default",
)
// A preset id in the pre-/typeset 6-field format, shared before "mono",
// "measure", "size", "leading" and "flow" existed — decodePreset must still
// accept these (see the LEGACY_LENGTH comment on ORDER in src/index.ts).
const LEGACY_DEFAULT_ID = encode("neutral|base|default|default|inter|inter")

const SAMPLE_CSS = `@import "tailwindcss";

:root {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Space Grotesk Variable", "Inter Variable", ui-sans-serif,
    system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;
  --background: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  --chart-1: oklch(0.646 0.222 41.116);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --sidebar-ring: oklch(0.556 0 0);
}

@theme inline {
  --color-primary: var(--primary);
}
`

describe("encodePreset / decodePreset", () => {
  it("round-trips the default config", () => {
    assert.equal(encodePreset(DEFAULT_CONFIG), DEFAULT_ID)
    assert.deepEqual(decodePreset(DEFAULT_ID), DEFAULT_CONFIG)
  })

  it("decodes a legacy 6-field id (pre-/typeset) to the default typeset fields", () => {
    assert.deepEqual(decodePreset(LEGACY_DEFAULT_ID), DEFAULT_CONFIG)
  })

  it("round-trips a fully custom preset", () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      base: "slate",
      theme: "blue",
      chart: "violet",
      radius: "lg",
      font: "system",
      heading: "grotesk",
    }
    assert.deepEqual(decodePreset(encodePreset(cfg)), cfg)
  })

  it("ids are URL-safe (no +, / or padding)", () => {
    const id = encodePreset({
      ...DEFAULT_CONFIG,
      base: "stone", theme: "rose", chart: "rose",
      radius: "sm", font: "serif", heading: "inter",
    })
    assert.doesNotMatch(id, /[+/=]/)
  })

  it("rejects malformed and unknown ids", () => {
    assert.equal(decodePreset("not-base64!!"), null)
    assert.equal(decodePreset("%%%"), null)
    assert.equal(decodePreset(encode("only|three|parts")), null)
    assert.equal(decodePreset(encode("bogus|base|default|default|inter|inter")), null)
    assert.equal(decodePreset(encode("neutral|base|default|huge|inter|inter")), null)
  })
})

describe("resolveTokens", () => {
  it("applies the accent over the base primary/ring", () => {
    const cfg = { ...DEFAULT_CONFIG, theme: "blue" }
    const { tokens } = resolveTokens(cfg, "light")
    assert.equal(tokens.primary, "oklch(0.546 0.245 262.881)")
    assert.equal(tokens.ring, tokens.primary)
  })

  it("keeps the base primary when accent is base", () => {
    const { tokens } = resolveTokens(DEFAULT_CONFIG, "dark")
    assert.equal(tokens.primary, "oklch(0.922 0 0)")
  })
})

describe("presetDeclarations", () => {
  it("pins radius and fonts only in light (:root)", () => {
    const light = presetDeclarations(DEFAULT_CONFIG, "light")
    const dark = presetDeclarations(DEFAULT_CONFIG, "dark")
    assert.equal(light.radius, "0.625rem")
    assert.ok(light["font-sans"].includes("Inter"))
    assert.equal(dark.radius, undefined)
    assert.equal(dark["font-sans"], undefined)
  })

  it("derives sidebar tokens from the ladder", () => {
    const dark = presetDeclarations(DEFAULT_CONFIG, "dark")
    assert.equal(dark["sidebar"], "oklch(0.205 0 0)") // card surface
    assert.equal(dark["sidebar-primary"], "oklch(0.922 0 0)")
  })
})

describe("applyPresetToCss", () => {
  it("rewrites :root and .dark without touching other blocks", () => {
    const cfg = decodePreset(encode("zinc|green|blue|xl|serif|mono"))!
    const out = applyPresetToCss(SAMPLE_CSS, cfg)
    // :root got the zinc light background and the xl radius.
    assert.match(out, /:root \{[^}]*--background: oklch\(1 0 0\);/)
    assert.match(out, /:root \{[^}]*--radius: 1rem;/)
    assert.match(out, /:root \{[^}]*--font-sans: ui-serif, Georgia, Cambria, serif;/)
    // .dark got the green accent primary.
    assert.match(out, /\.dark \{[^}]*--primary: oklch\(0\.696 0\.17 162\.48\);/)
    // The multi-line --font-heading declaration was replaced in one piece.
    assert.match(out, /--font-heading: ui-monospace, SFMono-Regular, Menlo, monospace;/)
    assert.ok(!out.includes('"Space Grotesk Variable"'))
    // @theme block untouched.
    assert.ok(out.includes("--color-primary: var(--primary);"))
  })

  it("appends declarations missing from a block", () => {
    const cfg = decodePreset(DEFAULT_ID)!
    const out = applyPresetToCss(SAMPLE_CSS, cfg)
    // SAMPLE_CSS has no --card in :root; the preset adds it.
    assert.match(out, /:root \{[^}]*--card: oklch\(1 0 0\);/)
    // Sidebar tokens the stylesheet lacks get appended too.
    assert.match(out, /--sidebar: oklch\(0\.985 0 0\);/)
  })

  it("replaces --ring without clobbering --sidebar-ring", () => {
    const cfg = decodePreset(encode("neutral|blue|default|default|inter|inter"))!
    const out = applyPresetToCss(SAMPLE_CSS, cfg)
    // ring takes the accent; sidebar-ring is set as its own declaration.
    assert.match(out, /:root \{[^}]*--ring: oklch\(0\.546 0\.245 262\.881\);/)
    assert.match(out, /--sidebar-ring: oklch\(0\.546 0\.245 262\.881\);/)
  })

  it("is idempotent", () => {
    const cfg = decodePreset(encode("stone|rose|orange|sm|grotesk|inter"))!
    const once = applyPresetToCss(SAMPLE_CSS, cfg)
    const twice = applyPresetToCss(once, cfg)
    assert.equal(once, twice)
  })
})

describe("custom accents (h<hue>c<chroma>)", () => {
  it("decodes a preset with custom accent and chart keys", () => {
    const cfg = decodePreset(encode("slate|h250c0.2|h250c0.2|lg|inter|inter"))
    assert.ok(cfg)
    assert.equal(cfg!.theme, "h250c0.2")
    assert.equal(cfg!.chart, "h250c0.2")
  })

  it("round-trips custom keys through encodePreset", () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      base: "slate", theme: "h250c0.2", chart: "h200c0.15",
      radius: "lg", font: "inter", heading: "inter",
    }
    assert.deepEqual(decodePreset(encodePreset(cfg)), cfg)
  })

  it("rejects out-of-range custom keys", () => {
    assert.equal(decodePreset(encode("neutral|h400c0.2|default|default|inter|inter")), null)
    assert.equal(decodePreset(encode("neutral|h250c0.5|default|default|inter|inter")), null)
    assert.equal(decodePreset(encode("neutral|h250|default|default|inter|inter")), null)
  })

  it("resolves the accent at the anchored lightness with a readable fg", () => {
    const cfg = decodePreset(encode("neutral|h250c0.2|default|default|inter|inter"))!
    const light = resolveTokens(cfg, "light")
    const dark = resolveTokens(cfg, "dark")
    assert.equal(light.tokens.primary, "oklch(0.55 0.2 250)")
    assert.equal(dark.tokens.primary, "oklch(0.65 0.2 250)")
    // Azure at these lightnesses reads best with near-white text.
    assert.equal(light.tokens["primary-foreground"], "oklch(0.985 0 0)")
    assert.equal(light.tokens.ring, "oklch(0.55 0.2 250)")
  })

  it("keeps near-white fg for every hue (oklch anchors are uniform)", () => {
    for (const key of ["h110c0.25", "h95c0.18", "h45c0.21"]) {
      const cfg = decodePreset(encode(`neutral|${key}|default|default|inter|inter`))!
      assert.equal(resolveTokens(cfg, "dark").tokens["primary-foreground"], "oklch(0.985 0 0)")
    }
  })

  it("custom chart key generates the 5-stop ramp", () => {
    const cfg = decodePreset(encode("neutral|base|h200c0.15|default|inter|inter"))!
    const { chart } = resolveTokens(cfg, "light")
    assert.equal(chart.length, 5)
    assert.match(chart[0], /^oklch\(0\.55 0\.150 200\)$/)
  })

  it("applyPresetToCss writes the custom primary into both blocks", () => {
    const cfg = decodePreset(encode("neutral|h250c0.2|default|default|inter|inter"))!
    const out = applyPresetToCss(SAMPLE_CSS, cfg)
    assert.match(out, /:root \{[^}]*--primary: oklch\(0\.55 0\.2 250\);/)
    assert.match(out, /\.dark \{[^}]*--primary: oklch\(0\.65 0\.2 250\);/)
  })
})

describe("/typeset studio", () => {
  it("resolves the default typeset scale", () => {
    const t = resolveTypeset(DEFAULT_CONFIG)
    assert.equal(t.measure, "68ch")
    assert.equal(t.size, "16px")
    assert.equal(t.leading, "1.6")
    assert.equal(t.flow, "1.15em")
    assert.equal(t.fontMono, "ui-monospace, SFMono-Regular, Menlo, monospace")
  })

  it("buildTypesetCss emits a mode-independent :root block", () => {
    const css = buildTypesetCss(DEFAULT_CONFIG)
    assert.match(css, /--type-measure: 68ch;/)
    assert.match(css, /--type-leading-base: 1\.6;/)
    assert.ok(!css.includes(".dark"))
  })

  it("auditTypeset flags a wide measure with tight leading", () => {
    // "tight" (1.4) clears the leading floor on its own, but paired with a
    // wide (85ch) measure the combined check should still warn.
    const cfg = { ...DEFAULT_CONFIG, measure: "wide", leading: "tight" }
    const checks = auditTypeset(cfg)
    const combo = checks.find((c) => c.key === "measure-leading")!
    assert.equal(combo.ok, false)
    const measure = checks.find((c) => c.key === "measure")!
    assert.equal(measure.ok, false)
  })

  it("auditTypeset passes the default scale on every axis", () => {
    const checks = auditTypeset(DEFAULT_CONFIG)
    assert.ok(checks.every((c) => c.ok))
  })
})
