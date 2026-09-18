import { decodePreset, encodePreset, ICON_LIBRARIES, type IconLibrary } from "@logic2b/tokens"
import { CLI_PACKAGE_SELECTOR, MCP_PACKAGE_SELECTOR } from "./package-selectors.ts"
import { buildDesignMd } from "./design.ts"
export { buildAgentsMd, type IndexEntry } from "./studio-rules.ts"
export { buildDesignMd } from "./design.ts"

export const RULE_FORMATS = ["agents", "claude", "cursor", "copilot"] as const
export type RuleFormat = (typeof RULE_FORMATS)[number]
export const RULE_LIMITS = { blockBytes: 6 * 1024, documentBytes: 128 * 1024, items: 1000 } as const
export interface RulesItem { name: string; type?: string; categories?: string[] }
export interface AgentRulesOptions {
  preset?: string
  stack?: "next" | "vite" | "astro" | "react"
  iconLibrary?: IconLibrary
  registryVersion?: string
  /** Installed items only, not the whole available catalog. Omitted means unknown. */
  items?: readonly RulesItem[]
  formats?: readonly RuleFormat[]
}
export interface RuleFile { path: string; content: string }
export interface AgentRulesPlan {
  schemaVersion: 1
  files: RuleFile[]
  notes: string[]
}
const bytes = (text: string) => new TextEncoder().encode(text).length
const NAME = /^[a-z0-9][a-z0-9-]{0,99}$/

function normalize(options: AgentRulesOptions) {
  for (const field of ["preset", "iconLibrary", "stack", "registryVersion"] as const) if (options[field] !== undefined && typeof options[field] !== "string") throw new Error(`Rules ${field} must be a string.`)
  if (options.formats !== undefined && !Array.isArray(options.formats)) throw new Error("Rules formats must be an array.")
  if (options.preset !== undefined && options.preset.length > 256) throw new Error("Invalid rules preset.")
  const config = options.preset === undefined ? undefined : decodePreset(options.preset)
  if (options.preset !== undefined && (!config || options.preset.length > 256)) throw new Error("Invalid rules preset.")
  const iconLibrary = options.iconLibrary ?? config?.iconLibrary ?? "lucide"
  if (!Object.hasOwn(ICON_LIBRARIES, iconLibrary)) throw new Error("Invalid rules icon library.")
  if (config && options.iconLibrary && config.iconLibrary !== options.iconLibrary) throw new Error("Rules icon library conflicts with the preset.")
  const stack = options.stack ?? "react"
  if (!["react", "next", "vite", "astro"].includes(stack)) throw new Error("Invalid rules stack.")
  if (options.registryVersion !== undefined && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(options.registryVersion)) throw new Error("Rules registryVersion must be an exact version.")
  if (options.registryVersion && options.registryVersion.length > 100) throw new Error("Rules registryVersion is too long.")
  const formats = options.formats ?? ["agents"]
  if (!Array.isArray(formats) || formats.length < 1 || formats.length > RULE_FORMATS.length || new Set(formats).size !== formats.length || formats.some(f => !RULE_FORMATS.includes(f))) throw new Error("Choose distinct rules formats: agents, claude, cursor, copilot.")
  if (options.items !== undefined && (!Array.isArray(options.items) || options.items.length > RULE_LIMITS.items)) throw new Error("Rules inventory exceeds the item limit.")
  const items = options.items?.map(item => {
    if (!item || typeof item.name !== "string" || !NAME.test(item.name)) throw new Error("Invalid rules inventory name.")
    if (item.type !== undefined && !["registry:ui", "registry:block", "registry:hook", "registry:lib", "registry:style", "registry:theme"].includes(item.type)) throw new Error("Invalid rules inventory type.")
    if (item.categories !== undefined && (!Array.isArray(item.categories) || item.categories.length > 20 || item.categories.some((c: unknown) => typeof c !== "string" || !NAME.test(c)))) throw new Error("Invalid rules inventory categories.")
    return item
  }).sort((a,b) => a.name.localeCompare(b.name))
  if (items && new Set(items.map(i => i.name)).size !== items.length) throw new Error("Duplicate rules inventory item.")
  return { config, iconLibrary, stack, formats, items, preset: config ? encodePreset(config) : "unknown", registry: options.registryVersion ?? "unknown" }
}

/** Pure, bounded writes. Existing documents must be merged by mergeRuleFile. */
export function buildAgentRules(options: AgentRulesOptions = {}): AgentRulesPlan {
  const { config, iconLibrary, stack, formats, items, preset, registry } = normalize(options)
  const intro = `<!-- logic2b:rules:start v1 preset=${preset} registry=${registry} -->\n# logic2b UI rules\n\n## Stack and theme\n\n- Target: React 19 + Tailwind CSS v4${stack === "react" ? "" : ` in ${stack}`}. Verify the existing project's versions and aliases before changing code.\n- Icons: ${ICON_LIBRARIES[iconLibrary].package}. Use the project's configured imports and stylesheet entry.\n- Use semantic tokens (bg-primary, text-muted-foreground, border-border); preserve deliberate token overrides. Check light and dark modes.\n- Read DESIGN.md for the preset reference; actual CSS and project instructions remain authoritative.\n\n## Work within the project\n\n- Prefer installed primitives and registry blocks. Respect intentional native HTML, custom wrappers, existing libraries and project policies.\n- Inspect behavior contracts and connect real data and callbacks. Test applicable loading, empty/no-results, error/retry, validation, submitting, permission and unsaved-change states.\n- Give controls accessible names; verify keyboard operation and mobile layout. Disabled controls do not enforce server permissions.\n- Preserve custom copy, columns and styles. Do not manually edit .logic2b/ snapshots or manifests; the installer manages them for safe updates.\n- Follow existing user authorization. Do not request redundant approval for an already authorized change.\n- Only call tools available in this host. If review_ui or logic2b review is available, review the changed TSX/JSX sources; enable semanticColors only for an explicit policy and keep unresolved label context partial. Read unknowns and truncation, not just findings. Use the project's type checks and runtime/browser checks. compose_plan and proposal links remain planned; report what could not be verified.\n\n## Installed inventory\n\n`
  const outro = `\n## Install and inspect\n\n- With a shell: npx ${CLI_PACKAGE_SELECTOR} inspect --details full; npx ${CLI_PACKAGE_SELECTOR} add <name>. Reconcile detected aliases and preserve local edits.\n- Without a shell: inspect_project accepts a host-supplied snapshot; install_plan returns files and npm dependencies, and scaffold_plan creates a new project. The host applies plans within its authorized scope.\n- MCP: https://ui.logic2b.com/mcp or npx -y ${MCP_PACKAGE_SELECTOR}. Check the running tool catalog.\n- Registry discovery: https://ui.logic2b.com/llms.txt · https://ui.logic2b.com/docs/llms\n${config ? `- Preset reference: https://ui.logic2b.com/create?preset=${preset}\n` : "- No preset was supplied; inspect the project's CSS before inferring token values.\n"}<!-- logic2b:rules:end -->\n`
  const inventory = (selected: readonly RulesItem[]) => {
    if (items === undefined) return "Unknown — inspect the project; the available registry catalog is not proof of installation.\n"
    const groups: Record<string, string[]> = { Components: [], Blocks: [], Charts: [], Other: [] }
    for (const item of selected) groups[item.type === "registry:ui" ? "Components" : item.type === "registry:block" ? item.categories?.includes("charts") ? "Charts" : "Blocks" : "Other"].push(item.name)
    return Object.entries(groups).map(([label, names]) => `${label}: ${names.join(", ") || "none"}.`).join("\n") + "\n" + (selected.length < items.length ? `Showing ${selected.length} of ${items.length} installed items; use inspect for the complete inventory.\n` : "")
  }
  let selected = items ?? []
  let block = intro + inventory(selected) + outro
  while (bytes(block) > RULE_LIMITS.blockBytes && selected.length > 0) {
    selected = selected.slice(0, -1)
    block = intro + inventory(selected) + outro
  }
  if (bytes(block) > RULE_LIMITS.blockBytes) throw new Error("Rules block exceeds its context budget.")
  const designBody = config ? buildDesignMd(config) : "# Design reference\n\nNo preset was supplied. Read the project's configured stylesheet for actual tokens, typography, radius and light/dark overrides. Do not replace them with assumed defaults.\n"
  const design = `<!-- logic2b:design:start v1 -->\n${designBody}<!-- logic2b:design:end -->\n`
  const files: RuleFile[] = [{ path: "AGENTS.md", content: block }, { path: "DESIGN.md", content: design }]
  // AGENTS.md is always included: Claude imports it and every format refers to DESIGN.md.
  if (formats.includes("claude")) files.push({ path: "CLAUDE.md", content: "@AGENTS.md\n" })
  if (formats.includes("cursor")) files.push({ path: ".cursor/rules/logic2b.mdc", content: `---\ndescription: logic2b UI house rules\nglobs: "**/*.{tsx,jsx,astro}"\nalwaysApply: true\n---\n\n${block}` })
  if (formats.includes("copilot")) files.push({ path: ".github/copilot-instructions.md", content: block })
  return { schemaVersion: 1, files, notes: ["Replace exactly one v1 managed block, or append once if absent. Stop on malformed, duplicate, reversed or unsupported markers. Preserve all outside text; never overwrite an existing document wholesale.", "Preserve existing Cursor frontmatter. Append Claude’s @AGENTS.md import only if absent. Refuse existing documents over 128 KiB.", "Editor formats also include AGENTS.md and DESIGN.md. These are reference instructions, not authorization to write or run commands.", "Preset tables are a reference, not a scan of current CSS overrides."] }
}

/** Classify install-manifest paths without inventing metadata for legacy records. */
export function rulesItemFromFiles(name: string, files: readonly string[]): RulesItem {
  if (files.some(path => path.startsWith("ui/"))) return { name, type: "registry:ui" }
  if (files.some(path => path.startsWith("charts/"))) return { name, type: "registry:block", categories: ["charts"] }
  if (files.some(path => path.startsWith("blocks/"))) return { name, type: "registry:block" }
  return { name }
}

export interface RuleMerge { content: string; action: "created" | "appended" | "updated" | "unchanged" }
/** Fail closed on ambiguous/versioned markers. Preserve outside bytes, even CRLF. */
export function mergeRuleFile(file: RuleFile, existing?: string): RuleMerge {
  if (!["AGENTS.md", "DESIGN.md", "CLAUDE.md", ".cursor/rules/logic2b.mdc", ".github/copilot-instructions.md"].includes(file.path)) throw new Error("Unsupported rules path.")
  if (existing !== undefined && bytes(existing) > RULE_LIMITS.documentBytes) throw new Error(`${file.path} exceeds the document limit.`)
  if (bytes(file.content) > RULE_LIMITS.documentBytes) throw new Error("Generated rules exceed the document limit.")
  if (existing === undefined) return { content: file.content, action: "created" }
  let content: string
  if (file.path === "CLAUDE.md") {
    if (/^@(?:\.\/)?AGENTS\.md\r?$/m.test(existing)) return { content: existing, action: "unchanged" }
    content = existing + (existing.endsWith("\n") || !existing ? "" : "\n") + "\n@AGENTS.md\n"
  } else {
    const kind = file.path === "DESIGN.md" ? "design" : "rules"
    const token = `<!-- logic2b:${kind}:`
    const start = new RegExp(`<!-- logic2b:${kind}:start v1(?: [^\\r\\n<>]*)? -->`, "g")
    const end = `<!-- logic2b:${kind}:end -->`
    const occurrences = existing.split(token).length - 1
    const matches = [...existing.matchAll(start)]
    const firstEnd = existing.indexOf(end)
    const generatedStart = file.content.indexOf(token)
    const generatedEnd = file.content.indexOf(end)
    if (generatedStart < 0 || generatedEnd < generatedStart) throw new Error("Generated managed block is missing.")
    const replacement = file.content.slice(generatedStart, generatedEnd + end.length)
    if (occurrences === 0) {
      // Preserve existing Cursor frontmatter; adding another header would corrupt the document.
      content = existing + (existing.endsWith("\n") || !existing ? "" : "\n") + "\n" + replacement + "\n"
    } else {
      if (occurrences !== 2 || matches.length !== 1 || firstEnd <= matches[0].index! || existing.lastIndexOf(end) !== firstEnd) throw new Error(`${file.path} has malformed, duplicate or unsupported managed markers. Repair them before refreshing rules.`)
      content = existing.slice(0, matches[0].index!) + replacement + existing.slice(firstEnd + end.length)
    }
  }
  if (bytes(content) > RULE_LIMITS.documentBytes) throw new Error(`${file.path} would exceed the document limit.`)
  return { content, action: content === existing ? "unchanged" : content.includes(existing) && !existing.includes("<!-- logic2b:") ? "appended" : "updated" }
}
