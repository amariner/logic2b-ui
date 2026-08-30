/**
 * Static theme.css contract lint.
 *
 * Parses only CSS custom properties inside :root and .dark. It never executes
 * caller input and has no DOM/Node dependencies, so the same implementation
 * runs in the local MCP server and the remote Cloudflare worker.
 */

import { auditTokens, parseOklch, type PairResult } from "./contrast.ts"
import {
  DEFAULT_CONFIG,
  presetDeclarations,
  type Mode,
  type ThemeConfig,
} from "./index.ts"

export type ThemeLintSeverity = "error" | "warning"
export type ThemeLintCategory =
  | "structure"
  | "token"
  | "derived"
  | "preset"
  | "contrast"

export interface ThemeLintIssue {
  code: string
  severity: ThemeLintSeverity
  category: ThemeLintCategory
  message: string
  mode?: Mode
  token?: string
  line?: number
  actual?: string
  expected?: string
}

export interface ParsedThemeMode {
  selector: ":root" | ".dark"
  selectorCount: number
  tokens: Record<string, string>
  lines: Record<string, number>
  duplicates: { token: string; lines: number[] }[]
  unclosed: boolean
}

export interface ThemeLintResult {
  schemaVersion: 1
  valid: boolean
  clean: boolean
  summary: {
    errors: number
    warnings: number
    lightTokens: number
    darkTokens: number
    contrastRegressions: number
  }
  modes: {
    light: ParsedThemeMode
    dark: ParsedThemeMode
  }
  contrast: {
    light: PairResult[]
    dark: PairResult[]
  }
  issues: ThemeLintIssue[]
  verdict: string
}

export interface ThemeLintOptions {
  /** When supplied, every contract token must match this exact /create preset. */
  expected?: ThemeConfig
}

const CONTRACT = {
  light: presetDeclarations(DEFAULT_CONFIG, "light"),
  dark: presetDeclarations(DEFAULT_CONFIG, "dark"),
}
const COLOR_TOKENS = new Set(Object.keys(CONTRACT.dark))

function maskComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, " ")
  )
}

function lineAt(css: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i++) if (css.charCodeAt(i) === 10) line++
  return line
}

function closingBrace(css: string, open: number): number {
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++
    if (css[i] === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function parseMode(css: string, selector: ":root" | ".dark"): ParsedThemeMode {
  const masked = maskComments(css)
  const pattern = selector === ":root" ? /:root\s*\{/g : /\.dark\s*\{/g
  const tokens: Record<string, string> = {}
  const lines: Record<string, number> = {}
  const occurrences = new Map<string, number[]>()
  let selectorCount = 0
  let unclosed = false
  let match: RegExpExecArray | null

  while ((match = pattern.exec(masked)) !== null) {
    selectorCount++
    const open = masked.indexOf("{", match.index)
    const close = closingBrace(masked, open)
    if (close === -1) {
      unclosed = true
      break
    }
    const bodyStart = open + 1
    const body = masked.slice(bodyStart, close)
    const declaration = /--([a-z0-9-]+)\s*:\s*([^;{}]+);/gi
    let found: RegExpExecArray | null
    while ((found = declaration.exec(body)) !== null) {
      const token = found[1]
      const value = found[2].replace(/\s+/g, " ").trim()
      const line = lineAt(css, bodyStart + found.index)
      tokens[token] = value
      lines[token] = line
      const tokenLines = occurrences.get(token) ?? []
      tokenLines.push(line)
      occurrences.set(token, tokenLines)
    }
    pattern.lastIndex = close + 1
  }

  return {
    selector,
    selectorCount,
    tokens,
    lines,
    duplicates: [...occurrences]
      .filter(([, tokenLines]) => tokenLines.length > 1)
      .map(([token, tokenLines]) => ({ token, lines: tokenLines })),
    unclosed,
  }
}

export function parseThemeCss(css: string): {
  light: ParsedThemeMode
  dark: ParsedThemeMode
} {
  return {
    light: parseMode(css, ":root"),
    dark: parseMode(css, ".dark"),
  }
}

function normalized(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function pairKey(mode: Mode, pair: PairResult): string {
  return `${mode}:${pair.fg}:${pair.bg}`
}

/** Lint a logic2b theme stylesheet without evaluating it. */
export function lintThemeCss(
  css: string,
  { expected }: ThemeLintOptions = {}
): ThemeLintResult {
  const modes = parseThemeCss(css)
  const issues: ThemeLintIssue[] = []

  for (const mode of ["light", "dark"] as const) {
    const parsed = modes[mode]
    if (parsed.selectorCount === 0) {
      issues.push({
        code: "missing-selector",
        severity: "error",
        category: "structure",
        mode,
        message: `Missing ${parsed.selector} token block.`,
      })
    } else if (parsed.selectorCount > 1) {
      issues.push({
        code: "duplicate-selector",
        severity: "error",
        category: "structure",
        mode,
        message: `${parsed.selector} appears ${parsed.selectorCount} times; keep one authoritative token block.`,
      })
    }
    if (parsed.unclosed) {
      issues.push({
        code: "unclosed-selector",
        severity: "error",
        category: "structure",
        mode,
        message: `${parsed.selector} has no matching closing brace.`,
      })
    }
    for (const duplicate of parsed.duplicates) {
      issues.push({
        code: "duplicate-token",
        severity: "error",
        category: "token",
        mode,
        token: duplicate.token,
        line: duplicate.lines.at(-1),
        message: `--${duplicate.token} is declared ${duplicate.lines.length} times in ${parsed.selector} (lines ${duplicate.lines.join(", ")}).`,
      })
    }

    const contract = CONTRACT[mode]
    for (const token of Object.keys(contract)) {
      const actual = parsed.tokens[token]
      if (actual === undefined) {
        issues.push({
          code: "missing-token",
          severity: "error",
          category: "token",
          mode,
          token,
          message: `Missing --${token} in ${parsed.selector}.`,
        })
        continue
      }
      if (COLOR_TOKENS.has(token) && !parseOklch(actual)) {
        issues.push({
          code: "invalid-color",
          severity: "error",
          category: "token",
          mode,
          token,
          line: parsed.lines[token],
          actual,
          message: `--${token} must be a parseable oklch() color so contrast can be audited.`,
        })
      }
    }
    if (mode === "light") {
      const radius = parsed.tokens.radius
      if (radius && !/^(?:0|(?:\d*\.)?\d+(?:rem|px))$/.test(radius)) {
        issues.push({
          code: "invalid-radius",
          severity: "error",
          category: "token",
          mode,
          token: "radius",
          line: parsed.lines.radius,
          actual: radius,
          message: "--radius must be a non-negative rem or px length.",
        })
      }
    }
  }

  const derived: { target: string; source: (mode: Mode) => string }[] = [
    { target: "sidebar", source: (mode) => mode === "light" ? "primary-foreground" : "card" },
    { target: "sidebar-foreground", source: () => "foreground" },
    { target: "sidebar-primary", source: () => "primary" },
    { target: "sidebar-primary-foreground", source: () => "primary-foreground" },
    { target: "sidebar-accent", source: () => "accent" },
    { target: "sidebar-accent-foreground", source: () => "accent-foreground" },
    { target: "sidebar-border", source: () => "border" },
    { target: "sidebar-ring", source: () => "ring" },
  ]
  for (const mode of ["light", "dark"] as const) {
    const parsed = modes[mode]
    for (const relation of derived) {
      const source = relation.source(mode)
      const actual = parsed.tokens[relation.target]
      const expectedValue = parsed.tokens[source]
      if (
        actual !== undefined &&
        expectedValue !== undefined &&
        normalized(actual) !== normalized(expectedValue)
      ) {
        issues.push({
          code: "derived-token-drift",
          severity: "error",
          category: "derived",
          mode,
          token: relation.target,
          line: parsed.lines[relation.target],
          actual,
          expected: expectedValue,
          message: `--${relation.target} must track --${source} in ${parsed.selector}.`,
        })
      }
    }
  }

  if (expected) {
    for (const mode of ["light", "dark"] as const) {
      const expectedTokens = presetDeclarations(expected, mode)
      const parsed = modes[mode]
      for (const [token, expectedValue] of Object.entries(expectedTokens)) {
        const actual = parsed.tokens[token]
        if (actual === undefined) continue
        if (normalized(actual) !== normalized(expectedValue)) {
          issues.push({
            code: "preset-drift",
            severity: "error",
            category: "preset",
            mode,
            token,
            line: parsed.lines[token],
            actual,
            expected: expectedValue,
            message: `--${token} no longer matches the expected preset in ${parsed.selector}.`,
          })
        }
      }
    }
  }

  const contrast = {
    light: auditTokens(modes.light.tokens),
    dark: auditTokens(modes.dark.tokens),
  }
  const expectedContrast = expected
    ? new Map(
        (["light", "dark"] as const).flatMap((mode) =>
          auditTokens(presetDeclarations(expected, mode)).map((pair) => [
            pairKey(mode, pair),
            pair,
          ] as const)
        )
      )
    : null

  for (const mode of ["light", "dark"] as const) {
    for (const pair of contrast[mode]) {
      if (!pair.warn) continue
      const baseline = expectedContrast?.get(pairKey(mode, pair))
      const regressed =
        !baseline ||
        !baseline.warn ||
        pair.wcag < baseline.wcag - 0.1 ||
        Math.abs(pair.apca) < Math.abs(baseline.apca) - 1
      if (!regressed) continue
      issues.push({
        code: "contrast-regression",
        severity: "warning",
        category: "contrast",
        mode,
        token: pair.fg,
        line: modes[mode].lines[pair.fg],
        actual: `WCAG ${pair.wcag}:1, APCA ${pair.apca}`,
        message: `--${pair.fg} on --${pair.bg} falls below the ${pair.role} text baseline in ${modes[mode].selector}.`,
      })
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length
  const warnings = issues.length - errors
  const contrastRegressions = issues.filter(
    (issue) => issue.code === "contrast-regression"
  ).length
  const valid = errors === 0
  const clean = issues.length === 0
  return {
    schemaVersion: 1,
    valid,
    clean,
    summary: {
      errors,
      warnings,
      lightTokens: Object.keys(modes.light.tokens).length,
      darkTokens: Object.keys(modes.dark.tokens).length,
      contrastRegressions,
    },
    modes,
    contrast,
    issues,
    verdict: clean
      ? "Theme contract is complete and has no drift or contrast regressions."
      : valid
        ? `Theme contract is structurally valid with ${warnings} warning(s).`
        : `Theme contract has ${errors} error(s) and ${warnings} warning(s).`,
  }
}
