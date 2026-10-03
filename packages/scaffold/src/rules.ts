import { ACCENTS, BASE_COLORS, FONTS, RADII, parseCustomKey, resolveTokens, DEFAULT_CONFIG, decodePreset, encodePreset, ICON_LIBRARIES, type IconLibrary, type ThemeConfig } from "@logic2b/tokens"
import { CLI_PACKAGE_SELECTOR, MCP_PACKAGE_SELECTOR } from "./package-selectors.ts"
import { RULES_CATALOG } from "./rules-catalog.ts"
import type { RegistryBehavior } from "./behavior.ts"
export { RULES_CATALOG } from "./rules-catalog.ts"
export const RULES_DEFAULT_CONFIG = DEFAULT_CONFIG

export const RULES_LIMITS = Object.freeze({ managedBytes: 6 * 1024, currentFileBytes: 64 * 1024, currentTotalBytes: 256 * 1024, inventoryItems: 160, formats: 5, toolNames: 64, pathLength: 128 })
export const AGENT_RULE_FORMATS = ["agents", "design", "claude", "cursor", "copilot"] as const
export type AgentRuleFormat = typeof AGENT_RULE_FORMATS[number]
export const AGENT_RULE_STACKS = ["next", "vite", "astro", "react", "unknown"] as const
export type AgentRuleStack = typeof AGENT_RULE_STACKS[number]
export const RULE_FILE_PATHS = { agents: "AGENTS.md", design: "DESIGN.md", claude: "CLAUDE.md", cursor: ".cursor/rules/logic2b.mdc", copilot: ".github/copilot-instructions.md" } as const
export interface RuleInventoryItem { name: string; kind: "component" | "block" | "chart" | "other" }
export interface AgentRulesOptions {
  preset?: string; stack?: AgentRuleStack; iconLibrary?: IconLibrary; formats?: AgentRuleFormat[]
  inventory?: RuleInventoryItem[]; inventoryKind?: "installed" | "available"; registryVersion?: string
  availableTools?: string[]; currentFiles?: Array<{ path: string; content: string }>
}
export type RulePrecondition = { kind: "missing" } | { kind: "sha256"; sha256: string }
export interface AgentRulesPlan { schemaVersion: 1; files: Array<{ path: string; content: string; action: "create" | "update" | "unchanged"; precondition: RulePrecondition }>; notes: string[] }
const encoder = new TextEncoder()
const size = (value: string) => encoder.encode(value).byteLength
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
function fail(message: string): never { throw new Error(message) }
function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T { if (typeof value !== "string" || !(values as readonly string[]).includes(value)) fail(`Unsupported ${label}. Use ${values.join(", ")}.`); return value as T }
function shortString(value: unknown, max: number, label: string): string { if (typeof value !== "string" || !value || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(`${label} must be a nonempty bounded string (at most ${max} characters).`); return value }
function exactVersion(value: string): boolean {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value)
  return !!match && match.slice(1, 4).every((part) => Number.isSafeInteger(Number(part))) && (!match[4] || match[4].split(".").every((part) => !/^\d+$/.test(part) || /^(0|[1-9]\d*)$/.test(part)))
}
export function validateAgentRulesOptions(value: unknown): AgentRulesOptions {
  if (!isRecord(value)) fail("Agent rules options must be an object.")
  if (Object.keys(value).some((key) => !["preset", "stack", "iconLibrary", "formats", "inventory", "inventoryKind", "registryVersion", "availableTools", "currentFiles"].includes(key))) fail("Agent rules options contain unsupported fields.")
  const result: AgentRulesOptions = {}
  if (value.preset !== undefined) { const preset = shortString(value.preset, 256, "Preset"); if (!decodePreset(preset)) fail("Invalid logic2b preset. Supply a supported canonical preset id."); result.preset = preset }
  if (value.stack !== undefined) result.stack = enumValue(value.stack, AGENT_RULE_STACKS, "stack")
  if (value.iconLibrary !== undefined) result.iconLibrary = enumValue(value.iconLibrary, Object.keys(ICON_LIBRARIES) as IconLibrary[], "icon library")
  if (result.preset && result.iconLibrary && decodePreset(result.preset)!.iconLibrary !== result.iconLibrary) fail("Preset and iconLibrary conflict. Supply one consistent selection.")
  if (value.formats !== undefined) {
    if (!Array.isArray(value.formats) || !value.formats.length || value.formats.length > RULES_LIMITS.formats) fail("Choose one to five agent rule formats.")
    result.formats = value.formats.map((entry) => enumValue(entry, AGENT_RULE_FORMATS, "format"))
    if (new Set(result.formats).size !== result.formats.length) fail("Rule formats cannot be duplicated.")
  }
  if (value.inventory !== undefined) {
    if (!Array.isArray(value.inventory) || value.inventory.length > RULES_LIMITS.inventoryItems) fail("Agent rules inventory exceeds 160 items.")
    result.inventory = value.inventory.map((entry): RuleInventoryItem => {
      if (!isRecord(entry) || Object.keys(entry).some((key) => key !== "name" && key !== "kind")) fail("Inventory entries need only a name and kind.")
      const name = shortString(entry.name, 128, "Inventory name")
      if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) fail("Inventory names must be bounded registry names.")
      return { name, kind: enumValue(entry.kind, ["component", "block", "chart", "other"], "inventory kind") }
    }).sort((a, b) => a.name.localeCompare(b.name))
    if (new Set(result.inventory.map((entry) => entry.name)).size !== result.inventory.length) fail("Inventory names cannot be duplicated.")
  }
  if (value.inventoryKind !== undefined) result.inventoryKind = enumValue(value.inventoryKind, ["installed", "available"] as const, "inventory scope")
  if (value.registryVersion !== undefined) { const version = shortString(value.registryVersion, 64, "Registry version"); if (!exactVersion(version)) fail("Rules registryVersion must be one exact resolved version."); result.registryVersion = version }
  if (value.availableTools !== undefined) {
    if (!Array.isArray(value.availableTools) || value.availableTools.length > RULES_LIMITS.toolNames) fail("Tool availability exceeds 64 entries.")
    result.availableTools = value.availableTools.map((entry) => { const name = shortString(entry, 64, "Tool identifier"); if (!/^[a-zA-Z][a-zA-Z0-9_.:-]*$/.test(name)) fail("Tool identifiers contain unsupported characters."); return name }).sort()
    if (new Set(result.availableTools).size !== result.availableTools.length) fail("Tool identifiers cannot be duplicated.")
  }
  if (value.currentFiles !== undefined) {
    if (!Array.isArray(value.currentFiles) || value.currentFiles.length > RULES_LIMITS.formats) fail("Current rule files exceed five entries.")
    let total = 0
    result.currentFiles = value.currentFiles.map((entry) => {
      if (!isRecord(entry) || Object.keys(entry).some((key) => key !== "path" && key !== "content")) fail("Current rule files need only path and content.")
      const path = shortString(entry.path, RULES_LIMITS.pathLength, "Rule file path")
      if (!(Object.values(RULE_FILE_PATHS) as readonly string[]).includes(path)) fail("Rule file path is unsupported; use only the fixed editor targets.")
      if (typeof entry.content !== "string") fail("Current rule content must be a string.")
      const bytes = size(entry.content); total += bytes
      if (bytes > RULES_LIMITS.currentFileBytes || total > RULES_LIMITS.currentTotalBytes) fail("Current rule content exceeds 64 KiB per file or 256 KiB total.")
      return { path, content: entry.content }
    })
    if (new Set(result.currentFiles.map((entry) => entry.path)).size !== result.currentFiles.length) fail("Current rule file paths cannot be duplicated.")
  }
  return result
}
export async function hashRuleContent(content: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(content))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
export async function validateRulePrecondition(content: string | undefined, precondition: RulePrecondition): Promise<void> {
  if (precondition.kind === "missing") { if (content !== undefined) fail("Rule file appeared after planning; inspect again before writing.") }
  else if (precondition.kind !== "sha256" || !/^[a-f0-9]{64}$/.test(precondition.sha256) || content === undefined || await hashRuleContent(content) !== precondition.sha256) fail("Rule file changed after planning; inspect again before writing.")
}
function markdownFences(content: string): { ranges: Array<{ start: number; end: number }>; unclosed: boolean } {
  const ranges: Array<{ start: number; end: number }> = []
  let fence: { character: string; length: number; start: number } | undefined
  for (const line of content.matchAll(/[^\n]*(?:\n|$)/g)) {
    if (!line[0]) break
    const text = line[0].replace(/\r?\n$/, "")
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line.index === 0 ? text.replace(/^\ufeff/, "") : text)
    if (!marker) continue
    if (!fence) fence = { character: marker[1][0], length: marker[1].length, start: line.index! }
    else if (marker[1][0] === fence.character && marker[1].length >= fence.length && !marker[2].trim()) {
      ranges.push({ start: fence.start, end: line.index! + line[0].length }); fence = undefined
    }
  }
  if (fence) ranges.push({ start: fence.start, end: content.length })
  return { ranges, unclosed: !!fence }
}
const inFence = (index: number, ranges: Array<{ start: number; end: number }>) => ranges.some((range) => index >= range.start && index < range.end)
function standaloneMarker(content: string, index: number, length: number): boolean {
  const before = content.slice(content.lastIndexOf("\n", index - 1) + 1, index)
  const nextLine = content.indexOf("\n", index + length)
  const after = content.slice(index + length, nextLine === -1 ? content.length : nextLine)
  return (before === "" || (index === 1 && before === "\ufeff")) && (after === "" || after === "\r")
}
/** Replace only a complete known-version managed region. Other bytes are untouched. */
export function mergeManagedRules(existing: string | undefined, block: string, kind: "rules" | "design" = "rules"): { content: string; status: "created" | "appended" | "updated" | "unchanged" } {
  const prefix = `<!-- logic2b:${kind}:start`, suffix = `<!-- logic2b:${kind}:end -->`
  if (!block.startsWith(`${prefix} v1 `) || !block.endsWith(suffix)) fail("Managed block must use the complete version 1 markers.")
  if (kind === "rules" && size(block) > RULES_LIMITS.managedBytes) fail("Managed rules exceed the 6 KiB budget; reduce inventory/tool context.")
  if (existing === undefined) return { content: `${block}\n`, status: "created" }
  if (size(existing) > RULES_LIMITS.currentFileBytes) fail("Current rule file exceeds 64 KiB.")
  const starts = [...existing.matchAll(new RegExp(`<!-- logic2b:${kind}:start`, "g"))], ends = [...existing.matchAll(new RegExp(`<!-- logic2b:${kind}:end`, "g"))]
  const fences = markdownFences(existing)
  if ([...starts, ...ends].some((marker) => inFence(marker.index!, fences.ranges))) fail("Managed markers inside a code fence are examples, not writable regions. Move or remove the marker example before generating rules.")
  if (!starts.length && !ends.length) {
    if (fences.unclosed) fail("Close the instruction file's code fence before appending managed rules.")
    const separator = existing.length ? existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n" : ""
    return { content: `${existing}${separator}${block}\n`, status: "appended" }
  }
  if (starts.length !== 1 || ends.length !== 1 || starts[0].index! >= ends[0].index!) fail("Malformed or duplicate logic2b markers. Repair the managed region without discarding project instructions.")
  const start = starts[0].index!, endStart = ends[0].index!, openEnd = existing.indexOf("-->", start)
  const opening = existing.slice(start, openEnd + 3)
  if (!/^<!-- logic2b:(rules|design):start v1 preset=[A-Za-z0-9._-]+ registry=[A-Za-z0-9.+_-]+ -->$/.test(opening) || !existing.startsWith(suffix, endStart)) fail("Unsupported or malformed logic2b marker version. Keep project instructions and use a version 1 managed region.")
  if (!standaloneMarker(existing, start, opening.length) || !standaloneMarker(existing, endStart, suffix.length)) fail("Managed markers must occupy their own unindented lines; quoted, indented or inline examples cannot be replaced.")
  const content = existing.slice(0, start) + block + existing.slice(endStart + suffix.length)
  return { content, status: content === existing ? "unchanged" : "updated" }
}
function rulesBlock(options: AgentRulesOptions, cfg: ThemeConfig): string {
  const preset = options.preset ? encodePreset(cfg) : "unknown", registry = options.registryVersion ?? "unknown"
  const scope = options.inventoryKind ?? (options.inventory === undefined ? "available" : "installed")
  const inventory = options.inventory ?? (scope === "installed" ? [] : [...RULES_CATALOG])
  const names = (kind: RuleInventoryItem["kind"]) => inventory.filter((item) => item.kind === kind).map((item) => `\`${item.name}\``).join(" · ") || "none recorded"
  const available = new Set(options.availableTools ?? [])
  const inspection = available.has("cli:inspect") ? "With a local shell, run `logic2b inspect --json` and request selected/detail hashes before edits." : available.has("inspect_project") ? "Use `inspect_project` with host-supplied bounded metadata; it cannot read a remote filesystem." : "Read bounded package/TS/components configuration and installed manifest metadata with the host's read tools."
  const review = available.has("review_ui") ? "Run the host's advertised `review_ui` and resolve proven defects; preserve intentional wrappers/native controls and report unknowns." : "Static review/proposal tools are not assumed available. Use project type/build checks and inspect changed source; report unrun checks."
  const proposal = available.has("compose_plan") ? "Use the host's advertised `compose_plan` for structured requirements when composing screens." : ""
  const preview = available.has("proposal_link") ? "Use the advertised `proposal_link` for an inspectable screen proposal; existing authorization still governs writes." : ""
  const install = available.has("install_plan") ? "Without a shell, use `install_plan`; its default layout needs explicit adaptation to confirmed custom aliases. The host applies writes/dependencies." : "Without a shell, discover the MCP catalog first and use `install_plan` only if advertised; otherwise obtain the verified registry source through supported host tools."
  const scaffold = available.has("scaffold_plan") ? "Use the advertised `scaffold_plan` only for a genuinely empty target." : "Use template initialization only for a genuinely empty target and after confirming the host's supported commands."
  return `<!-- logic2b:rules:start v1 preset=${preset} registry=${registry} -->
## logic2b UI rules

Registry components target React 19 and Tailwind CSS v4; confirm app compatibility before changing dependencies. Stack: ${options.stack ?? "unknown"}. Icons: ${ICON_LIBRARIES[cfg.iconLibrary].package} (${options.iconLibrary || options.preset ? "selected" : "registry default; confirm project choice"}).
Theme colors use semantic tokens in :root/.dark. Preserve the actual stylesheet entry, light/dark modes and local token overrides. DESIGN.md is the separate token reference${options.preset ? " for the selected preset" : " for registry defaults, not an inferred project theme"}.

### Existing project first
${inspection}
Resolve aliases to physical paths, select the application root in a workspace and compare current/base hashes. Unknown configuration is not a safe default. A missing manifest does not mean an empty app. Reuse installed primitives, native controls and custom wrappers; preserve public APIs, copy, columns and intentional local edits. Do not manually rewrite .logic2b records/bases; the CLI owns them.

### Interface responsibilities
Read each item's props, accessibility/behavior metadata and consumer duties. Keep controlled data/actions. Implement applicable loading, empty, error/retry, success, submitting and permission states; retain input through failures and guard unsaved dismissal. Use accessible names, labels, keyboard/focus behavior, mobile layouts and reachable actions. Wire persistence and server authorization in the application.

### ${scope === "installed" ? "Recorded installed inventory (verify source)" : "Available source catalog (not installed inventory)"}
Components: ${names("component")}
Blocks: ${names("block")}
Charts: ${names("chart")}
Other: ${names("other")}

### Install and verify
With a shell, confirm CLI help/version then use \`npx ${CLI_PACKAGE_SELECTOR} add <name>\` only when its path mapping matches the app. ${install}
${scaffold} Inspect planned paths, dependencies and existing-file preconditions before applying; do not request redundant approval for an already authorized change.
${review}${proposal ? `\n${proposal}` : ""}${preview ? `\n${preview}` : ""}
Run applicable project tests/type/build, keyboard/mobile/state checks and available contrast/theme checks. Verify both light/dark modes. Do not claim unrun CI/browser checks passed.

Docs: https://ui.logic2b.com/llms.txt · https://ui.logic2b.com/docs/llms${options.preset ? ` · https://ui.logic2b.com/create?preset=${encodePreset(cfg)}` : ""}
<!-- logic2b:rules:end -->`
}
function hasClaudeImport(content: string): boolean {
  const fences = markdownFences(content)
  for (const line of content.matchAll(/^(\ufeff)?@AGENTS\.md\r?$/gm)) if ((!line[1] || line.index === 0) && !inFence(line.index!, fences.ranges)) return true
  if (fences.unclosed) fail("CLAUDE.md has an unclosed code fence; close it before adding the AGENTS import.")
  return false
}
export async function buildAgentRulesPlan(value: AgentRulesOptions = {}): Promise<AgentRulesPlan> {
  const options = validateAgentRulesOptions(value)
  const cfg: ThemeConfig = options.preset ? decodePreset(options.preset)! : { ...DEFAULT_CONFIG, ...(options.iconLibrary ? { iconLibrary: options.iconLibrary } : {}) }
  const formats = new Set(options.formats ?? ["agents", "design"])
  formats.add("design"); if (formats.has("claude")) formats.add("agents")
  const current = new Map(options.currentFiles?.map((file) => [file.path, file.content]))
  const rules = [...formats].some((format) => format !== "design") ? rulesBlock(options, cfg) : ""
  if (size(rules) > RULES_LIMITS.managedBytes) fail("Managed rules exceed the 6 KiB budget; reduce inventory/tool context.")
  const design = `<!-- logic2b:design:start v1 preset=${options.preset ? encodePreset(cfg) : "unknown"} registry=${options.registryVersion ?? "unknown"} -->\n${options.preset ? "" : "Reference defaults; these tokens do not prove the consuming project's active theme.\n\n"}${buildDesignMd(cfg).trimEnd()}\n<!-- logic2b:design:end -->`
  const files: AgentRulesPlan["files"] = [], notes: string[] = []
  for (const format of AGENT_RULE_FORMATS) {
    if (!formats.has(format)) continue
    const path = RULE_FILE_PATHS[format], existing = current.get(path)
    let content: string, status: string
    if (format === "claude") {
      if (existing !== undefined && hasClaudeImport(existing)) { content = existing; status = "unchanged" }
      else { content = `${existing ?? ""}${existing && !existing.endsWith("\n") ? "\n" : ""}@AGENTS.md\n`; status = existing === undefined ? "created" : "appended" }
    } else {
      const merged = mergeManagedRules(existing, format === "design" ? design : rules, format === "design" ? "design" : "rules")
      content = merged.content; status = merged.status
      if (format === "cursor" && existing === undefined) content = `---\ndescription: logic2b UI conventions\nglobs: "**/*.{tsx,jsx,astro}"\nalwaysApply: true\n---\n\n${content}`
      if (format === "copilot" && existing === undefined) content = `# Repository instructions\n\n${content}`
    }
    if (size(content) > RULES_LIMITS.currentFileBytes) fail("Resulting rule file exceeds 64 KiB; keep project instructions in smaller files.")
    files.push({ path, content, action: existing === undefined ? "create" : content === existing ? "unchanged" : "update", precondition: existing === undefined ? { kind: "missing" } : { kind: "sha256", sha256: await hashRuleContent(existing) } })
    notes.push(`${path}: ${status}; project content outside the managed region is preserved.`)
  }
  notes.push("Apply only after checking every missing/SHA-256 precondition; capability and authorization belong to the host.")
  return { schemaVersion: 1, files, notes }
}
const preconditionSchema = { oneOf: [{ type: "object", additionalProperties: false, required: ["kind"], properties: { kind: { const: "missing" } } }, { type: "object", additionalProperties: false, required: ["kind", "sha256"], properties: { kind: { const: "sha256" }, sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } } }] }
export const RULES_INPUT_SCHEMA = { type: "object", additionalProperties: false, properties: {
  preset: { type: "string", maxLength: 256 }, stack: { type: "string", enum: AGENT_RULE_STACKS }, iconLibrary: { type: "string", enum: Object.keys(ICON_LIBRARIES) }, formats: { type: "array", minItems: 1, maxItems: 5, uniqueItems: true, items: { enum: AGENT_RULE_FORMATS } }, inventoryKind: { enum: ["installed", "available"] }, registryVersion: { type: "string", maxLength: 64 },
  inventory: { type: "array", maxItems: 160, items: { type: "object", additionalProperties: false, required: ["name", "kind"], properties: { name: { type: "string", maxLength: 128, pattern: "^[a-z0-9][a-z0-9-]*$" }, kind: { enum: ["component", "block", "chart", "other"] } } } }, availableTools: { type: "array", maxItems: 64, uniqueItems: true, items: { type: "string", maxLength: 64 } }, currentFiles: { type: "array", maxItems: 5, items: { type: "object", additionalProperties: false, required: ["path", "content"], properties: { path: { enum: Object.values(RULE_FILE_PATHS) }, content: { type: "string", maxLength: 65536 } } } },
} } as const
export const RULES_PLAN_SCHEMA = { type: "object", additionalProperties: false, required: ["schemaVersion", "files", "notes"], properties: { schemaVersion: { const: 1 }, files: { type: "array", minItems: 1, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["path", "content", "action", "precondition"], properties: { path: { enum: Object.values(RULE_FILE_PATHS) }, content: { type: "string", maxLength: 65536 }, action: { enum: ["create", "update", "unchanged"] }, precondition: preconditionSchema } } }, notes: { type: "array", maxItems: 6, items: { type: "string" } } } } as const


export const PROJECT_CONTEXT_GUIDANCE = `## Read project context before writes

Read the app's \`package.json\`, \`tsconfig.json\` or \`jsconfig.json\` (including
local extends/references), \`components.json\` and \`.logic2b/manifest.json\` when
present. For a workspace, select the application root first. Treat configuration
as data; do not execute it or read environment files.

Confirm declared framework/React/Tailwind versions, import aliases and their
physical destinations, the stylesheet entry and icon library. Use the confirmed
\`components.json\` aliases for UI, components, hooks, lib and utils destinations.
Default \`@/components\` examples describe fresh scaffolds; they do not establish
this app's layout. Use the CLI only when its path mapping matches these confirmed
destinations; otherwise map registry payloads to the confirmed paths manually.

Inspect installed source and the manifest's item versions and file inventory;
compare retained \`.logic2b/base/\` snapshots before changing tracked files.
A missing manifest does not mean the app has no UI. Preserve custom wrappers,
native HTML controls, public APIs, local edits and unrelated styles/token overrides.
If aliases, versions, stylesheet paths or installed-file evidence are missing or
conflicting, record those unknowns and obtain the needed context before writes.
`


export function buildDesignMd(cfg: ThemeConfig): string {
  const radius = RADII[cfg.radius] ?? RADII.default
  const font = FONTS[cfg.font] ?? FONTS.sans
  const heading = FONTS[cfg.heading] ?? FONTS.sans
  const iconLibrary = ICON_LIBRARIES[cfg.iconLibrary] ?? ICON_LIBRARIES.lucide
  const light = resolveTokens(cfg, "light")
  const dark = resolveTokens(cfg, "dark")
  const preset = encodePreset(cfg)
  const tokenRows = Object.keys(light.tokens)
    .map((k) => `| \`--${k}\` | \`${light.tokens[k]}\` | \`${dark.tokens[k]}\` |`)
    .join("\n")
  const chartRows = light.chart
    .map((c, i) => `| \`--chart-${i + 1}\` | \`${c}\` | \`${dark.chart[i]}\` |`)
    .join("\n")
  const baseLabel = BASE_COLORS[cfg.base]?.label ?? cfg.base
  const custom = parseCustomKey(cfg.theme)
  const accentLabel =
    ACCENTS[cfg.theme]?.label ??
    (custom ? `Custom (hue ${custom.hue}, chroma ${custom.chroma})` : cfg.theme)
  return `# Design Tokens — Style Reference
> generated with logic2b ui · preset \`${preset}\`

**Theme:** light + dark (toggled with the \`dark\` class on \`<html>\`)
**Base:** ${baseLabel} · **Accent:** ${accentLabel} · **Radius:** ${radius}
**Icons:** ${iconLibrary.label} (\`${iconLibrary.package}\`)

All colors are oklch CSS variables consumed through semantic utilities
(\`bg-primary\`, \`text-muted-foreground\`, \`border-border\`, …). Components
never hardcode colors — restyle everything by editing the tokens.

## Tokens — Semantic colors

| Token | Light | Dark |
|-------|-------|------|
${tokenRows}

## Tokens — Charts

| Token | Light | Dark |
|-------|-------|------|
${chartRows}

## Typography

- **Body (\`--font-sans\`):** ${font}
- **Headings (\`--font-heading\`):** ${heading}

## Shape

- **\`--radius\`:** ${radius} — every component derives its corner rounding
  (sm/md/lg/xl) from this single variable.

## Do

- Route every color through the semantic tokens above.
- Keep both modes first-class: check light and dark for every change.
- Use \`--font-heading\` for h1–h4 and \`--font-sans\` for body and UI text.

## Don't

- Don't hardcode hex/oklch values in components.
- Don't introduce accent colors beyond \`--primary\` and the chart ramp.
- Don't use heavy box-shadows for depth — prefer borders and surface steps.

## Install

\`\`\`bash
npx ${CLI_PACKAGE_SELECTOR} init --preset ${preset}
\`\`\`

Running \`init\` writes \`components.json\` and the CSS for these exact tokens
into your global stylesheet.
`
}


const SITE = "https://ui.logic2b.com"

export interface RuleCatalogEntry {
  name: string
  type: string
  categories?: string[]
}

function inventory(items: readonly RuleCatalogEntry[]) {
  const components = items.filter((i) => i.type === "registry:ui").map((i) => i.name)
  const blocks = items
    .filter((i) => i.type === "registry:block" && !i.categories?.includes("charts"))
    .map((i) => i.name)
  const charts = items
    .filter((i) => i.type === "registry:block" && i.categories?.includes("charts"))
    .map((i) => i.name)
  return { components, blocks, charts }
}

function wrapList(names: string[]): string {
  // One flowing paragraph of names — compact enough to keep in agent context.
  return names.map((n) => `\`${n}\``).join(" · ")
}

function behaviorRules(behaviors: Readonly<Record<string, RegistryBehavior>>): string {
  const blocks = Object.entries(behaviors)
  if (blocks.length === 0) return ""
  return `## Customer journey behavior

The following blocks ship a \`behavior\` contract. Read it with the installed
source, preserve controlled inputs and local content customizations, and wire
the callbacks to the consuming application's data and authorization rules.
Only these blocks have this declared state coverage.

${blocks.map(([name, behavior]) => `### \`${name}\`

Built-in states: ${Object.entries(behavior.states).filter(([, state]) => state.support === "built-in").map(([state]) => `\`${state}\``).join(", ")}.
${Object.entries(behavior.states).filter(([, state]) => state.support === "consumer").map(([state, contract]) => `- Consumer state \`${state}\`: ${contract.how}`).join("\n")}
${behavior.actions.flatMap((action) => action.consumer.map((duty) => `- ${action.name} (\`${action.props.join("\`, \`")}\`): ${duty}`)).join("\n")}
${behavior.consumer.map((duty) => `- ${duty}`).join("\n")}

Copy lives in the exported content object; customize it through the content prop.
${behavior.responsive.strategy} Check keyboard operation, failure/retry,
preserved input and every applicable state at mobile and desktop sizes.
`).join("\n")}
`
}

export function buildStudioAgentsMd(cfg: ThemeConfig, catalog: readonly RuleCatalogEntry[], behaviors: Readonly<Record<string, RegistryBehavior>> = {}): string {
  const preset = encodePreset(cfg)
  const { components, blocks, charts } = inventory(catalog)
  const radius = RADII[cfg.radius] ?? RADII.default
  const font = FONTS[cfg.font] ?? FONTS.sans
  const heading = FONTS[cfg.heading] ?? FONTS.sans
  const iconPackage = ICON_LIBRARIES[cfg.iconLibrary]?.package ?? ICON_LIBRARIES.lucide.package

  return `# AGENTS.md — UI house rules
> generated with logic2b ui · preset \`${preset}\`

This project's interface is built on the logic2b ui design system
(${SITE}): a shadcn-compatible component registry restyled entirely
through CSS tokens. Follow these rules for any work that touches the UI.

${PROJECT_CONTEXT_GUIDANCE}

## Stack contract

- Registry components target React 19 + Tailwind CSS v4. Confirm compatibility
  with the app's declared versions before changing dependencies.
  Icons come from ${iconPackage}.
- Find the theme through the confirmed stylesheet entry and imports.
  Its token blocks are \`:root\` (light) and
  \`.dark\` (dark). Dark mode toggles with the \`dark\` class on \`<html>\`.
- Code layout follows confirmed \`components.json\` aliases and physical paths.
  Fresh scaffolds commonly use \`@/components/ui\`, \`@/components\` and
  \`@/lib/utils\`; preserve an existing app's custom destinations.

## Reuse existing UI and registry components

Read the installed source before choosing an implementation. Reuse existing
components, wrappers and native controls when they meet the requirement. If a
compatible registry item is missing, install it at the confirmed destinations:

- CLI: \`npx ${CLI_PACKAGE_SELECTOR} add <name>\` (resolves registry dependencies).
- No shell? Use the MCP endpoint \`${SITE}/mcp\` — the \`install_plan\` tool
  returns the exact files to write and npm deps to add${cfg.iconLibrary === "lucide" ? " — or fetch the raw registry payload directly" : `; pass \`iconLibrary: "${cfg.iconLibrary}"\` so its canonical Lucide sources are rewritten`}.

The following catalog lists available registry items, not this app's installed
inventory. Confirm installed items from the manifest and actual source.

Available primitives (${components.length}):
${wrapList(components)}

Blocks (${blocks.length}):
${wrapList(blocks)}

Charts (${charts.length}):
${wrapList(charts)}

Also install rather than reimplement: new UI libraries (MUI, Chakra, Ant,
DaisyUI…) are off-limits — they fight the token system.

## Theme rules

- Colors go through semantic utilities only: \`bg-primary\`,
  \`text-muted-foreground\`, \`border-border\`, \`bg-card\`… Never raw palette
  classes (\`bg-blue-500\`), never hex/oklch literals in components.
- The accent is \`--primary\`. Beyond it, color belongs only to the chart
  ramp (\`--chart-1\`…\`--chart-5\`) and the destructive state.
- Radius derives from \`--radius\` (currently ${radius}) via \`rounded-sm\` to
  \`rounded-xl\` — don't invent arbitrary radii.
- Type: \`--font-sans\` (${font.split(",")[0].replace(/'/g, "")}) for body and UI,
  \`--font-heading\` (${heading.split(",")[0].replace(/'/g, "")}) for h1–h4.
- Depth comes from borders and surface steps (\`bg-card\`, \`bg-muted\`), not
  box-shadows.
- Every change must hold in **both modes** — check light and dark.
- Requested re-theming can regenerate tokens from a preset
  (\`npx ${CLI_PACKAGE_SELECTOR} init --preset ${preset}\` or the MCP \`apply_preset\`
  tool). Confirm the target stylesheet and review the token diff first;
  preserve unrelated styles and local overrides outside the requested change.

## Component conventions

- One file per component; variants via \`class-variance-authority\` with the
  variants object exported (e.g. \`buttonVariants\`).
- Merge classes with \`cn()\`; every component root carries a \`data-slot\`
  attribute — use it for reliable selection in tests and styles.
- Extend by composition (wrap, pass \`className\`) instead of editing
  installed \`ui/*\` internals; if you must fork one, keep its public API.
- Preserve installed controlled forms and native HTML controls along with
  their behavior contracts. Use react-hook-form + zod through the \`form\`
  component when the application's form requirements need them.
- Charts use Recharts through the \`chart\` component so series colors bind
  to the \`--chart-*\` tokens.

${behaviorRules(behaviors)}
## Verify before finishing

1. TypeScript compiles and the app renders with zero console errors.
2. The change looks right in light **and** dark mode.
3. No raw palette classes or color literals slipped into changed files.

## Machine-readable registry

- Index: ${SITE}/r/index.json · item payloads: ${SITE}/r/<name>.json
- Docs for agents: ${SITE}/llms.txt (full: ${SITE}/llms-full.txt)
- MCP: \`${SITE}/mcp\` (remote, streamable HTTP) or \`npx -y ${MCP_PACKAGE_SELECTOR}\` (stdio).
`
}
