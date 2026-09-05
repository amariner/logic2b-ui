/** Wire contracts shared by the stdio server and the remote HTTP endpoint.
 * Keep additive registry metadata allowed; known fields and nested payloads
 * are typed. Validation runs in contract/consumer tests, not via runtime code
 * generation inside the Cloudflare Worker. */
type Schema = Record<string, unknown>
const string = { type: "string" }
const number = { type: "number" }
const boolean = { type: "boolean" }
const count = { type: "integer", minimum: 0 }
const array = (items: Schema) => ({ type: "array", items })
const strings = array(string)
const enumeration = (...values: string[]) => ({ type: "string", enum: values })
const record = (values: Schema) => ({ type: "object", additionalProperties: values })
const object = (properties: Record<string, Schema>, required = Object.keys(properties)) => ({
  type: "object" as const,
  properties,
  required,
})

const version = { registry: string, requestedVersion: string, registryVersion: string }
const file = object({ path: string, content: string })
const commands = object({ npm: string, pnpm: string, yarn: string, bun: string })
const icon = enumeration("lucide", "tabler", "phosphor", "hugeicons")
const config = object({
  base: string, theme: string, chart: string, radius: string, font: string,
  heading: string, mono: string, measure: string, size: string, leading: string,
  flow: string, iconLibrary: icon,
})
const accessibility = object({
  support: enumeration("native", "primitive", "authored", "consumer"),
  pattern: string, primitive: string,
  keyboard: array(object({ keys: strings, action: string })),
  aria: strings, consumer: strings, limitations: strings,
}, ["support", "pattern", "keyboard", "aria", "consumer"])
const api = object({
  source: string,
  exports: array(object({
    name: string, kind: enumeration("component", "hook", "type", "utility"),
    description: string, propsType: string, aliasOf: string, definition: string,
    signature: string,
    props: array(object({
      name: string, type: string, required: boolean, default: string, description: string,
    }, ["name", "type", "required"])),
  }, ["name", "kind"])),
})
const itemMetadata = {
  name: string, title: string, description: string, categories: strings,
  version: string, registryVersion: string, integrity: string, changelog: string,
}
const summary = object({
  ...itemMetadata, kind: enumeration("component", "block", "chart", "theme"),
  accessibility: string, api: string,
}, ["name", "title", "description", "kind"])
const installItem = object({
  name: string, title: string, requested: boolean, version: string,
  integrity: string, files: strings,
}, ["name", "title", "requested"])
const plan = {
  ...version, items: array(installItem), files: array(file),
  npmDependencies: strings, iconLibrary: icon, notes: strings,
}
const planRequired = ["registry", "items", "files", "npmDependencies", "iconLibrary", "notes"]

const pair = object({
  fg: string, bg: string, role: enumeration("body", "secondary"),
  wcag: number, wcagLevel: enumeration("AAA", "AA", "AA-large", "fail"),
  apca: number, apcaLevel: enumeration("body", "large", "min", "fail"), warn: boolean,
})
const token = object({
  $type: enumeration("color", "dimension", "number", "string"),
  $value: { anyOf: [string, number, object({ value: number, unit: string })] },
})
const tokenSets = { global: record(token), light: record(token), dark: record(token) }
const parsedMode = object({
  selector: enumeration(":root", ".dark"), selectorCount: count,
  tokens: record(string), lines: record({ type: "integer", minimum: 1 }),
  duplicates: array(object({ token: string, lines: array({ type: "integer", minimum: 1 }) })),
  unclosed: boolean,
})

export const OUTPUT_SCHEMAS = {
  list_components: object({ ...version, count, items: array(summary) }, ["registry", "count", "items"]),
  search_components: object({ ...version, query: string, count, items: array(summary) },
    ["registry", "query", "count", "items"]),
  get_component: object({
    ...itemMetadata, type: string, content: string, dependencies: strings,
    registryDependencies: strings,
    files: array(object({ path: string, type: string, content: string })),
    accessibility, api,
  }, ["name", "type", "description"]),
  list_registry_versions: object({
    registry: string, schemaVersion: { const: 1 }, latest: string,
    channels: record(string),
    versions: array(object({ version: string, channel: string, releasedAt: string, manifest: string })),
  }),
  get_changelog: object({
    registry: string, schemaVersion: { const: 1 }, name: string, currentVersion: string,
    changes: array(object({ version: string, releasedAt: string, kind: string, summary: string })),
  }),
  get_demo: object({
    registry: string, item: string, count,
    demos: array(object({ name: string, item: string, content: string })),
  }),
  add_command: object({ ...version, items: strings, commands, notes: strings },
    ["registry", "items", "commands", "notes"]),
  install_plan: object(plan, planRequired),
  scaffold_plan: object({
    ...plan, framework: enumeration("next", "vite", "astro"),
    starter: object({ name: enumeration("marketing", "dashboard", "auth"), title: string, description: string }),
    projectName: string, preset: string, commands,
  }, [...planRequired, "framework", "starter", "projectName", "commands"]),
  get_theme: object({
    ...version, name: string, description: string, npmDependencies: strings,
    file, docs: string, defaults: config,
    options: object({
      base: strings, accent: strings, chart: strings, radius: record(string),
      font: record(string), iconLibrary: record(object({ label: string, package: string })),
    }),
    notes: strings,
  }, ["registry", "name", "description", "npmDependencies", "file", "defaults", "options", "notes"]),
  export_tokens: object({
    preset: string,
    bundle: object({
      $schema: string, $description: string,
      $extensions: object({ logic2b: object({ preset: string, modes: array(enumeration("light", "dark")) }) }),
      ...tokenSets,
    }),
    tokensStudio: object({
      ...tokenSets,
      $metadata: object({ tokenSetOrder: strings }),
      $themes: array(object({
        id: string, name: string, group: string,
        selectedTokenSets: record(enumeration("enabled", "disabled", "source")),
      })),
    }),
    defaultArtifacts: object({ manifest: string, tokensStudio: string, css: string, android: string, ios: string }),
    notes: strings,
  }),
  decode_preset: object({
    preset: string, config,
    declarations: object({ light: record(string), dark: record(string) }),
  }),
  apply_preset: object({
    ...version, preset: string, config, file, npmDependencies: strings, notes: strings,
  }, ["registry", "preset", "config", "file", "notes"]),
  // The caller may audit a single token map or both modes of a preset.
  contrast_audit: {
    type: "object" as const,
    oneOf: [
      object({ results: array(pair), warnings: count }),
      object({
        preset: string, config, thresholds: object({ wcag: string, apca: string }),
        light: array(pair), dark: array(pair), warnings: count, verdict: string,
      }),
    ],
  },
  lint_theme: object({
    schemaVersion: { const: 1 }, preset: string, expectedConfig: config,
    valid: boolean, clean: boolean,
    summary: object({ errors: count, warnings: count, lightTokens: count, darkTokens: count, contrastRegressions: count }),
    modes: object({ light: parsedMode, dark: parsedMode }),
    contrast: object({ light: array(pair), dark: array(pair) }),
    issues: array(object({
      code: string, severity: enumeration("error", "warning"),
      category: enumeration("structure", "token", "derived", "preset", "contrast"),
      message: string, mode: enumeration("light", "dark"), token: string,
      line: { type: "integer", minimum: 1 }, actual: string, expected: string,
    }, ["code", "severity", "category", "message"])),
    verdict: string,
  }, ["schemaVersion", "valid", "clean", "summary", "modes", "contrast", "issues", "verdict"]),
} as const
