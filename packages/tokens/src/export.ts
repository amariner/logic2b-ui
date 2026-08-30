import { oklchToRgb } from "./contrast.ts"
import {
  encodePreset,
  presetDeclarations,
  typesetDeclarations,
  type Mode,
  type ThemeConfig,
} from "./index.ts"

export type PortableTokenType = "color" | "dimension" | "number" | "string"

export interface PortableToken {
  $type: PortableTokenType
  $value: string | number | { value: number; unit: string }
}

export type PortableTokenSet = Record<string, PortableToken>

export interface PortableTokenBundle {
  $schema: string
  $description: string
  $extensions: {
    logic2b: {
      preset: string
      modes: readonly Mode[]
    }
  }
  global: PortableTokenSet
  light: PortableTokenSet
  dark: PortableTokenSet
}

function dimension(value: string): { value: number; unit: string } | null {
  const match = value.trim().match(/^(-?[\d.]+)(rem|px|em|ch)$/)
  return match ? { value: Number(match[1]), unit: match[2] } : null
}

/** Convert the CSS oklch source value to the #RRGGBBAA form understood by
 * Style Dictionary's native color transforms. */
export function oklchToHex8(value: string): string {
  const rgb = oklchToRgb(value)
  if (!rgb) throw new Error(`Cannot export non-oklch color "${value}".`)
  const byte = (channel: number) =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase()
  return `#${byte(rgb.r)}${byte(rgb.g)}${byte(rgb.b)}${byte(rgb.alpha)}`
}

function token(value: string): PortableToken {
  if (value.startsWith("oklch(")) return { $type: "color", $value: value }
  const parsedDimension = dimension(value)
  if (parsedDimension) return { $type: "dimension", $value: parsedDimension }
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return { $type: "number", $value: numeric }
  return { $type: "string", $value: value }
}

/** One flat semantic set per mode. Hyphenated keys intentionally match the
 * CSS custom properties and become idiomatic camelCase/snake_case after Style
 * Dictionary applies the target platform's name transform. */
export function portableModeTokens(
  config: ThemeConfig,
  mode: Mode,
  options: { nativeColors?: boolean; includeGlobals?: boolean } = {},
): PortableTokenSet {
  const includeGlobals = options.includeGlobals ?? mode === "light"
  const declarations = {
    ...presetDeclarations(config, mode),
    ...(includeGlobals && mode === "light" ? typesetDeclarations(config) : {}),
  }
  if (!includeGlobals) {
    for (const [name, value] of Object.entries(declarations)) {
      if (!value.startsWith("oklch(")) delete declarations[name]
    }
  }
  return Object.fromEntries(
    Object.entries(declarations).map(([name, value]) => {
      const portable = token(value)
      return [
        name,
        options.nativeColors && portable.$type === "color"
          ? { ...portable, $value: oklchToHex8(value) }
          : portable,
      ]
    }),
  )
}

export function portableGlobalTokens(config: ThemeConfig): PortableTokenSet {
  const light = portableModeTokens(config, "light")
  return Object.fromEntries(
    Object.entries(light).filter(([, value]) => value.$type !== "color"),
  )
}

/** DTCG-shaped source bundle for a preset. This is the lossless interchange
 * artifact: CSS keeps oklch, while native build targets derive sRGB values
 * from the same semantic tokens. */
export function portableTokenBundle(config: ThemeConfig): PortableTokenBundle {
  return {
    $schema: "https://ui.logic2b.com/schema/token-bundle.json",
    $description:
      "logic2b semantic design tokens. Generated from one portable preset id.",
    $extensions: {
      logic2b: {
        preset: encodePreset(config),
        modes: ["light", "dark"],
      },
    },
    global: portableGlobalTokens(config),
    light: portableModeTokens(config, "light", { includeGlobals: false }),
    dark: portableModeTokens(config, "dark", { includeGlobals: false }),
  }
}
