import {
  DEFAULT_CONFIG,
  encodePreset,
  type ThemeConfig,
} from "./index.ts"

export interface CuratedPreset {
  /** Stable route/API identifier. */
  slug: string
  name: string
  description: string
  tags: string[]
  config: ThemeConfig
  /** Canonical id accepted by /create, CLI, MCP and VS Code. */
  preset: string
}

type PresetInput = Omit<CuratedPreset, "config" | "preset"> & {
  config?: Partial<ThemeConfig>
}

function definePreset(input: PresetInput): CuratedPreset {
  const config: ThemeConfig = { ...DEFAULT_CONFIG, ...input.config }
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    tags: [...input.tags],
    config,
    preset: encodePreset(config),
  }
}

/**
 * Editorial presets for the public gallery. These are complete design-system
 * configurations, not screenshots: every card opens the same canonical id in
 * /create and every consumer decodes it through the shared codec.
 */
export const CURATED_PRESETS: CuratedPreset[] = [
  definePreset({
    slug: "foundation",
    name: "Foundation",
    description: "The balanced monochrome default for product interfaces, prototypes and starter projects.",
    tags: ["product", "neutral", "balanced"],
  }),
  definePreset({
    slug: "cobalt-workspace",
    name: "Cobalt Workspace",
    description: "A crisp blue workspace with slate neutrals and geometric headings for focused SaaS products.",
    tags: ["saas", "workspace", "blue"],
    config: {
      base: "slate",
      theme: "blue",
      chart: "blue",
      radius: "lg",
      heading: "grotesk",
    },
  }),
  definePreset({
    slug: "verdant-operations",
    name: "Verdant Operations",
    description: "Compact operational typography, green data accents and Tabler icons for control-heavy tools.",
    tags: ["operations", "data", "green"],
    config: {
      base: "zinc",
      theme: "green",
      chart: "green",
      radius: "md",
      measure: "relaxed",
      size: "sm",
      leading: "relaxed",
      iconLibrary: "tabler",
    },
  }),
  definePreset({
    slug: "editorial-rose",
    name: "Editorial Rose",
    description: "Serif-led reading rhythm with warm stone neutrals and restrained rose accents.",
    tags: ["editorial", "content", "serif"],
    config: {
      base: "stone",
      theme: "rose",
      chart: "rose",
      radius: "sm",
      font: "serif",
      heading: "serif",
      measure: "narrow",
      size: "lg",
      leading: "relaxed",
      flow: "relaxed",
      iconLibrary: "phosphor",
    },
  }),
  definePreset({
    slug: "violet-studio",
    name: "Violet Studio",
    description: "Expressive violet actions, generous shape and display typography for creative products.",
    tags: ["creative", "studio", "violet"],
    config: {
      theme: "violet",
      chart: "violet",
      radius: "xl",
      heading: "grotesk",
      size: "lg",
      flow: "relaxed",
      iconLibrary: "phosphor",
    },
  }),
  definePreset({
    slug: "ember-commerce",
    name: "Ember Commerce",
    description: "Warm orange actions and stone surfaces tuned for storefronts, catalogs and checkout flows.",
    tags: ["commerce", "warm", "orange"],
    config: {
      base: "stone",
      theme: "orange",
      chart: "orange",
      radius: "lg",
      iconLibrary: "hugeicons",
    },
  }),
  definePreset({
    slug: "monochrome-console",
    name: "Monochrome Console",
    description: "Square, compact and monospace-first for terminals, diagnostics and dense technical surfaces.",
    tags: ["developer", "console", "dense"],
    config: {
      base: "zinc",
      chart: "green",
      radius: "none",
      font: "mono",
      heading: "mono",
      measure: "narrow",
      size: "sm",
      flow: "tight",
      iconLibrary: "tabler",
    },
  }),
  definePreset({
    slug: "calm-documentation",
    name: "Calm Documentation",
    description: "A spacious gray reading system with quiet chrome and blue charts for technical documentation.",
    tags: ["documentation", "reading", "calm"],
    config: {
      base: "gray",
      chart: "blue",
      radius: "md",
      heading: "grotesk",
      measure: "relaxed",
      leading: "relaxed",
      flow: "relaxed",
    },
  }),
]

export function getCuratedPreset(slug: string): CuratedPreset | undefined {
  return CURATED_PRESETS.find((preset) => preset.slug === slug)
}
