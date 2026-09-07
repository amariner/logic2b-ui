import { CLI_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"
import { auditTokens } from "@logic2b/tokens/contrast"
import { CURATED_PRESETS } from "@logic2b/tokens/gallery"
import {
  auditTypeset,
  presetDeclarations,
  type Mode,
  type ThemeConfig,
} from "@logic2b/tokens"

export type PresetGalleryLocale = "en" | "es"

const SPANISH: Record<
  string,
  { description: string; tags: string[] }
> = {
  foundation: {
    description: "El punto de partida monocromo y equilibrado para productos, prototipos y nuevos proyectos.",
    tags: ["producto", "neutro", "equilibrado"],
  },
  "cobalt-workspace": {
    description: "Un workspace azul nítido, con neutros slate y titulares geométricos para productos SaaS enfocados.",
    tags: ["saas", "workspace", "azul"],
  },
  "verdant-operations": {
    description: "Tipografía operativa compacta, acentos verdes de datos e iconos Tabler para herramientas de control.",
    tags: ["operaciones", "datos", "verde"],
  },
  "editorial-rose": {
    description: "Ritmo de lectura con serif, neutros stone cálidos y acentos rose contenidos.",
    tags: ["editorial", "contenido", "serif"],
  },
  "violet-studio": {
    description: "Acciones violet expresivas, geometría generosa y tipografía display para productos creativos.",
    tags: ["creativo", "estudio", "violet"],
  },
  "ember-commerce": {
    description: "Acciones orange cálidas y superficies stone para tiendas, catálogos y flujos de checkout.",
    tags: ["comercio", "cálido", "orange"],
  },
  "monochrome-console": {
    description: "Cuadrado, compacto y centrado en monospace para terminales, diagnósticos y superficies técnicas densas.",
    tags: ["desarrollo", "consola", "denso"],
  },
  "calm-documentation": {
    description: "Un sistema de lectura gray espacioso, con chrome discreto y gráficos blue para documentación técnica.",
    tags: ["documentación", "lectura", "calma"],
  },
}

export function themeStyle(config: ThemeConfig, mode: Mode): string {
  return Object.entries(presetDeclarations(config, mode))
    .map(([name, value]) => `--${name}:${value}`)
    .join(";")
}

function auditPreset(config: ThemeConfig) {
  const contrastWarnings = (["light", "dark"] as const).flatMap((mode) =>
    auditTokens(presetDeclarations(config, mode))
      .filter((result) => result.warn)
      .map((result) => ({
        mode,
        foreground: result.fg,
        background: result.bg,
        wcag: result.wcag,
        apca: result.apca,
      })),
  )
  const readabilityWarnings = auditTypeset(config)
    .filter((check) => !check.ok)
    .map(({ key, label, message }) => ({ key, label, message }))

  return { contrastWarnings, readabilityWarnings }
}

export function presetGallery(locale: PresetGalleryLocale = "en") {
  return CURATED_PRESETS.map((entry) => {
    const translation = locale === "es" ? SPANISH[entry.slug] : undefined
    return {
      ...entry,
      description: translation?.description ?? entry.description,
      tags: translation?.tags ?? entry.tags,
      links: {
        studio: `/create?preset=${entry.preset}`,
      },
      command: `npx ${CLI_PACKAGE_SELECTOR} init --preset ${entry.preset}`,
      audit: auditPreset(entry.config),
      styles: {
        light: themeStyle(entry.config, "light"),
        dark: themeStyle(entry.config, "dark"),
      },
    }
  })
}

/** Public contract shared by /themes/index.json and its parity tests. */
export function presetGalleryPayload() {
  const spanish = new Map(presetGallery("es").map((entry) => [entry.slug, entry]))
  return {
    schemaVersion: 1,
    count: CURATED_PRESETS.length,
    presets: presetGallery("en").map(({ styles: _styles, ...entry }) => ({
      ...entry,
      translations: {
        es: {
          description: spanish.get(entry.slug)?.description ?? entry.description,
          tags: spanish.get(entry.slug)?.tags ?? entry.tags,
        },
      },
    })),
    notes: [
      "Curated presets are editorial starting points, not community submissions or accessibility certifications.",
      "Every preset id opens in /create and works unchanged in CLI, MCP, VS Code and portable token exports.",
      "Review reported contrast and readability warnings in the product context before shipping.",
    ],
  }
}
