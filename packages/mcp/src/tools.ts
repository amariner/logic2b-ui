import { auditTokens } from "@logic2b/tokens/contrast"
import {
  portableTokenBundle,
  tokensStudioBundle,
} from "@logic2b/tokens/export"
import { lintThemeCss } from "@logic2b/tokens/lint"
import { buildInstallPlan } from "./plan.ts"
import { PACKAGE_VERSION } from "./version.ts"
import {
  buildScaffoldPlan,
  SCAFFOLD_FRAMEWORKS,
  SCAFFOLD_STARTERS,
  type ScaffoldFramework,
  type ScaffoldStarter,
} from "./scaffold.ts"
import {
  DEFAULT_REGISTRY,
  createRegistryClient,
  fetchChangelog,
  fetchDemo,
  fetchDemoIndex,
  fetchRegistryVersions,
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
  ICON_LIBRARIES,
  parseCustomKey,
  presetDeclarations,
  RADII,
  type ThemeConfig,
} from "@logic2b/tokens"

export const SERVER_INFO = { name: "logic2b-ui", version: PACKAGE_VERSION } as const

export const KINDS = ["component", "block", "chart", "theme"] as const

const VERSION_INPUT = {
  version: {
    type: "string",
    description:
      'Optional registry semver, range or channel (for example "1.0.0-rc.7", "^1.0.0" or "next"). Resolves to one immutable SHA-256-verified manifest.',
  },
} as const

export const TOOLS = [
  {
    name: "list_components",
    description:
      "List the items available in the logic2b ui registry (components, blocks, charts and the theme). Optionally filter by kind or category. Returns each item's name, kind, title and description.",
    inputSchema: {
      type: "object",
      properties: {
        ...VERSION_INPUT,
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
        ...VERSION_INPUT,
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
        ...VERSION_INPUT,
        name: {
          type: "string",
          description: 'The item name, e.g. "button", "login-01", "chart-area-04".',
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_registry_versions",
    description:
      "List published immutable registry releases and channels. Use the returned exact semver, a semver range or a channel as the version argument on read/install/scaffold tools.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_changelog",
    description:
      "Fetch the machine-readable release history for one registry item before updating it.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: 'Registry item name, e.g. "button" or "dashboard-02".',
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
        ...VERSION_INPUT,
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
        ...VERSION_INPUT,
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
        iconLibrary: {
          type: "string",
          enum: Object.keys(ICON_LIBRARIES),
          description:
            "Icon implementation for generated sources. Defaults to lucide; also supports tabler, phosphor and hugeicons.",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "scaffold_plan",
    description:
      "Generate a complete runnable starter project as file writes: framework shell, routing entry, package.json, logic2b theme and every component/block dependency. Works without a terminal. Choose Next.js, Vite or Astro and a marketing, dashboard or authentication starter; optionally apply an exact /create preset.",
    inputSchema: {
      type: "object",
      properties: {
        ...VERSION_INPUT,
        framework: {
          type: "string",
          enum: SCAFFOLD_FRAMEWORKS,
          description: "Application framework for the generated project.",
        },
        starter: {
          type: "string",
          enum: SCAFFOLD_STARTERS,
          description: "Starter application to compose from registry blocks.",
        },
        name: {
          type: "string",
          description:
            'Optional npm project name. Defaults to "logic2b-<starter>".',
        },
        preset: {
          type: "string",
          description:
            "Optional theme preset id from ui.logic2b.com/create. The generated theme.css is patched to match it exactly.",
        },
      },
      required: ["framework", "starter"],
    },
  },
  {
    name: "get_theme",
    description:
      "Fetch the logic2b theme: the theme.css stylesheet (every design token the components consume), its npm dependencies, and the customization catalog — available base scales, accents, chart palettes, radii, fonts and icon libraries plus the defaults. Use it to install the design system or to see what apply_preset can change.",
    inputSchema: { type: "object", properties: { ...VERSION_INPUT } },
  },
  {
    name: "export_tokens",
    description:
      "Export a /create preset as portable DTCG-shaped light/dark tokens plus a Tokens Studio theme contract for Figma Variables. The same source drives the public CSS, iOS and Android artifacts.",
    inputSchema: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          description: "A preset id from /create. Omit it to compose from the options below.",
        },
        base: { type: "string", description: "Base gray scale (see apply_preset)." },
        accent: { type: "string", description: "Accent color (see apply_preset)." },
        chart: { type: "string", description: "Chart palette (see apply_preset)." },
        radius: { type: "string", description: "Corner radius (see apply_preset)." },
        font: { type: "string", description: "Body font (see apply_preset)." },
        heading: { type: "string", description: "Heading font (see apply_preset)." },
        iconLibrary: { type: "string", enum: Object.keys(ICON_LIBRARIES), description: "Icon library (see apply_preset)." },
      },
    },
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
        ...VERSION_INPUT,
        preset: {
          type: "string",
          description:
            "A preset id from /create. Omit it to compose a theme from the explicit options below.",
        },
        base: { type: "string", description: 'Base gray scale: "neutral", "stone", "zinc", "slate" or "gray".' },
        accent: { type: "string", description: 'Accent color: "base" (monochrome), "blue", "green", "rose", "violet", "orange" — or a custom oklch hue/chroma as "h<hue>c<chroma>" (hue 0-360, chroma 0-0.4), e.g. "h250c0.2". Text color is picked by contrast automatically.' },
        chart: { type: "string", description: 'Chart palette: "default", "blue", "green", "violet", "rose", "orange" — or a custom "h<hue>c<chroma>" ramp.' },
        radius: { type: "string", description: 'Corner radius: "none", "sm", "md", "default", "lg" or "xl".' },
        font: { type: "string", description: 'Body font: "inter", "grotesk", "sans", "system", "serif" or "mono".' },
        heading: { type: "string", description: "Heading font (same options as font)." },
        iconLibrary: {
          type: "string",
          enum: Object.keys(ICON_LIBRARIES),
          description: "Icon output carried by the canonical preset id.",
        },
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
  {
    name: "lint_theme",
    description:
      "Lint a project's theme.css as a static design-system contract. Reports missing/duplicate/invalid tokens, broken sidebar derivations, optional exact /create preset drift and new WCAG/APCA contrast regressions. Caller CSS is parsed as text and never executed.",
    inputSchema: {
      type: "object",
      properties: {
        css: {
          type: "string",
          description: "The complete theme.css contents to inspect (maximum 1 MB).",
        },
        preset: {
          type: "string",
          description:
            "Optional /create preset id. When supplied, every contract token is also compared with that exact preset.",
        },
      },
      required: ["css"],
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
    ...(item.version ? { version: item.version } : {}),
    ...(item.registryVersion ? { registryVersion: item.registryVersion } : {}),
    ...(item.integrity ? { integrity: item.integrity } : {}),
    ...(item.changelog ? { changelog: item.changelog } : {}),
    ...(item.accessibility ? { accessibility: item.accessibility } : {}),
    ...(item.api ? { api: item.api } : {}),
  }
}

function versionArg(args: Record<string, unknown>): string | undefined {
  const version = typeof args.version === "string" ? args.version.trim() : ""
  return version || undefined
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
    ["iconLibrary", "iconLibrary", ICON_LIBRARIES],
  ]
  const cfg = { ...DEFAULT_CONFIG }
  for (const [key, arg, table] of tables) {
    const value = args[arg]
    if (value === undefined) continue
    // accent and chart also accept a custom "h<hue>c<chroma>" key
    // (hue 0-360, chroma 0-0.4), e.g. "h250c0.2".
    const customOk =
      (arg === "accent" || arg === "chart") &&
      typeof value === "string" &&
      parseCustomKey(value) !== null
    if (!customOk && (typeof value !== "string" || !table[value])) {
      return `Unknown ${arg} "${String(value)}". Valid values: ${Object.keys(table).join(", ")}${
        arg === "accent" || arg === "chart"
          ? ', or a custom "h<hue>c<chroma>" key (hue 0-360, chroma 0-0.4), e.g. "h250c0.2"'
          : ""
      }.`
    }
    Object.assign(cfg, { [key]: value })
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
      const client = await createRegistryClient(base, versionArg(args), fetchImpl)
      const filtered = filterIndex(client.index, {
        kind: args.kind as (typeof KINDS)[number] | undefined,
        category: args.category as string | undefined,
      })
      return textResult({
        registry: base,
        ...(client.requestedVersion ? { requestedVersion: client.requestedVersion } : {}),
        ...(client.resolvedVersion ? { registryVersion: client.resolvedVersion } : {}),
        count: filtered.length,
        items: filtered.map(summarize),
      })
    }

    if (name === "search_components") {
      const query = String(args.query ?? "")
      if (!query.trim()) return errorResult('The "query" argument is required.')
      const limit = Number(args.limit) || 20
      const client = await createRegistryClient(base, versionArg(args), fetchImpl)
      const results = searchIndex(client.index, query, limit)
      return textResult({
        registry: base,
        ...(client.requestedVersion ? { requestedVersion: client.requestedVersion } : {}),
        ...(client.resolvedVersion ? { registryVersion: client.resolvedVersion } : {}),
        query,
        count: results.length,
        items: results.map(summarize),
      })
    }

    if (name === "get_component") {
      const itemName = String(args.name ?? "")
      if (!itemName.trim()) return errorResult('The "name" argument is required.')
      const client = await createRegistryClient(base, versionArg(args), fetchImpl)
      const item = await client.getItem(itemName)
      return textResult(item)
    }

    if (name === "list_registry_versions") {
      return textResult({
        registry: base,
        ...(await fetchRegistryVersions(base, fetchImpl)),
      })
    }

    if (name === "get_changelog") {
      const itemName = String(args.name ?? "").trim()
      if (!itemName) return errorResult('The "name" argument is required.')
      return textResult({
        registry: base,
        ...(await fetchChangelog(base, itemName, fetchImpl)),
      })
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
      const client = await createRegistryClient(base, versionArg(args), fetchImpl)
      const known = new Set(client.index.map((i) => i.name))
      const unknown = items.filter((i) => !known.has(i))
      if (unknown.length > 0) {
        return errorResult(
          `Unknown item(s): ${unknown.join(", ")}. Use search_components or list_components to find the right names.`
        )
      }
      const names = items.join(" ")
      const versionFlag = client.resolvedVersion
        ? ` --registry-version ${client.resolvedVersion}`
        : ""
      return textResult({
        registry: base,
        ...(client.requestedVersion ? { requestedVersion: client.requestedVersion } : {}),
        ...(client.resolvedVersion ? { registryVersion: client.resolvedVersion } : {}),
        items,
        commands: {
          npm: `npx logic2b@latest add ${names}${versionFlag}`,
          pnpm: `pnpm dlx logic2b@latest add ${names}${versionFlag}`,
          yarn: `yarn dlx logic2b@latest add ${names}${versionFlag}`,
          bun: `bunx logic2b@latest add ${names}${versionFlag}`,
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
      const iconLibrary = String(args.iconLibrary ?? "lucide")
      if (!(iconLibrary in ICON_LIBRARIES)) {
        return errorResult(
          `The "iconLibrary" argument must be one of: ${Object.keys(ICON_LIBRARIES).join(", ")}.`,
        )
      }
      const plan = await buildInstallPlan(items, {
        base,
        fetchImpl,
        srcDir,
        version: versionArg(args),
        iconLibrary: iconLibrary as keyof typeof ICON_LIBRARIES,
      })
      // Snapshots are scaffold-internal. Per-item installs write their own
      // bases through the CLI and shell-less agents only need target writes.
      const { snapshots: _snapshots, ...publicPlan } = plan
      return textResult(publicPlan)
    }

    if (name === "scaffold_plan") {
      const framework = String(args.framework ?? "") as ScaffoldFramework
      const starter = String(args.starter ?? "") as ScaffoldStarter
      if (!SCAFFOLD_FRAMEWORKS.includes(framework)) {
        return errorResult(
          `The "framework" argument must be one of: ${SCAFFOLD_FRAMEWORKS.join(", ")}.`
        )
      }
      if (!SCAFFOLD_STARTERS.includes(starter)) {
        return errorResult(
          `The "starter" argument must be one of: ${SCAFFOLD_STARTERS.join(", ")}.`
        )
      }
      const plan = await buildScaffoldPlan({
        base,
        fetchImpl,
        framework,
        starter,
        name: typeof args.name === "string" ? args.name : undefined,
        preset: typeof args.preset === "string" ? args.preset : undefined,
        version: versionArg(args),
      })
      return textResult(plan)
    }

    if (name === "get_theme") {
      const client = await createRegistryClient(base, versionArg(args), fetchImpl)
      const item = await client.getItem("theme")
      const css = item.files?.find((f) => f.path.endsWith(".css"))?.content ?? ""
      return textResult({
        registry: base,
        ...(client.requestedVersion ? { requestedVersion: client.requestedVersion } : {}),
        ...(client.resolvedVersion ? { registryVersion: client.resolvedVersion } : {}),
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
          iconLibrary: ICON_LIBRARIES,
        },
        notes: [
          "Every option combination is addressable as a preset id — use apply_preset to get the patched stylesheet, decode_preset to inspect one.",
          'The config key for the accent is "theme" (historical); the apply_preset argument is "accent".',
          'Beyond the named accents/charts, any oklch hue/chroma works as a custom key: "h<hue>c<chroma>" (hue 0-360, chroma 0-0.4), e.g. accent "h250c0.2". The readable text color is derived by contrast.',
        ],
      })
    }

    if (name === "export_tokens") {
      const cfg = resolveThemeArgs(args)
      if (typeof cfg === "string") return errorResult(cfg)
      const bundle = portableTokenBundle(cfg)
      const tokensStudio = tokensStudioBundle(cfg)
      return textResult({
        preset: encodePreset(cfg),
        bundle,
        tokensStudio,
        defaultArtifacts: {
          manifest: `${base}/tokens/default/manifest.json`,
          tokensStudio: `${base}/tokens/default/logic2b.tokens-studio.json`,
          css: `${base}/tokens/default/logic2b.css`,
          android: `${base}/tokens/default/android/`,
          ios: `${base}/tokens/default/ios/`,
        },
        notes: [
          "The bundle preserves CSS oklch values and separates global, light and dark semantic tokens.",
          "The Tokens Studio contract groups Light and Dark as modes of one Logic2b Figma Variable collection.",
          "Feed this DTCG-shaped source into Style Dictionary or another design-token pipeline for a custom preset.",
        ],
      })
    }

    if (name === "decode_preset") {
      const preset = String(args.preset ?? "").trim()
      if (!preset) return errorResult('The "preset" argument is required.')
      const cfg = decodePreset(preset)
      if (!cfg) {
        return errorResult(
          `"${preset}" is not a valid preset id (expected a known, URL-safe /create configuration).`
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
      let selectedVersion: { requestedVersion?: string; registryVersion?: string } = {}
      if (css === undefined) {
        const client = await createRegistryClient(base, versionArg(args), fetchImpl)
        const item = await client.getItem("theme")
        css = item.files?.find((f) => f.path.endsWith(".css"))?.content ?? ""
        npmDependencies = item.dependencies ?? []
        selectedVersion = {
          ...(client.requestedVersion ? { requestedVersion: client.requestedVersion } : {}),
          ...(client.resolvedVersion ? { registryVersion: client.resolvedVersion } : {}),
        }
      }
      const patched = applyPresetToCss(css, cfg)
      return textResult({
        registry: base,
        ...selectedVersion,
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

    if (name === "lint_theme") {
      const css = typeof args.css === "string" ? args.css : ""
      if (!css.trim()) return errorResult('The "css" argument is required.')
      if (new TextEncoder().encode(css).byteLength > 1_000_000) {
        return errorResult('The "css" argument must not exceed 1 MB.')
      }
      const preset = typeof args.preset === "string" ? args.preset.trim() : ""
      let expected: ThemeConfig | undefined
      if (preset) {
        const decoded = decodePreset(preset)
        if (!decoded) return errorResult(`"${preset}" is not a valid preset id.`)
        expected = decoded
      }
      return textResult({
        ...(preset ? { preset, expectedConfig: expected } : {}),
        ...lintThemeCss(css, { expected }),
      })
    }

    return errorResult(`Unknown tool: ${name}`)
  } catch (err) {
    return errorResult(
      `logic2b-mcp error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
