import { auditTokens } from "./contrast.ts"
import { buildInstallPlan } from "./plan.ts"
import {
  DEFAULT_REGISTRY,
  fetchDemo,
  fetchDemoIndex,
  fetchIndex,
  fetchItem,
  filterIndex,
  kindOf,
  searchIndex,
  type FetchLike,
  type IndexItem,
} from "./registry.ts"
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
  type ThemeConfig,
} from "./themes.ts"

export const SERVER_INFO = { name: "logic2b-ui", version: "0.2.0" } as const

export const KINDS = ["component", "block", "chart", "theme"] as const

export const TOOLS = [
  {
    name: "list_components",
    description:
      "List the items available in the logic2b ui registry (components, blocks, charts and the theme). Optionally filter by kind or category. Returns each item's name, kind, title and description.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: KINDS,
          description: "Only return items of this kind.",
        },
        category: {
          type: "string",
          description:
            'Only return items tagged with this category (e.g. "charts-area", "authentication", "dashboard").',
        },
      },
    },
  },
  {
    name: "search_components",
    description:
      "Search the logic2b ui registry by keyword. Ranks by name/title/description match and returns the best-matching items. Use this to find a component, block or chart to install.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: 'Free-text query, e.g. "login form", "donut chart", "data table".',
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_component",
    description:
      "Fetch a registry item's full payload by name: its dependencies, registry dependencies and the complete source of every file. Use this to read or install a component, block or chart. The npm CLI equivalent is `npx logic2b add <name>`.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: 'The item name, e.g. "button", "login-01", "chart-area-04".',
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_demo",
    description:
      "Fetch usage examples for a registry item: real demo components (the ones rendered in the docs) with imports rewritten to installed-project paths. Pass an item name for all of its demos, or a specific demo name (e.g. \"accordion-controlled-demo\") for just that one. Use it to see how a component is meant to be composed before writing code with it.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: 'An item name ("accordion") or demo name ("accordion-controlled-demo").',
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_command",
    description:
      "Build the exact CLI command to install registry items in a project with a shell: `logic2b add` invocations for npm, pnpm, yarn and bun (names validated against the registry). For agents without a shell, use install_plan instead.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "string" },
          description: 'Registry item names, e.g. ["button", "login-01"].',
        },
      },
      required: ["items"],
    },
  },
  {
    name: "install_plan",
    description:
      "Resolve one or more registry items into an executable install plan: every file to write (project-relative path + full content, registry dependencies already resolved and deduplicated) and the npm dependencies to add. Made for agents without a terminal — no command to run, just write the files and add the deps to package.json. Paths assume the `@/*` import alias maps to the project source root.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "string" },
          description:
            'Registry item names to install, e.g. ["login-01", "theme"] or ["button", "card"].',
        },
        srcDir: {
          type: "string",
          description:
            'Project source root the `@/*` alias points at. Default "src"; pass "" for projects whose alias maps to the repo root.',
        },
      },
      required: ["items"],
    },
  },
  {
    name: "get_theme",
    description:
      "Fetch the logic2b theme: the theme.css stylesheet (every design token the components consume), its npm dependencies, and the customization catalog — available base scales, accents, chart palettes, radii and fonts plus the defaults. Use it to install the design system or to see what apply_preset can change.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "decode_preset",
    description:
      "Decode a theme preset id from the /create studio (or from apply_preset) into its configuration and the exact CSS custom-property values it pins for light and dark mode. Use it to inspect or verify a theme without applying it.",
    inputSchema: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          description: "The preset id, e.g. from a /create share link or DESIGN.md.",
        },
      },
      required: ["preset"],
    },
  },
  {
    name: "apply_preset",
    description:
      "Build a themed theme.css: takes a preset id (or explicit choices — base scale, accent, chart palette, radius, fonts) and returns the theme stylesheet with those exact token values patched in, ready to write into the project, plus the canonical preset id. Pass your project's current theme.css as `css` to re-theme an existing install without losing local edits outside the token blocks.",
    inputSchema: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          description:
            "A preset id from /create. Omit it to compose a theme from the explicit options below.",
        },
        base: { type: "string", description: 'Base gray scale: "neutral", "stone", "zinc", "slate" or "gray".' },
        accent: { type: "string", description: 'Accent color: "base" (monochrome), "blue", "green", "rose", "violet" or "orange".' },
        chart: { type: "string", description: 'Chart palette: "default", "blue", "green", "violet", "rose" or "orange".' },
        radius: { type: "string", description: 'Corner radius: "none", "sm", "md", "default", "lg" or "xl".' },
        font: { type: "string", description: 'Body font: "inter", "grotesk", "sans", "system", "serif" or "mono".' },
        heading: { type: "string", description: "Heading font (same options as font)." },
        css: {
          type: "string",
          description:
            "Optional: an existing theme.css to patch in place. Defaults to the registry's theme.css.",
        },
      },
    },
  },
  {
    name: "contrast_audit",
    description:
      "Audit a theme's text contrast: WCAG 2.2 ratios and APCA Lc values for every foreground/background token pair, light and dark mode. Takes a preset id or explicit theme options (same as apply_preset), or raw token values via `tokens`. A pair warns when it misses WCAG AA (4.5:1) or |Lc| 60. Use it to verify a theme you generated before shipping it.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string", description: "A /create preset id to audit." },
        base: { type: "string", description: "Base gray scale (see apply_preset)." },
        accent: { type: "string", description: "Accent color (see apply_preset)." },
        chart: { type: "string", description: "Chart palette (see apply_preset)." },
        radius: { type: "string", description: "Corner radius (ignored by the audit)." },
        font: { type: "string", description: "Body font (ignored by the audit)." },
        heading: { type: "string", description: "Heading font (ignored by the audit)." },
        tokens: {
          type: "object",
          description:
            'Optional raw token map ({"primary": "oklch(…)", "primary-foreground": "oklch(…)", …}) to audit instead of a preset — audits just these values as one mode.',
        },
      },
    },
  },
] as const

// Type alias (not interface) on purpose: aliases get an implicit index
// signature, which the SDK's CallToolResult requires for assignability.
export type ToolResult = {
  content: { type: "text"; text: string }[]
  isError?: boolean
}

export interface RunToolOptions {
  /** Registry base URL used both to fetch data and in result payloads. */
  base?: string
  /** Fetch implementation (defaults to global fetch); lets the remote MCP
   *  worker read the co-located static assets instead of the network. */
  fetchImpl?: FetchLike
}

function summarize(item: IndexItem) {
  return {
    name: item.name,
    kind: kindOf(item),
    title: item.title ?? item.name,
    description: item.description,
    categories: item.categories,
  }
}

function textResult(value: unknown): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  }
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  }
}

/** Build a ThemeConfig from apply_preset arguments: a preset id wins, else the
 *  explicit options over the defaults. Returns an error message on bad input. */
function resolveThemeArgs(args: Record<string, unknown>): ThemeConfig | string {
  const preset = typeof args.preset === "string" ? args.preset.trim() : ""
  if (preset) {
    const cfg = decodePreset(preset)
    return cfg ?? `"${preset}" is not a valid preset id.`
  }
  const tables: [keyof ThemeConfig, string, Record<string, unknown>][] = [
    ["base", "base", BASE_COLORS],
    ["theme", "accent", ACCENTS],
    ["chart", "chart", CHARTS],
    ["radius", "radius", RADII],
    ["font", "font", FONTS],
    ["heading", "heading", FONTS],
  ]
  const cfg = { ...DEFAULT_CONFIG }
  for (const [key, arg, table] of tables) {
    const value = args[arg]
    if (value === undefined) continue
    if (typeof value !== "string" || !table[value]) {
      return `Unknown ${arg} "${String(value)}". Valid values: ${Object.keys(table).join(", ")}.`
    }
    cfg[key] = value
  }
  return cfg
}

/** Execute one registry tool by name. Transport-agnostic: the stdio server and
 *  the remote /mcp worker both dispatch through here. */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  { base = DEFAULT_REGISTRY, fetchImpl }: RunToolOptions = {}
): Promise<ToolResult> {
  try {
    if (name === "list_components") {
      const index = await fetchIndex(base, fetchImpl)
      const filtered = filterIndex(index, {
        kind: args.kind as (typeof KINDS)[number] | undefined,
        category: args.category as string | undefined,
      })
      return textResult({
        registry: base,
        count: filtered.length,
        items: filtered.map(summarize),
      })
    }

    if (name === "search_components") {
      const query = String(args.query ?? "")
      if (!query.trim()) return errorResult('The "query" argument is required.')
      const limit = Number(args.limit) || 20
      const index = await fetchIndex(base, fetchImpl)
      const results = searchIndex(index, query, limit)
      return textResult({
        registry: base,
        query,
        count: results.length,
        items: results.map(summarize),
      })
    }

    if (name === "get_component") {
      const itemName = String(args.name ?? "")
      if (!itemName.trim()) return errorResult('The "name" argument is required.')
      const item = await fetchItem(base, itemName, fetchImpl)
      return textResult(item)
    }

    if (name === "get_demo") {
      const query = String(args.name ?? "").trim()
      if (!query) return errorResult('The "name" argument is required.')
      const index = await fetchDemoIndex(base, fetchImpl)
      const byItem = index.find((e) => e.item === query)
      const asDemo = index.find((e) => e.demos.includes(query))
      const demoNames = byItem ? byItem.demos : asDemo ? [query] : []
      if (demoNames.length === 0) {
        return errorResult(
          `No demos found for "${query}". Items with demos: ${index.map((e) => e.item).join(", ")}.`
        )
      }
      const demos = []
      for (const demoName of demoNames) {
        demos.push(await fetchDemo(base, demoName, fetchImpl))
      }
      return textResult({
        registry: base,
        item: byItem?.item ?? asDemo!.item,
        count: demos.length,
        demos,
      })
    }

    if (name === "add_command") {
      const items = Array.isArray(args.items)
        ? args.items.map(String).filter((s) => s.trim())
        : []
      if (items.length === 0) {
        return errorResult('The "items" argument must be a non-empty array of item names.')
      }
      const index = await fetchIndex(base, fetchImpl)
      const known = new Set(index.map((i) => i.name))
      const unknown = items.filter((i) => !known.has(i))
      if (unknown.length > 0) {
        return errorResult(
          `Unknown item(s): ${unknown.join(", ")}. Use search_components or list_components to find the right names.`
        )
      }
      const names = items.join(" ")
      return textResult({
        registry: base,
        items,
        commands: {
          npm: `npx logic2b@latest add ${names}`,
          pnpm: `pnpm dlx logic2b@latest add ${names}`,
          yarn: `yarn dlx logic2b@latest add ${names}`,
          bun: `bunx logic2b@latest add ${names}`,
        },
        notes: [
          "If the project has no components.json yet, run `npx logic2b@latest init` first (add --preset <id> to apply a /create theme).",
          "The command resolves registry dependencies and prints the npm packages to install.",
          "No shell available? Use the install_plan tool instead — it returns the file writes directly.",
        ],
      })
    }

    if (name === "install_plan") {
      const items = Array.isArray(args.items)
        ? args.items.map(String).filter((s) => s.trim())
        : []
      if (items.length === 0) {
        return errorResult('The "items" argument must be a non-empty array of item names.')
      }
      const srcDir = typeof args.srcDir === "string" ? args.srcDir : "src"
      const plan = await buildInstallPlan(items, { base, fetchImpl, srcDir })
      return textResult(plan)
    }

    if (name === "get_theme") {
      const item = await fetchItem(base, "theme", fetchImpl)
      const css = item.files?.find((f) => f.path.endsWith(".css"))?.content ?? ""
      return textResult({
        registry: base,
        name: item.name,
        description: item.description,
        npmDependencies: item.dependencies ?? [],
        file: { path: "src/styles/theme.css", content: css },
        docs: (item as { docs?: string }).docs,
        defaults: DEFAULT_CONFIG,
        options: {
          base: Object.keys(BASE_COLORS),
          accent: Object.keys(ACCENTS),
          chart: Object.keys(CHARTS),
          radius: RADII,
          font: FONTS,
        },
        notes: [
          "Every option combination is addressable as a preset id — use apply_preset to get the patched stylesheet, decode_preset to inspect one.",
          'The config key for the accent is "theme" (historical); the apply_preset argument is "accent".',
        ],
      })
    }

    if (name === "decode_preset") {
      const preset = String(args.preset ?? "").trim()
      if (!preset) return errorResult('The "preset" argument is required.')
      const cfg = decodePreset(preset)
      if (!cfg) {
        return errorResult(
          `"${preset}" is not a valid preset id (expected base64url of "base|accent|chart|radius|font|heading" with known values).`
        )
      }
      return textResult({
        preset,
        config: cfg,
        declarations: {
          light: presetDeclarations(cfg, "light"),
          dark: presetDeclarations(cfg, "dark"),
        },
      })
    }

    if (name === "apply_preset") {
      const cfg = resolveThemeArgs(args)
      if (typeof cfg === "string") return errorResult(cfg)
      let css = typeof args.css === "string" && args.css.trim() ? args.css : undefined
      let npmDependencies: string[] | undefined
      if (css === undefined) {
        const item = await fetchItem(base, "theme", fetchImpl)
        css = item.files?.find((f) => f.path.endsWith(".css"))?.content ?? ""
        npmDependencies = item.dependencies ?? []
      }
      const patched = applyPresetToCss(css, cfg)
      return textResult({
        registry: base,
        preset: encodePreset(cfg),
        config: cfg,
        file: { path: "src/styles/theme.css", content: patched },
        ...(npmDependencies ? { npmDependencies } : {}),
        notes: [
          "Write the file into the project (or overwrite the existing theme.css) — only the token values inside :root and .dark change.",
          "Reproduce this exact theme anywhere with `npx logic2b@latest init --preset <preset>` or the /create studio.",
        ],
      })
    }

    if (name === "contrast_audit") {
      if (args.tokens && typeof args.tokens === "object") {
        const results = auditTokens(args.tokens as Record<string, string>)
        return textResult({
          results,
          warnings: results.filter((r) => r.warn).length,
        })
      }
      const cfg = resolveThemeArgs(args)
      if (typeof cfg === "string") return errorResult(cfg)
      const light = auditTokens(presetDeclarations(cfg, "light"))
      const dark = auditTokens(presetDeclarations(cfg, "dark"))
      const warnings = [...light, ...dark].filter((r) => r.warn)
      return textResult({
        preset: encodePreset(cfg),
        config: cfg,
        thresholds: { wcag: "AA 4.5:1 for body text", apca: "|Lc| ≥ 60" },
        light,
        dark,
        warnings: warnings.length,
        verdict:
          warnings.length === 0
            ? "Every audited pair meets WCAG AA and APCA |Lc| 60."
            : `${warnings.length} pair(s) fall below the baseline — see "warn": true.`,
      })
    }

    return errorResult(`Unknown tool: ${name}`)
  } catch (err) {
    return errorResult(
      `logic2b-mcp error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
