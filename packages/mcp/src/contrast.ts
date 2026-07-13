/**
 * Contrast audit — WCAG 2.2 ratios and APCA (SAPC-4 0.0.98G) Lc values for
 * the theme's foreground/background token pairs.
 *
 * Pure color math over the oklch token strings the themes emit; no DOM. The
 * same module ships in packages/mcp/src/contrast.ts for the `contrast_audit`
 * tool — packages/mcp/test/contrast.test.ts fails if the two drift.
 */

export interface Rgb {
  r: number
  g: number
  b: number
  alpha: number
}

/** Parse an `oklch(L C H)` / `oklch(L C H / A%)` token value. */
export function parseOklch(value: string): { l: number; c: number; h: number; alpha: number } | null {
  const m = value
    .trim()
    .match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?)\s*)?\)$/i)
  if (!m) return null
  const num = (raw: string, scale: number) =>
    raw.endsWith("%") ? (parseFloat(raw) / 100) * scale : parseFloat(raw)
  return {
    l: num(m[1], 1),
    c: parseFloat(m[2]),
    h: parseFloat(m[3]),
    alpha: m[4] !== undefined ? num(m[4], 1) : 1,
  }
}

/** oklch → gamma-encoded sRGB (channels clamped to [0, 1]). */
export function oklchToRgb(value: string): Rgb | null {
  const parsed = parseOklch(value)
  if (!parsed) return null
  const { l: L, c: C, h: H, alpha } = parsed
  const hr = (H * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const lin = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, c)))

  const gamma = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return { r: gamma(lin[0]), g: gamma(lin[1]), b: gamma(lin[2]), alpha }
}

/** Source-over compositing in gamma space (close enough for hairline tints). */
export function composite(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.alpha
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    alpha: 1,
  }
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.x relative luminance of gamma-encoded sRGB. */
export function wcagLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** WCAG 2.x contrast ratio (1–21). */
export function wcagRatio(fg: Rgb, bg: Rgb): number {
  const l1 = wcagLuminance(fg)
  const l2 = wcagLuminance(bg)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

// APCA-W3 (SAPC-4, 0.0.98G-4g) constants.
const SA98G = {
  exponents: { mainTRC: 2.4, normBG: 0.56, normTXT: 0.57, revTXT: 0.62, revBG: 0.65 },
  colorSpace: { sRco: 0.2126729, sGco: 0.7151522, sBco: 0.072175 },
  clamps: { blkThrs: 0.022, blkClmp: 1.414, loClip: 0.1, deltaYmin: 0.0005 },
  scalers: { scaleBoW: 1.14, loBoWoffset: 0.027, scaleWoB: 1.14, loWoBoffset: 0.027 },
}

function apcaY({ r, g, b }: Rgb): number {
  const { mainTRC } = SA98G.exponents
  const { sRco, sGco, sBco } = SA98G.colorSpace
  return sRco * r ** mainTRC + sGco * g ** mainTRC + sBco * b ** mainTRC
}

/** APCA Lc: positive for dark text on light bg, negative for the reverse. */
export function apcaContrast(text: Rgb, bg: Rgb): number {
  const { blkThrs, blkClmp, loClip, deltaYmin } = SA98G.clamps
  const { normBG, normTXT, revTXT, revBG } = SA98G.exponents
  const { scaleBoW, loBoWoffset, scaleWoB, loWoBoffset } = SA98G.scalers

  let ytx = apcaY(text)
  let ybg = apcaY(bg)
  if (ytx < blkThrs) ytx += (blkThrs - ytx) ** blkClmp
  if (ybg < blkThrs) ybg += (blkThrs - ybg) ** blkClmp
  if (Math.abs(ybg - ytx) < deltaYmin) return 0

  let sapc: number
  if (ybg > ytx) {
    sapc = (ybg ** normBG - ytx ** normTXT) * scaleBoW
    return sapc < loClip ? 0 : (sapc - loBoWoffset) * 100
  }
  sapc = (ybg ** revBG - ytx ** revTXT) * scaleWoB
  return sapc > -loClip ? 0 : (sapc + loWoBoffset) * 100
}

/** Foreground-on-background token pairs worth auditing (text contrast).
 *  Role picks the baseline: "body" text needs WCAG 4.5 / |Lc| 60;
 *  "secondary" (muted captions, helper text) needs WCAG 3.0 / |Lc| 45 —
 *  the stock shadcn muted pair sits at 4.34:1 and is not a defect. */
export const CONTRAST_PAIRS: [fg: string, bg: string, role: "body" | "secondary"][] = [
  ["foreground", "background", "body"],
  ["card-foreground", "card", "body"],
  ["popover-foreground", "popover", "body"],
  ["primary-foreground", "primary", "body"],
  ["secondary-foreground", "secondary", "body"],
  ["muted-foreground", "muted", "secondary"],
  ["muted-foreground", "background", "secondary"],
  ["accent-foreground", "accent", "body"],
  ["destructive-foreground", "destructive", "body"],
  ["sidebar-foreground", "sidebar", "body"],
  ["sidebar-primary-foreground", "sidebar-primary", "body"],
  ["sidebar-accent-foreground", "sidebar-accent", "body"],
]

export type WcagLevel = "AAA" | "AA" | "AA-large" | "fail"
export type ApcaLevel = "body" | "large" | "min" | "fail"

export interface PairResult {
  fg: string
  bg: string
  role: "body" | "secondary"
  wcag: number
  wcagLevel: WcagLevel
  apca: number
  apcaLevel: ApcaLevel
  /** Below the role's baseline — body: WCAG 4.5 or |Lc| 60;
   *  secondary: WCAG 3.0 or |Lc| 45. */
  warn: boolean
}

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA"
  if (ratio >= 4.5) return "AA"
  if (ratio >= 3) return "AA-large"
  return "fail"
}

export function apcaLevel(lc: number): ApcaLevel {
  const abs = Math.abs(lc)
  if (abs >= 75) return "body"
  if (abs >= 60) return "large"
  if (abs >= 45) return "min"
  return "fail"
}

/** Audit a token set (name → oklch string). Pairs whose tokens are missing
 *  or unparsable are skipped. */
export function auditTokens(tokens: Record<string, string>): PairResult[] {
  const results: PairResult[] = []
  for (const [fgName, bgName, role] of CONTRAST_PAIRS) {
    const fgRaw = tokens[fgName]
    const bgRaw = tokens[bgName]
    if (!fgRaw || !bgRaw) continue
    let fg = oklchToRgb(fgRaw)
    let bg = oklchToRgb(bgRaw)
    if (!fg || !bg) continue
    if (bg.alpha < 1) bg = { ...bg, alpha: 1 }
    if (fg.alpha < 1) fg = composite(fg, bg)
    const ratio = wcagRatio(fg, bg)
    const lc = apcaContrast(fg, bg)
    const [minWcag, minLc] = role === "body" ? [4.5, 60] : [3, 45]
    results.push({
      fg: fgName,
      bg: bgName,
      role,
      wcag: Math.round(ratio * 100) / 100,
      wcagLevel: wcagLevel(ratio),
      apca: Math.round(lc * 10) / 10,
      apcaLevel: apcaLevel(lc),
      warn: ratio < minWcag || Math.abs(lc) < minLc,
    })
  }
  return results
}
