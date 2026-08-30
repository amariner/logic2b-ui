import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { buildCss, DEFAULT_CONFIG } from "../src/index.ts"
import { lintThemeCss, parseThemeCss } from "../src/lint.ts"

const exactTheme = buildCss(DEFAULT_CONFIG)

describe("parseThemeCss", () => {
  test("extracts the authoritative light and dark token blocks", () => {
    const parsed = parseThemeCss(
      `/* :root { --primary: red; } */\n${exactTheme}\n@theme inline { --color-primary: var(--primary); }`
    )
    assert.equal(parsed.light.selectorCount, 1)
    assert.equal(parsed.dark.selectorCount, 1)
    assert.equal(parsed.light.tokens.primary, "oklch(0.205 0 0)")
    assert.equal(parsed.dark.tokens.primary, "oklch(0.922 0 0)")
    assert.equal(parsed.light.duplicates.length, 0)
  })

  test("records duplicate declarations and keeps CSS cascade order", () => {
    const css = exactTheme.replace(
      "  --primary: oklch(0.205 0 0);",
      "  --primary: oklch(0.4 0 0);\n  --primary: oklch(0.205 0 0);"
    )
    const parsed = parseThemeCss(css)
    assert.equal(parsed.light.tokens.primary, "oklch(0.205 0 0)")
    assert.deepEqual(parsed.light.duplicates.map((entry) => entry.token), ["primary"])
  })
})

describe("lintThemeCss", () => {
  test("accepts an exact preset without repeating its known contrast baseline", () => {
    const result = lintThemeCss(exactTheme, { expected: DEFAULT_CONFIG })
    assert.equal(result.valid, true)
    assert.equal(result.clean, true)
    assert.deepEqual(result.issues, [])
    assert.ok(result.summary.lightTokens > result.summary.darkTokens)
  })

  test("reports missing selectors and every missing contract token", () => {
    const result = lintThemeCss(":root { --background: oklch(1 0 0); }")
    assert.equal(result.valid, false)
    assert.ok(result.issues.some((issue) => issue.code === "missing-selector" && issue.mode === "dark"))
    assert.ok(
      result.issues.some(
        (issue) => issue.code === "missing-token" && issue.token === "foreground"
      )
    )
  })

  test("rejects duplicate tokens, invalid colors and invalid radii", () => {
    const css = exactTheme
      .replace(
        "  --chart-1: oklch(0.646 0.222 41.116);",
        "  --chart-1: red;\n  --chart-1: red;"
      )
      .replace("--radius: 0.625rem", "--radius: huge")
    const result = lintThemeCss(css)
    assert.equal(result.valid, false)
    assert.ok(result.issues.some((issue) => issue.code === "duplicate-token"))
    assert.ok(result.issues.some((issue) => issue.code === "invalid-color"))
    assert.ok(result.issues.some((issue) => issue.code === "invalid-radius"))
  })

  test("detects derived sidebar drift and exact preset drift", () => {
    const css = exactTheme.replace(
      "--sidebar-ring: oklch(0.708 0 0)",
      "--sidebar-ring: oklch(0.4 0 0)"
    )
    const result = lintThemeCss(css, { expected: DEFAULT_CONFIG })
    assert.ok(
      result.issues.some(
        (issue) => issue.code === "derived-token-drift" && issue.token === "sidebar-ring"
      )
    )
    assert.ok(
      result.issues.some(
        (issue) => issue.code === "preset-drift" && issue.token === "sidebar-ring"
      )
    )
  })

  test("surfaces a new contrast regression with measured evidence", () => {
    const css = exactTheme.replace(
      "--foreground: oklch(0.145 0 0)",
      "--foreground: oklch(0.92 0 0)"
    )
    const result = lintThemeCss(css, { expected: DEFAULT_CONFIG })
    const issue = result.issues.find(
      (candidate) => candidate.code === "contrast-regression"
    )
    assert.ok(issue)
    assert.match(issue.actual ?? "", /WCAG/)
    assert.equal(result.summary.contrastRegressions, 1)
  })
})
