/**
 * @logic2b/tokens — the single source of truth for the logic2b ui theme data.
 *
 * Base color scales, accents, chart ramps, radii, fonts, the preset codec
 * (base64url of "base|theme|chart|radius|font|heading") and the CSS emitters.
 * Consumed by the /create studio (apps/web), the CLI preset engine
 * (packages/cli, bundled into the published `logic2b` dist) and the MCP theme
 * tools (packages/mcp, bundled into `@logic2b/mcp` and the remote worker).
 *
 * Portability: this module runs in the browser, in Node (>=18) and inside the
 * Cloudflare worker behind ui.logic2b.com/mcp — no Buffer, no node: imports,
 * no DOM. Preset ids use the atob/btoa globals available in all three.
 */

export type Mode = "light" | "dark"

export interface TokenSet {
  background: string
  foreground: string
  card: string
  "card-foreground": string
  popover: string
  "popover-foreground": string
  primary: string
  "primary-foreground": string
  secondary: string
  "secondary-foreground": string
  muted: string
  "muted-foreground": string
  accent: string
  "accent-foreground": string
  destructive: string
  "destructive-foreground": string
  border: string
  input: string
  ring: string
}

export interface BaseColor {
  label: string
  swatch: string
  light: TokenSet
  dark: TokenSet
}

const WHITE = "oklch(1 0 0)"
const NEAR_WHITE = "oklch(0.985 0 0)"
const DESTRUCTIVE_L = "oklch(0.577 0.245 27.325)"
const DESTRUCTIVE_D = "oklch(0.704 0.191 22.216)"

/* -- Base colors (the neutral scale). Selecting one swaps every gray token. -- */
export const BASE_COLORS: Record<string, BaseColor> = {
  neutral: {
    label: "Neutral",
    swatch: "oklch(0.205 0 0)",
    light: {
      background: WHITE, foreground: "oklch(0.145 0 0)", card: WHITE,
      "card-foreground": "oklch(0.145 0 0)", popover: WHITE, "popover-foreground": "oklch(0.145 0 0)",
      primary: "oklch(0.205 0 0)", "primary-foreground": NEAR_WHITE,
      secondary: "oklch(0.97 0 0)", "secondary-foreground": "oklch(0.205 0 0)",
      muted: "oklch(0.97 0 0)", "muted-foreground": "oklch(0.556 0 0)",
      accent: "oklch(0.97 0 0)", "accent-foreground": "oklch(0.205 0 0)",
      destructive: DESTRUCTIVE_L, "destructive-foreground": NEAR_WHITE,
      border: "oklch(0.922 0 0)", input: "oklch(0.922 0 0)", ring: "oklch(0.708 0 0)",
    },
    dark: {
      background: "oklch(0.145 0 0)", foreground: NEAR_WHITE, card: "oklch(0.205 0 0)",
      "card-foreground": NEAR_WHITE, popover: "oklch(0.205 0 0)", "popover-foreground": NEAR_WHITE,
      primary: "oklch(0.922 0 0)", "primary-foreground": "oklch(0.205 0 0)",
      secondary: "oklch(0.269 0 0)", "secondary-foreground": NEAR_WHITE,
      muted: "oklch(0.269 0 0)", "muted-foreground": "oklch(0.708 0 0)",
      accent: "oklch(0.269 0 0)", "accent-foreground": NEAR_WHITE,
      destructive: DESTRUCTIVE_D, "destructive-foreground": NEAR_WHITE,
      border: "oklch(1 0 0 / 10%)", input: "oklch(1 0 0 / 15%)", ring: "oklch(0.556 0 0)",
    },
  },
  stone: {
    label: "Stone",
    swatch: "oklch(0.216 0.006 56.043)",
    light: {
      background: WHITE, foreground: "oklch(0.147 0.004 49.25)", card: WHITE,
      "card-foreground": "oklch(0.147 0.004 49.25)", popover: WHITE, "popover-foreground": "oklch(0.147 0.004 49.25)",
      primary: "oklch(0.216 0.006 56.043)", "primary-foreground": "oklch(0.985 0.001 106.423)",
      secondary: "oklch(0.97 0.001 106.424)", "secondary-foreground": "oklch(0.216 0.006 56.043)",
      muted: "oklch(0.97 0.001 106.424)", "muted-foreground": "oklch(0.553 0.013 58.071)",
      accent: "oklch(0.97 0.001 106.424)", "accent-foreground": "oklch(0.216 0.006 56.043)",
      destructive: DESTRUCTIVE_L, "destructive-foreground": "oklch(0.985 0.001 106.423)",
      border: "oklch(0.923 0.003 48.717)", input: "oklch(0.923 0.003 48.717)", ring: "oklch(0.709 0.01 56.259)",
    },
    dark: {
      background: "oklch(0.147 0.004 49.25)", foreground: "oklch(0.985 0.001 106.423)", card: "oklch(0.216 0.006 56.043)",
      "card-foreground": "oklch(0.985 0.001 106.423)", popover: "oklch(0.216 0.006 56.043)", "popover-foreground": "oklch(0.985 0.001 106.423)",
      primary: "oklch(0.923 0.003 48.717)", "primary-foreground": "oklch(0.216 0.006 56.043)",
      secondary: "oklch(0.268 0.007 34.298)", "secondary-foreground": "oklch(0.985 0.001 106.423)",
      muted: "oklch(0.268 0.007 34.298)", "muted-foreground": "oklch(0.709 0.01 56.259)",
      accent: "oklch(0.268 0.007 34.298)", "accent-foreground": "oklch(0.985 0.001 106.423)",
      destructive: DESTRUCTIVE_D, "destructive-foreground": "oklch(0.985 0.001 106.423)",
      border: "oklch(1 0 0 / 10%)", input: "oklch(1 0 0 / 15%)", ring: "oklch(0.553 0.013 58.071)",
    },
  },
  zinc: {
    label: "Zinc",
    swatch: "oklch(0.21 0.006 285.885)",
    light: {
      background: WHITE, foreground: "oklch(0.141 0.005 285.823)", card: WHITE,
      "card-foreground": "oklch(0.141 0.005 285.823)", popover: WHITE, "popover-foreground": "oklch(0.141 0.005 285.823)",
      primary: "oklch(0.21 0.006 285.885)", "primary-foreground": NEAR_WHITE,
      secondary: "oklch(0.967 0.001 286.375)", "secondary-foreground": "oklch(0.21 0.006 285.885)",
      muted: "oklch(0.967 0.001 286.375)", "muted-foreground": "oklch(0.552 0.016 285.938)",
      accent: "oklch(0.967 0.001 286.375)", "accent-foreground": "oklch(0.21 0.006 285.885)",
      destructive: DESTRUCTIVE_L, "destructive-foreground": NEAR_WHITE,
      border: "oklch(0.92 0.004 286.32)", input: "oklch(0.92 0.004 286.32)", ring: "oklch(0.705 0.015 286.067)",
    },
    dark: {
      background: "oklch(0.141 0.005 285.823)", foreground: NEAR_WHITE, card: "oklch(0.21 0.006 285.885)",
      "card-foreground": NEAR_WHITE, popover: "oklch(0.21 0.006 285.885)", "popover-foreground": NEAR_WHITE,
      primary: "oklch(0.92 0.004 286.32)", "primary-foreground": "oklch(0.21 0.006 285.885)",
      secondary: "oklch(0.274 0.006 286.033)", "secondary-foreground": NEAR_WHITE,
      muted: "oklch(0.274 0.006 286.033)", "muted-foreground": "oklch(0.705 0.015 286.067)",
      accent: "oklch(0.274 0.006 286.033)", "accent-foreground": NEAR_WHITE,
      destructive: DESTRUCTIVE_D, "destructive-foreground": NEAR_WHITE,
      border: "oklch(1 0 0 / 10%)", input: "oklch(1 0 0 / 15%)", ring: "oklch(0.552 0.016 285.938)",
    },
  },
  slate: {
    label: "Slate",
    swatch: "oklch(0.208 0.042 265.755)",
    light: {
      background: WHITE, foreground: "oklch(0.129 0.042 264.695)", card: WHITE,
      "card-foreground": "oklch(0.129 0.042 264.695)", popover: WHITE, "popover-foreground": "oklch(0.129 0.042 264.695)",
      primary: "oklch(0.208 0.042 265.755)", "primary-foreground": "oklch(0.984 0.003 247.858)",
      secondary: "oklch(0.968 0.007 247.896)", "secondary-foreground": "oklch(0.208 0.042 265.755)",
      muted: "oklch(0.968 0.007 247.896)", "muted-foreground": "oklch(0.554 0.046 257.417)",
      accent: "oklch(0.968 0.007 247.896)", "accent-foreground": "oklch(0.208 0.042 265.755)",
      destructive: DESTRUCTIVE_L, "destructive-foreground": "oklch(0.984 0.003 247.858)",
      border: "oklch(0.929 0.013 255.508)", input: "oklch(0.929 0.013 255.508)", ring: "oklch(0.704 0.04 256.788)",
    },
    dark: {
      background: "oklch(0.129 0.042 264.695)", foreground: "oklch(0.984 0.003 247.858)", card: "oklch(0.208 0.042 265.755)",
      "card-foreground": "oklch(0.984 0.003 247.858)", popover: "oklch(0.208 0.042 265.755)", "popover-foreground": "oklch(0.984 0.003 247.858)",
      primary: "oklch(0.929 0.013 255.508)", "primary-foreground": "oklch(0.208 0.042 265.755)",
      secondary: "oklch(0.279 0.041 260.031)", "secondary-foreground": "oklch(0.984 0.003 247.858)",
      muted: "oklch(0.279 0.041 260.031)", "muted-foreground": "oklch(0.704 0.04 256.788)",
      accent: "oklch(0.279 0.041 260.031)", "accent-foreground": "oklch(0.984 0.003 247.858)",
      destructive: DESTRUCTIVE_D, "destructive-foreground": "oklch(0.984 0.003 247.858)",
      border: "oklch(1 0 0 / 10%)", input: "oklch(1 0 0 / 15%)", ring: "oklch(0.551 0.027 264.364)",
    },
  },
  gray: {
    label: "Gray",
    swatch: "oklch(0.21 0.034 264.665)",
    light: {
      background: WHITE, foreground: "oklch(0.13 0.028 261.692)", card: WHITE,
      "card-foreground": "oklch(0.13 0.028 261.692)", popover: WHITE, "popover-foreground": "oklch(0.13 0.028 261.692)",
      primary: "oklch(0.21 0.034 264.665)", "primary-foreground": "oklch(0.985 0.002 247.839)",
      secondary: "oklch(0.967 0.003 264.542)", "secondary-foreground": "oklch(0.21 0.034 264.665)",
      muted: "oklch(0.967 0.003 264.542)", "muted-foreground": "oklch(0.551 0.027 264.364)",
      accent: "oklch(0.967 0.003 264.542)", "accent-foreground": "oklch(0.21 0.034 264.665)",
      destructive: DESTRUCTIVE_L, "destructive-foreground": "oklch(0.985 0.002 247.839)",
      border: "oklch(0.928 0.006 264.531)", input: "oklch(0.928 0.006 264.531)", ring: "oklch(0.707 0.022 261.325)",
    },
    dark: {
      background: "oklch(0.13 0.028 261.692)", foreground: "oklch(0.985 0.002 247.839)", card: "oklch(0.21 0.034 264.665)",
      "card-foreground": "oklch(0.985 0.002 247.839)", popover: "oklch(0.21 0.034 264.665)", "popover-foreground": "oklch(0.985 0.002 247.839)",
      primary: "oklch(0.928 0.006 264.531)", "primary-foreground": "oklch(0.21 0.034 264.665)",
      secondary: "oklch(0.278 0.033 256.848)", "secondary-foreground": "oklch(0.985 0.002 247.839)",
      muted: "oklch(0.278 0.033 256.848)", "muted-foreground": "oklch(0.707 0.022 261.325)",
      accent: "oklch(0.278 0.033 256.848)", "accent-foreground": "oklch(0.985 0.002 247.839)",
      destructive: DESTRUCTIVE_D, "destructive-foreground": "oklch(0.985 0.002 247.839)",
      border: "oklch(1 0 0 / 10%)", input: "oklch(1 0 0 / 15%)", ring: "oklch(0.551 0.027 264.364)",
    },
  },
}

/* -- Accent themes: override primary/ring. "base" defers to the base color. -- */
export interface AccentColor {
  label: string
  swatch: string
  light?: { primary: string; fg: string }
  dark?: { primary: string; fg: string }
}

export const ACCENTS: Record<string, AccentColor> = {
  base: { label: "Base", swatch: "oklch(0.205 0 0)" },
  blue: {
    label: "Blue", swatch: "oklch(0.546 0.245 262.881)",
    light: { primary: "oklch(0.546 0.245 262.881)", fg: NEAR_WHITE },
    dark: { primary: "oklch(0.623 0.214 259.815)", fg: NEAR_WHITE },
  },
  green: {
    label: "Green", swatch: "oklch(0.548 0.166 156.743)",
    light: { primary: "oklch(0.548 0.166 156.743)", fg: NEAR_WHITE },
    dark: { primary: "oklch(0.696 0.17 162.48)", fg: "oklch(0.145 0 0)" },
  },
  rose: {
    label: "Rose", swatch: "oklch(0.586 0.222 17.585)",
    light: { primary: "oklch(0.586 0.222 17.585)", fg: NEAR_WHITE },
    dark: { primary: "oklch(0.645 0.246 16.439)", fg: NEAR_WHITE },
  },
  violet: {
    label: "Violet", swatch: "oklch(0.541 0.281 293.009)",
    light: { primary: "oklch(0.541 0.281 293.009)", fg: NEAR_WHITE },
    dark: { primary: "oklch(0.606 0.25 292.717)", fg: NEAR_WHITE },
  },
  orange: {
    label: "Orange", swatch: "oklch(0.646 0.222 41.116)",
    light: { primary: "oklch(0.646 0.222 41.116)", fg: NEAR_WHITE },
    dark: { primary: "oklch(0.705 0.213 47.604)", fg: "oklch(0.145 0 0)" },
  },
}

/* -- Custom accents: a free oklch hue/chroma, serialized as "h<hue>c<chroma>"
      in the preset's theme (and chart) slot — the 6-field id format is
      unchanged, so studio links, the CLI and the MCP all round-trip it. -- */

export const CUSTOM_KEY_RE = /^h(\d{1,3}(?:\.\d{1,3})?)c(0(?:\.\d{1,3})?|0?\.\d{1,3})$/

export function parseCustomKey(key: string): { hue: number; chroma: number } | null {
  const m = CUSTOM_KEY_RE.exec(key)
  if (!m) return null
  const hue = parseFloat(m[1])
  const chroma = parseFloat(m[2])
  if (hue > 360 || chroma > 0.4) return null
  return { hue, chroma }
}

export function customKey(hue: number, chroma: number): string {
  const h = Math.round(hue * 10) / 10
  const c = Math.round(chroma * 1000) / 1000
  return `h${h}c${c}`
}

/** Lightness anchors for custom accents, in family with the six presets
 *  (light primaries sit at L ≈ 0.54–0.65, dark ones at ≈ 0.61–0.71). oklch is
 *  perceptually uniform, so at these anchors near-white text wins the APCA
 *  comparison for every hue — the fg is fixed, and borderline dark-mode
 *  pairs surface in the contrast audit. */
const CUSTOM_L = { light: 0.55, dark: 0.65 } as const

/** Build the AccentColor for a custom "h<hue>c<chroma>" key (null if not one). */
export function customAccent(key: string): AccentColor | null {
  const parsed = parseCustomKey(key)
  if (!parsed) return null
  const { hue, chroma } = parsed
  const light = `oklch(${CUSTOM_L.light} ${chroma} ${hue})`
  const dark = `oklch(${CUSTOM_L.dark} ${chroma} ${hue})`
  return {
    label: "Custom",
    swatch: light,
    light: { primary: light, fg: NEAR_WHITE },
    dark: { primary: dark, fg: NEAR_WHITE },
  }
}

/* -- Chart palettes: 5-stop ramps generated from a hue, or the default mix. -- */
export type ChartRamp = [string, string, string, string, string]

export interface ChartPalette {
  label: string
  swatch: string
  light: ChartRamp
  dark: ChartRamp
}

function ramp(hue: number, chroma: number): ChartRamp {
  const ls = [0.55, 0.63, 0.7, 0.78, 0.85]
  return ls.map((l, i) => `oklch(${l} ${(chroma * (1 - i * 0.12)).toFixed(3)} ${hue})`) as ChartRamp
}

/** ChartPalette for a custom "h<hue>c<chroma>" key (null if not one). */
export function customChart(key: string): ChartPalette | null {
  const parsed = parseCustomKey(key)
  if (!parsed) return null
  const { hue, chroma } = parsed
  return {
    label: "Custom",
    swatch: `oklch(0.55 ${chroma} ${hue})`,
    light: ramp(hue, chroma),
    dark: ramp(hue, chroma),
  }
}

export const CHARTS: Record<string, ChartPalette> = {
  default: {
    label: "Default", swatch: "oklch(0.646 0.222 41.116)",
    light: [
      "oklch(0.646 0.222 41.116)", "oklch(0.6 0.118 184.704)", "oklch(0.398 0.07 227.392)",
      "oklch(0.828 0.189 84.429)", "oklch(0.769 0.188 70.08)",
    ],
    dark: [
      "oklch(0.488 0.243 264.376)", "oklch(0.696 0.17 162.48)", "oklch(0.769 0.188 70.08)",
      "oklch(0.627 0.265 303.9)", "oklch(0.645 0.246 16.439)",
    ],
  },
  blue: { label: "Blue", swatch: "oklch(0.546 0.245 262.881)", light: ramp(262.881, 0.2), dark: ramp(262.881, 0.2) },
  green: { label: "Green", swatch: "oklch(0.548 0.166 156.743)", light: ramp(156.743, 0.16), dark: ramp(156.743, 0.16) },
  violet: { label: "Violet", swatch: "oklch(0.541 0.281 293.009)", light: ramp(293.009, 0.2), dark: ramp(293.009, 0.2) },
  rose: { label: "Rose", swatch: "oklch(0.586 0.222 17.585)", light: ramp(17.585, 0.19), dark: ramp(17.585, 0.19) },
  orange: { label: "Orange", swatch: "oklch(0.646 0.222 41.116)", light: ramp(41.116, 0.19), dark: ramp(41.116, 0.19) },
}

export const RADII: Record<string, string> = {
  none: "0rem",
  sm: "0.3rem",
  md: "0.5rem",
  default: "0.625rem",
  lg: "0.75rem",
  xl: "1rem",
}

export const FONTS: Record<string, string> = {
  inter: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif",
  grotesk: "'Space Grotesk Variable', 'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  sans: "ui-sans-serif, system-ui, sans-serif",
  system: "system-ui, -apple-system, sans-serif",
  serif: "ui-serif, Georgia, Cambria, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
}

/* -- Config + serialization -- */
export interface ThemeConfig {
  base: string
  theme: string
  chart: string
  radius: string
  font: string
  heading: string
}

export const DEFAULT_CONFIG: ThemeConfig = {
  base: "neutral",
  theme: "base",
  chart: "default",
  radius: "default",
  font: "inter",
  heading: "inter",
}

/** Compact, URL-safe preset id: base64url of the ordered config values. */
const ORDER: (keyof ThemeConfig)[] = [
  "base",
  "theme",
  "chart",
  "radius",
  "font",
  "heading",
]

export function encodePreset(cfg: ThemeConfig): string {
  const raw = ORDER.map((k) => cfg[k]).join("|")
  const b64 = btoa(raw)
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodePreset(id: string): ThemeConfig | null {
  let raw: string
  try {
    const b64 = id.replace(/-/g, "+").replace(/_/g, "/")
    raw = atob(b64)
  } catch {
    return null
  }
  const parts = raw.split("|")
  if (parts.length !== ORDER.length) return null
  const cfg = { ...DEFAULT_CONFIG }
  ORDER.forEach((k, i) => (cfg[k] = parts[i]))
  // Validate against known tables; theme and chart also accept a custom
  // "h<hue>c<chroma>" key.
  if (!BASE_COLORS[cfg.base]) return null
  if (!ACCENTS[cfg.theme] && !parseCustomKey(cfg.theme)) return null
  if (!CHARTS[cfg.chart] && !parseCustomKey(cfg.chart)) return null
  if (!RADII[cfg.radius]) return null
  if (!FONTS[cfg.font]) return null
  if (!FONTS[cfg.heading]) return null
  return cfg
}

/** Resolve the effective token set + chart palette for a mode. */
export function resolveTokens(cfg: ThemeConfig, mode: Mode) {
  const base = BASE_COLORS[cfg.base] ?? BASE_COLORS.neutral
  const tokens: Record<string, string> = { ...base[mode] }
  const accent = ACCENTS[cfg.theme] ?? customAccent(cfg.theme)
  if (accent?.[mode]) {
    tokens.primary = accent[mode]!.primary
    tokens["primary-foreground"] = accent[mode]!.fg
    tokens.ring = accent[mode]!.primary
  }
  const chart = CHARTS[cfg.chart] ?? customChart(cfg.chart) ?? CHARTS.default
  return { tokens, chart: chart[mode] }
}

/** Sidebar tokens derived from the config — the surface ladder every consumer
 *  writes: near-white of the scale in light (the base's primary-foreground),
 *  the card surface in dark. */
export function sidebarTokens(cfg: ThemeConfig, mode: Mode): Record<string, string> {
  const base = (BASE_COLORS[cfg.base] ?? BASE_COLORS.neutral)[mode]
  const { tokens } = resolveTokens(cfg, mode)
  return {
    sidebar: mode === "light" ? base["primary-foreground"] : base.card,
    "sidebar-foreground": tokens.foreground,
    "sidebar-primary": tokens.primary,
    "sidebar-primary-foreground": tokens["primary-foreground"],
    "sidebar-accent": tokens.accent,
    "sidebar-accent-foreground": tokens["accent-foreground"],
    "sidebar-border": tokens.border,
    "sidebar-ring": tokens.ring,
  }
}

/** All custom-property declarations a preset pins for one mode. */
export function presetDeclarations(
  cfg: ThemeConfig,
  mode: Mode,
): Record<string, string> {
  const { tokens, chart } = resolveTokens(cfg, mode)
  const decls: Record<string, string> = { ...tokens }
  chart.forEach((c, i) => (decls[`chart-${i + 1}`] = c))
  Object.assign(decls, sidebarTokens(cfg, mode))
  if (mode === "light") {
    decls["radius"] = RADII[cfg.radius] ?? RADII.default
    decls["font-sans"] = FONTS[cfg.font] ?? FONTS.sans
    decls["font-heading"] = FONTS[cfg.heading] ?? FONTS.sans
  }
  return decls
}

/** Full CSS the studio exports — :root + .dark with every token. */
export function buildCss(cfg: ThemeConfig): string {
  const radius = RADII[cfg.radius] ?? RADII.default
  const font = FONTS[cfg.font] ?? FONTS.sans
  const heading = FONTS[cfg.heading] ?? FONTS.sans
  const block = (mode: Mode) => {
    const { tokens, chart } = resolveTokens(cfg, mode)
    const lines = Object.entries(tokens).map(([k, v]) => `  --${k}: ${v};`)
    chart.forEach((c, i) => lines.push(`  --chart-${i + 1}: ${c};`))
    for (const [k, v] of Object.entries(sidebarTokens(cfg, mode))) {
      lines.push(`  --${k}: ${v};`)
    }
    return lines.join("\n")
  }
  return `:root {
  --radius: ${radius};
  --font-sans: ${font};
  --font-heading: ${heading};
${block("light")}
}

.dark {
${block("dark")}
}`
}

/** Replace (or append) `--key: value;` declarations inside one selector block. */
function patchBlock(
  css: string,
  selector: string,
  decls: Record<string, string>,
): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return css
  const end = css.indexOf("\n}", start)
  if (end === -1) return css
  let block = css.slice(start, end)
  const missing: string[] = []
  for (const [key, value] of Object.entries(decls)) {
    const re = new RegExp(`(--${key})\\s*:\\s*[^;]+;`)
    if (re.test(block)) {
      block = block.replace(re, `$1: ${value};`)
    } else {
      missing.push(`  --${key}: ${value};`)
    }
  }
  if (missing.length > 0) block += `\n${missing.join("\n")}`
  return css.slice(0, start) + block + css.slice(end)
}

/**
 * Rewrite the token values of a theme stylesheet in place: the `:root` block
 * gets the preset's light tokens (plus radius and fonts), `.dark` gets the
 * dark tokens. Everything else — imports, @theme mapping, base layer — stays.
 */
export function applyPresetToCss(css: string, cfg: ThemeConfig): string {
  let out = patchBlock(css, ":root", presetDeclarations(cfg, "light"))
  out = patchBlock(out, ".dark", presetDeclarations(cfg, "dark"))
  return out
}
