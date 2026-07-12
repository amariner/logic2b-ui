import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  applyPresetToCss,
  decodePreset,
  DEFAULT_CONFIG,
  presetDeclarations,
  resolveTokens,
} from "../src/themes.ts"

const encode = (raw: string) =>
  Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

// The default preset /create shows on load.
const DEFAULT_ID = encode("neutral|base|default|default|inter|inter")

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

describe("decodePreset", () => {
  it("round-trips the default config", () => {
    assert.deepEqual(decodePreset(DEFAULT_ID), DEFAULT_CONFIG)
  })

  it("decodes a fully custom preset", () => {
    const cfg = decodePreset(encode("slate|blue|violet|lg|system|grotesk"))
    assert.deepEqual(cfg, {
      base: "slate",
      theme: "blue",
      chart: "violet",
      radius: "lg",
      font: "system",
      heading: "grotesk",
    })
  })

  it("rejects malformed and unknown ids", () => {
    assert.equal(decodePreset("not-base64!!"), null)
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
