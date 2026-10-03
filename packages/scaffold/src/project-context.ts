import { decodePreset, ICON_LIBRARIES } from "@logic2b/tokens"

/** Public limits apply before selective extraction; metadata is untrusted data. */
export const PROJECT_LIMITS = Object.freeze({ configBytes: 128 * 1024, inventoryEntries: 1000, paths: 256, configEntries: 32, compactBytes: 16 * 1024, detailBytes: 512 * 1024, fileBytes: 1024 * 1024, totalFileBytes: 4 * 1024 * 1024 })
export type ProjectConfigKind = "package" | "tsconfig" | "components" | "manifest" | "workspace"
export interface ProjectConfig { path: string; kind: ProjectConfigKind; data: Record<string, unknown> }
export interface ProjectCapabilities { fileWrites: boolean; dependencyInstall: boolean; browser: boolean }
export interface ProjectFile { path: string; sha256?: string; baselineSha256?: string; missing?: true }
export interface ProjectSnapshotV1 { schemaVersion: 1; configs: ProjectConfig[]; capabilities: ProjectCapabilities; directories?: string[]; files?: ProjectFile[]; notices?: string[] }
export interface ObservedProjectFile { path: string; sha256: string; baselineSha256?: string; modified?: boolean }
export interface ProjectContextV1 {
  schemaVersion: 1
  framework: { name: "next" | "vite" | "astro" | "unknown"; version?: string }
  reactVersion?: string; tailwindVersion?: string; sourceRoot?: string
  aliases: Record<string, string[]>; stylesheets: string[]
  locations: Partial<Record<"components" | "ui" | "utils" | "hooks" | "lib" | "theme", string>>
  iconLibrary?: string; preset?: string; registryVersion?: string
  installed: Array<{ name: string; version?: string; integrity?: string; files: Array<{ path: string; sha256: string; modified?: boolean }> }>
  observedFiles: ObservedProjectFile[]
  capabilities: ProjectCapabilities
  evidence: Array<{ field: string; source: string; confidence: "known" | "inferred" }>
  unknowns: string[]
}
export interface ProjectInspection { schemaVersion: 1; summary: {
  framework: ProjectContextV1["framework"]; reactVersion?: string; tailwindVersion?: string; sourceRoot?: string
  locations: ProjectContextV1["locations"]; aliasPatterns: string[]; stylesheets: string[]
  iconLibrary?: string; preset?: string; registryVersion?: string; capabilities: ProjectCapabilities
  inventory: { items: number; recordedFiles: number; inspectedFiles: number; modifiedFiles: number; missingFiles: number; unknownFiles: number }
  configFiles: number; unknowns: string[]; unknownCount: number
}; context?: ProjectContextV1 }

export const PROJECT_NOTICES = ["Unsupported workspace pattern; select an explicit app root."] as const
const encoder = new TextEncoder()
const bytes = (value: unknown) => encoder.encode(JSON.stringify(value)).byteLength
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
function fail(message: string): never { throw new Error(message) }
function record(value: unknown, label: string): Record<string, unknown> { if (!object(value)) fail(`${label} must be a JSON object.`); return value }
function keys(value: Record<string, unknown>, allowed: string[], label: string) { if (Object.keys(value).some((key) => !allowed.includes(key))) fail(`${label} contains unsupported fields. Supply configuration metadata, never source or credentials.`) }
function list(value: unknown, limit: number, label: string): unknown[] { if (!Array.isArray(value) || value.length > limit) fail(`${label} must be an array with at most ${limit} entries.`); return value }
function boundedString(value: unknown, limit: number, label: string): string { if (typeof value !== "string" || !value || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) fail(`${label} must be a nonempty string of at most ${limit} characters.`); return value }

/** Paths crossing the public boundary are portable, bounded and root-relative. */
export function normalizeProjectPath(value: unknown, allowRoot = false): string {
  let path = boundedString(value, PROJECT_LIMITS.paths, "Project path")
  if (path.startsWith("/") || path.includes("\\") || /^[a-z]:/i.test(path) || path.includes(":")) fail("Project paths must be relative to the selected root; absolute paths are unsupported.")
  while (path.startsWith("./")) path = path.slice(2)
  if (path === "." && allowRoot) return path
  const segments = path.split("/")
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) fail("Project paths cannot contain traversal or empty segments.")
  if (segments.some((segment) => /^(node_modules|\.git|\.env(?:\..*)?|\.next|dist|\.astro)$/i.test(segment))) fail("Dependency, build, credential and environment paths cannot be inspected.")
  return segments.join("/")
}
/** Configuration-relative paths may use .. only when the result stays inside root. */
export function resolveProjectConfigPath(origin: string, target: string): string {
  if (!target || target.startsWith("/") || /[\\:\u0000-\u001f]/.test(target)) fail("Configuration target must stay inside the selected project root.")
  const segments = origin === "." ? [] : origin.split("/")
  for (const segment of target.split("/")) {
    if (!segment || segment === ".") continue
    if (segment === "..") { if (!segments.length) fail("Configuration target escapes the selected project root."); segments.pop() }
    else segments.push(segment)
  }
  return normalizeProjectPath(segments.join("/") || ".", true)
}
const dirname = (path: string) => path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "."
const dependencies = ["next", "vite", "astro", "react", "tailwindcss", "lucide-react", "@tabler/icons-react", "@phosphor-icons/react", "@hugeicons/react", "@astrojs/react"]
function selectedStrings(value: unknown, names?: string[]): Record<string, string> {
  if (value === undefined) return {}
  const source = record(value, "Configuration map")
  const result: Record<string, string> = Object.create(null)
  for (const key of Object.keys(source).sort()) if (!names || names.includes(key)) result[boundedString(key, 128, "Configuration key")] = boundedString(source[key], 256, "Configuration value")
  return result
}
/** Bounded common npm range subset. Unsupported declarations remain unknown. */
function versionAtom(value: string, exact = false): boolean {
  const match = /^v?([0-9xX*]+(?:\.[0-9xX*]+){0,2})(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value)
  if (!match) return false
  const parts = match[1].split(".")
  if (parts.some((part) => !/^(0|[1-9][0-9]*|[xX*])$/.test(part) || (/^\d+$/.test(part) && !Number.isSafeInteger(Number(part))))) return false
  if ((exact || match[2] || match[3]) && (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part)))) return false
  if (match[2]?.split(".").some((part) => /^0[0-9]+$/.test(part))) return false
  return true
}
function version(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 64 || /[\u0000-\u001f]/.test(value)) return undefined
  const valid = value.split("||").every((alternative) => {
    const part = alternative.trim().replace(/([~^]|[<>]=?|=)\s+(?=[v0-9xX*])/g, "$1")
    if (!part) return false
    const hyphen = part.split(" - ")
    if (hyphen.length === 2) return hyphen.every((atom) => versionAtom(atom))
    if (hyphen.length > 2) return false
    return part.split(/\s+/).every((atom) => versionAtom(atom.replace(/^(?:[~^]|[<>]=?|=)/, "")))
  })
  return valid ? value : undefined
}
function registryVersion(value: unknown): string | undefined { return version(value) ?? (typeof value === "string" && value !== "unknown" && value.length <= 64 && /^[a-z][a-z0-9-]*$/.test(value) ? value : undefined) }
function configTarget(value: unknown, label: string): string {
  const target = boundedString(value, 256, label)
  if (target.startsWith("/") || /[\\:]/.test(target)) fail(`${label} must be a relative path or supported package identifier; absolute paths and URLs are unsupported.`)
  return target
}
function pathList(value: unknown, label: string, max = 32): string[] { return list(value, max, label).map((entry) => boundedString(entry, 256, label)) }
function workspacePath(value: string): string {
  const path = value.startsWith("!") ? value.slice(1) : value
  normalizeProjectPath(path)
  return value
}
function sanitizeConfig(kind: ProjectConfigKind, input: unknown): Record<string, unknown> {
  const data = record(input, "Configuration data")
  if (kind === "package") {
    const result: Record<string, unknown> = {}
    for (const key of ["dependencies", "devDependencies", "peerDependencies"]) if (data[key] !== undefined) {
      const selected = selectedStrings(data[key], dependencies)
      // Never forward file:, URL, workspace or private package versions.
      result[key] = Object.fromEntries(Object.entries(selected).map(([name, value]) => [name, version(value) ?? "unknown"]))
    }
    if (data.workspaces !== undefined) {
      const workspaces = object(data.workspaces) ? data.workspaces.packages : data.workspaces
      result.workspaces = pathList(workspaces, "Workspace packages", 32).map(workspacePath)
    }
    return result
  }
  if (kind === "workspace") return { packages: pathList(data.packages ?? [], "Workspace packages", 32).map(workspacePath) }
  if (kind === "tsconfig") {
    const result: Record<string, unknown> = {}
    if (data.extends !== undefined) result.extends = Array.isArray(data.extends) ? pathList(data.extends, "Configuration extends", 4).map((target) => configTarget(target, "Configuration extends")) : configTarget(data.extends, "Configuration extends")
    if (data.references !== undefined) result.references = list(data.references, 32, "Configuration references").map((entry) => ({ path: configTarget(record(entry, "Configuration reference").path, "Configuration reference path") }))
    if (data.compilerOptions !== undefined) {
      const compiler = record(data.compilerOptions, "Compiler options"), options: Record<string, unknown> = {}
      for (const key of ["baseUrl", "rootDir"]) if (compiler[key] !== undefined) options[key] = configTarget(compiler[key], `Compiler ${key}`)
      if (compiler.paths !== undefined) {
        const paths = record(compiler.paths, "Compiler paths"), selected: Record<string, string[]> = Object.create(null)
        if (Object.keys(paths).length > 128) fail("Compiler paths supports at most 128 aliases.")
        for (const key of Object.keys(paths).sort()) { boundedString(key, 128, "Alias pattern"); if ((key.match(/\*/g) ?? []).length > 1) fail("Alias patterns support at most one wildcard."); selected[key] = pathList(paths[key], "Alias targets", 8).map((target) => configTarget(target, "Alias target")) }
        options.paths = selected
      }
      result.compilerOptions = options
    }
    return result
  }
  if (kind === "components") {
    const result: Record<string, unknown> = {}
    if (data.aliases !== undefined) result.aliases = Object.fromEntries(Object.entries(selectedStrings(data.aliases, ["components", "ui", "utils", "hooks", "lib"])).map(([key, alias]) => [key, configTarget(alias, "Component alias")]))
    if (data.tailwind !== undefined) { const css = record(data.tailwind, "Tailwind configuration").css; if (css !== undefined) result.tailwind = { css: normalizeProjectPath(css) } }
    if (data.iconLibrary !== undefined) { const icon = boundedString(data.iconLibrary, 64, "Icon library"); result.iconLibrary = Object.hasOwn(ICON_LIBRARIES, icon) ? icon : "unknown" }
    if (data.logic2b !== undefined) {
      const config = record(data.logic2b, "logic2b configuration"), selected: Record<string, unknown> = {}
      if (config.preset !== undefined) { const preset = boundedString(config.preset, 256, "logic2b preset"); selected.preset = decodePreset(preset) ? preset : "unknown" }
      if (config.version !== undefined) { const selector = boundedString(config.version, 256, "logic2b version"); selected.version = registryVersion(selector) ?? "unknown" }
      if (config.agentRules !== undefined) { if (typeof config.agentRules !== "boolean") fail("logic2b agentRules must be a boolean."); selected.agentRules = config.agentRules }
      result.logic2b = selected
    }
    return result
  }
  if (data.schemaVersion !== 1) fail("Unsupported install manifest schemaVersion. Supply a schemaVersion 1 manifest.")
  const registry = record(data.registry, "Manifest registry"), items = record(data.items, "Manifest items")
  if (Object.keys(items).length > PROJECT_LIMITS.inventoryEntries) fail("Manifest inventory exceeds 1000 items.")
  let fileCount = 0
  const normalized: Record<string, unknown> = Object.create(null)
  for (const name of Object.keys(items).sort()) {
    boundedString(name, 128, "Installed item name")
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) fail("Installed item names must be registry names.")
    const item = record(items[name], "Manifest item")
    const files = list(item.files, PROJECT_LIMITS.inventoryEntries, "Manifest files").map((path) => normalizeProjectPath(path))
    if (new Set(files.map((path) => path.toLowerCase())).size !== files.length) fail("Manifest contains duplicate normalized file paths.")
    fileCount += files.length
    if (fileCount > PROJECT_LIMITS.inventoryEntries) fail("Manifest inventory exceeds 1000 recorded files.")
    const metadata: Record<string, unknown> = { files: files.sort() }
    if (item.version !== undefined) { const value = version(item.version); if (!value || !versionAtom(value, true)) fail("Manifest item version must be an exact supported version."); metadata.version = value }
    if (item.integrity !== undefined) { const value = boundedString(item.integrity, 128, "Manifest integrity"); if (!/^sha256-[A-Za-z0-9+/=]+$/.test(value)) fail("Manifest integrity must be a sha256 integrity value."); metadata.integrity = value }
    normalized[name] = metadata
  }
  const selectedRegistry: Record<string, string> = {}
  for (const key of ["requestedVersion", "resolvedVersion"]) if (registry[key] !== undefined) { const value = registryVersion(registry[key]); if (!value || (key === "resolvedVersion" && !versionAtom(value, true))) fail("Manifest registry version must be a supported selector, with an exact resolvedVersion."); selectedRegistry[key] = value }
  return { schemaVersion: 1, registry: selectedRegistry, items: normalized }
}

/** Linear JSONC lexer; strings/comments are handled without evaluating JavaScript. */
function jsonc(source: string): string {
  let clean = "", quote = false, escape = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i], next = source[i + 1]
    if (quote) { clean += char; if (escape) escape = false; else if (char === "\\") escape = true; else if (char === '"') quote = false; continue }
    if (char === '"') { quote = true; clean += char }
    else if (char === "/" && next === "/") { while (i < source.length && source[i] !== "\n") i++; clean += "\n" }
    else if (char === "/" && next === "*") { i += 2; while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++; if (i >= source.length) fail("Unterminated configuration comment."); i++; clean += " " }
    else clean += char
  }
  let result = ""; quote = false; escape = false
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (quote) { result += char; if (escape) escape = false; else if (char === "\\") escape = true; else if (char === '"') quote = false; continue }
    if (char === '"') quote = true
    if (char === ",") { let j = i + 1; while (/\s/.test(clean[j] ?? "") && j < clean.length) j++; if (clean[j] === "}" || clean[j] === "]") continue }
    result += char
  }
  return result
}
export function parseProjectConfig(path: string, kind: ProjectConfigKind, content: string): ProjectConfig {
  path = normalizeProjectPath(path)
  if (typeof content !== "string" || encoder.encode(content).byteLength > PROJECT_LIMITS.configBytes) fail("Configuration input exceeds 128 KiB.")
  let data: unknown
  try { data = JSON.parse(kind === "tsconfig" ? jsonc(content.replace(/^\uFEFF/, "")) : content.replace(/^\uFEFF/, "")) } catch { fail(`Malformed ${kind} configuration at ${path}. Supply valid ${kind === "tsconfig" ? "JSON/JSONC" : "JSON"}.`) }
  return { path, kind, data: sanitizeConfig(kind, data) }
}
export function validateProjectSnapshot(value: unknown): ProjectSnapshotV1 {
  const input = record(value, "Project snapshot")
  keys(input, ["schemaVersion", "configs", "capabilities", "directories", "files", "notices"], "Project snapshot")
  if (input.schemaVersion !== 1) fail("Unsupported project snapshot schemaVersion. Supply schemaVersion 1.")
  const caps = record(input.capabilities, "Host capabilities")
  keys(caps, ["fileWrites", "dependencyInstall", "browser"], "Host capabilities")
  for (const key of ["fileWrites", "dependencyInstall", "browser"]) if (typeof caps[key] !== "boolean") fail("Host capabilities require explicit boolean fileWrites, dependencyInstall and browser fields.")
  const rawConfigs = list(input.configs, PROJECT_LIMITS.configEntries, "Project configurations")
  if (bytes(rawConfigs) > PROJECT_LIMITS.configBytes) fail("Configuration metadata exceeds 128 KiB.")
  const configs = rawConfigs.map((entry): ProjectConfig => {
    const config = record(entry, "Project configuration")
    keys(config, ["path", "kind", "data"], "Project configuration")
    if (!["package", "tsconfig", "components", "manifest", "workspace"].includes(config.kind as string)) fail("Unsupported configuration kind.")
    return { path: normalizeProjectPath(config.path), kind: config.kind as ProjectConfigKind, data: sanitizeConfig(config.kind as ProjectConfigKind, config.data) }
  })
  const unique = (paths: string[], label: string) => { if (new Set(paths.map((path) => path.toLowerCase())).size !== paths.length) fail(`${label} contains duplicate normalized paths.`) }
  unique(configs.map((config) => config.path), "Configurations")
  const directories = input.directories === undefined ? [] : list(input.directories, PROJECT_LIMITS.inventoryEntries, "Project directories").map((entry) => normalizeProjectPath(entry, true))
  unique(directories, "Directories")
  const files = input.files === undefined ? [] : list(input.files, PROJECT_LIMITS.inventoryEntries, "Project file inventory").map((entry): ProjectFile => {
    const file = record(entry, "Project file")
    keys(file, ["path", "sha256", "baselineSha256", "missing"], "Project file")
    const result: ProjectFile = { path: normalizeProjectPath(file.path) }
    for (const key of ["sha256", "baselineSha256"] as const) if (file[key] !== undefined) { if (typeof file[key] !== "string" || !/^[a-f0-9]{64}$/.test(file[key])) fail("File hashes must be lowercase SHA-256 hex strings."); result[key] = file[key] as string }
    if (file.missing !== undefined) { if (file.missing !== true || file.sha256 !== undefined) fail("A missing file must use missing:true without a current hash."); result.missing = true }
    if (!result.missing && !result.sha256) fail("Each selected file needs sha256 or missing:true.")
    return result
  })
  unique(files.map((file) => file.path), "File inventory")
  if (directories.length + files.length > PROJECT_LIMITS.inventoryEntries) fail("Project inventory exceeds 1000 entries.")
  const notices = input.notices === undefined ? [] : list(input.notices, 128, "Project notices").map((entry) => { if (!(PROJECT_NOTICES as readonly unknown[]).includes(entry)) fail("Project notices must use a supported generic collector notice; never supply source or secrets."); return entry as string })
  return { schemaVersion: 1, configs: configs.sort((a, b) => a.path.localeCompare(b.path)), capabilities: { fileWrites: caps.fileWrites as boolean, dependencyInstall: caps.dependencyInstall as boolean, browser: caps.browser as boolean }, directories: directories.sort(), files: files.sort((a, b) => a.path.localeCompare(b.path)), notices: [...notices].sort() }
}

interface EffectiveTs { baseUncertain?: boolean; baseUrl?: string; rootDir?: string; paths?: Record<string, string[]>; pathsOrigin?: string }
/** Only known tsconfig metadata is merged; scripts and module configurations are inert. */
function effectiveTs(config: ProjectConfig, configs: Map<string, ProjectConfig>, unknown: (text: string) => void, chain: string[] = []): EffectiveTs {
  if (chain.includes(config.path) || chain.length >= 8) { unknown(`Cyclic or excessive tsconfig inheritance at ${config.path}.`); return { baseUncertain: true, baseUrl: undefined, rootDir: undefined, paths: undefined, pathsOrigin: undefined } }
  let result: EffectiveTs = {}
  const uncertainParent = () => { result = { baseUncertain: true, baseUrl: undefined, rootDir: undefined, paths: undefined, pathsOrigin: undefined } }
  const inherited = config.data.extends === undefined ? [] : Array.isArray(config.data.extends) ? config.data.extends : [config.data.extends]
  for (const entry of inherited) {
    const target = entry as string
    if (!target.startsWith(".")) { uncertainParent(); unknown(`External tsconfig extends in ${config.path} is not read; inherited aliases may be unknown.`); continue }
    let path: string
    try { path = resolveProjectConfigPath(dirname(config.path), target); if (!path.endsWith(".json")) path += ".json" } catch { uncertainParent(); unknown(`tsconfig extends in ${config.path} leaves the selected root; inherited aliases are unknown.`); continue }
    const parent = configs.get(path)
    if (!parent || parent.kind !== "tsconfig") { uncertainParent(); unknown(`Missing local tsconfig dependency ${path}.`); continue }
    result = { ...result, ...effectiveTs(parent, configs, unknown, [...chain, config.path]) }
  }
  const options = config.data.compilerOptions as Record<string, unknown> | undefined
  for (const key of ["baseUrl", "rootDir"] as const) if (options?.[key] !== undefined) {
    try { result[key] = resolveProjectConfigPath(dirname(config.path), options[key] as string); if (key === "baseUrl") result.baseUncertain = false } catch { delete result[key]; if (key === "baseUrl") result.baseUncertain = true; unknown(`${key} in ${config.path} leaves the selected root.`) }
  }
  if (options?.paths !== undefined) { result.paths = options.paths as Record<string, string[]>; result.pathsOrigin = dirname(config.path) }
  return result
}
function aliasTarget(alias: string, aliases: Record<string, string[]>): string | undefined {
  const matching = Object.keys(aliases).filter((pattern) => pattern === alias || (pattern.includes("*") && alias.startsWith(pattern.split("*")[0]) && alias.endsWith(pattern.split("*")[1]))).sort((a, b) => a === alias ? -1 : b === alias ? 1 : b.split("*")[0].length - a.split("*")[0].length || a.localeCompare(b))
  if (!matching.length) return undefined
  if (matching[0] !== alias && matching.length > 1 && matching[0].split("*")[0].length === matching[1].split("*")[0].length) return undefined
  const pattern = matching[0], targets = aliases[pattern]
  if (targets.length !== 1) return undefined
  const [prefix, suffix] = pattern.split("*")
  const wildcard = pattern.includes("*") ? alias.slice(prefix.length, suffix ? -suffix.length : undefined) : ""
  try { return normalizeProjectPath(targets[0].replace("*", wildcard), true) } catch { return undefined }
}
export function resolveRegistryFilePath(context: Pick<ProjectContextV1, "locations">, path: string): string | undefined {
  path = normalizeProjectPath(path)
  const { locations } = context
  const append = (root: string | undefined, suffix: string) => root === undefined ? undefined : normalizeProjectPath(root === "." ? suffix : `${root}/${suffix}`)
  if (path === "lib/utils.ts" && locations.utils) return /\.[cm]?[jt]sx?$/.test(locations.utils) ? locations.utils : `${locations.utils}.ts`
  if (path.startsWith("ui/")) return append(locations.ui, path.slice(3))
  if (path.startsWith("blocks/")) return append(locations.components, path.slice(7))
  if (path.startsWith("charts/")) return append(locations.components, path)
  if (path.startsWith("hooks/")) return append(locations.hooks, path.slice(6))
  if (path.startsWith("lib/")) return append(locations.lib, path.slice(4))
  if (path === "theme.css" && locations.theme) return append(dirname(locations.theme), "theme.css")
  return undefined
}
export function inspectProject(value: unknown, options: { details?: boolean } = {}): ProjectInspection {
  if (options.details !== undefined && typeof options.details !== "boolean") fail("Inspection details must be a boolean.")
  const snapshot = validateProjectSnapshot(value), unknowns = new Set(snapshot.notices)
  const unknown = (text: string) => { unknowns.add(text.slice(0, 512)) }
  const context: ProjectContextV1 = { schemaVersion: 1, framework: { name: "unknown" }, aliases: Object.create(null), stylesheets: [], locations: {}, installed: [], observedFiles: [], capabilities: snapshot.capabilities, evidence: [], unknowns: [] }
  const evidence = (field: string, source: string, confidence: "known" | "inferred" = "known") => { if (context.evidence.length < 256) context.evidence.push({ field, source, confidence }) }
  const rootPackage = snapshot.configs.find((config) => config.kind === "package" && config.path === "package.json")
  const appPackages = snapshot.configs.filter((config) => config.kind === "package" && config.path !== "package.json" && ["dependencies", "devDependencies", "peerDependencies"].some((key) => ["next", "vite", "astro"].some((name) => (config.data[key] as Record<string, unknown> | undefined)?.[name] !== undefined)))
  const deps: Record<string, string> = {}
  if (rootPackage) for (const key of ["peerDependencies", "devDependencies", "dependencies"]) Object.assign(deps, rootPackage.data[key])
  const frameworks = (["next", "vite", "astro"] as const).filter((name) => deps[name] !== undefined)
  if (appPackages.length) unknown(`Workspace contains ${appPackages.length} plausible application package(s): ${appPackages.map((config) => dirname(config.path)).join(", ").slice(0, 350)}. Select an app root before planning changes.`)
  if (frameworks.length === 1 && !appPackages.length) { const name = frameworks[0]; context.framework = { name, ...(version(deps[name]) ? { version: deps[name] } : {}) }; evidence("framework", "package.json declared dependency"); if (!version(deps[name])) unknown(`${name} declared version is unknown.`) }
  else if (frameworks.length > 1) unknown("Conflicting framework declarations in package.json; select and confirm the application framework.")
  else if (!appPackages.length) unknown("No supported framework declaration was supplied in package.json.")
  for (const [name, field] of [["react", "reactVersion"], ["tailwindcss", "tailwindVersion"]] as const) if (version(deps[name])) { context[field] = deps[name]; evidence(field, "package.json declared dependency") } else unknown(`${name} declared version is unknown.`)
  const configs = new Map(snapshot.configs.map((config) => [config.path, config]))
  const rootTs = configs.get("tsconfig.json") ?? configs.get("jsconfig.json")
  const effective: Array<{ data: EffectiveTs; path: string }> = []
  if (rootTs?.kind === "tsconfig") {
    effective.push({ data: effectiveTs(rootTs, configs, unknown), path: rootTs.path })
    for (const entry of (rootTs.data.references ?? []) as Array<{ path: string }>) {
      let path: string
      try { path = resolveProjectConfigPath(dirname(rootTs.path), entry.path); if (!path.endsWith(".json")) path = path === "." ? "tsconfig.json" : `${path}/tsconfig.json` } catch { unknown("A tsconfig reference leaves the selected project root."); continue }
      const ref = configs.get(path)
      if (ref?.kind === "tsconfig") effective.push({ data: effectiveTs(ref, configs, unknown), path })
      else unknown(`Missing local tsconfig reference ${path}.`)
    }
  } else unknown("No tsconfig/jsconfig metadata supplied; import aliases are unknown.")
  const conflicting = new Set<string>()
  for (const { data, path } of effective) {
    if (data.baseUncertain && data.paths) { for (const pattern of Object.keys(data.paths)) { delete context.aliases[pattern]; conflicting.add(pattern) }; unknown(`Alias baseUrl in ${path} depends on unresolved inheritance; no targets confirmed.`); continue }
    for (const [pattern, targets] of Object.entries(data.paths ?? {})) {
      const normalized: string[] = []
      let unsupported = targets.length === 0
      for (const target of targets) try { if ((target.match(/\*/g) ?? []).length > 1) throw new Error(); normalized.push(resolveProjectConfigPath(data.baseUrl ?? data.pathsOrigin ?? ".", target)) } catch { unsupported = true }
      if (unsupported) { delete context.aliases[pattern]; conflicting.add(pattern); unknown(`Alias ${pattern} in ${path} has an unsupported or escaping target; no alternatives confirmed.`); continue }
      if (!normalized.length) continue
      if (context.aliases[pattern] && JSON.stringify(context.aliases[pattern]) !== JSON.stringify(normalized)) { delete context.aliases[pattern]; conflicting.add(pattern); unknown(`Conflicting alias ${pattern} across tsconfig references.`) }
      else if (!conflicting.has(pattern)) { context.aliases[pattern] = normalized; evidence(`aliases.${pattern}`, path) }
    }
  }
  const roots = new Set(Object.entries(context.aliases).filter(([pattern, targets]) => (pattern === "@/*" || pattern === "~/*") && targets.length === 1 && targets[0].endsWith("*" )).map(([, targets]) => targets[0].slice(0, -1).replace(/\/$/, "") || "."))
  for (const { data } of effective) if (data.rootDir) roots.add(data.rootDir)
  if (roots.size === 1) { context.sourceRoot = [...roots][0]; evidence("sourceRoot", "confirmed root alias or compiler rootDir") }
  else if (roots.size > 1) unknown("Conflicting source roots; no sourceRoot selected.")
  else if (snapshot.directories?.includes("src")) { context.sourceRoot = "src"; evidence("sourceRoot", "directory inventory", "inferred") }
  const components = configs.get("components.json")
  if (components?.kind === "components") {
    for (const [key, alias] of Object.entries((components.data.aliases ?? {}) as Record<string, string>)) {
      const target = aliasTarget(alias, context.aliases)
      if (target !== undefined) { context.locations[key as keyof ProjectContextV1["locations"]] = target; evidence(`locations.${key}`, "components.json aliases and tsconfig paths") }
      else unknown(`components.json alias ${key} has no unambiguous confirmed tsconfig target.`)
    }
    const css = (components.data.tailwind as { css?: string } | undefined)?.css
    if (css) { context.stylesheets.push(css); context.locations.theme = css; evidence("stylesheets", "components.json tailwind.css") }
    const icon = components.data.iconLibrary as string | undefined
    if (icon && Object.hasOwn(ICON_LIBRARIES, icon)) { context.iconLibrary = icon; evidence("iconLibrary", "components.json") } else if (icon) unknown("Unsupported components.json iconLibrary; preserve existing imports until confirmed.")
    const logic = components.data.logic2b as { preset?: string; version?: string } | undefined
    if (logic?.preset) { if (decodePreset(logic.preset)) { context.preset = logic.preset; evidence("preset", "components.json") } else unknown("components.json preset is not a supported logic2b preset.") }
    if (logic?.version && !registryVersion(logic.version)) unknown("components.json registry version selector is unsupported or unknown.")
    if (logic?.version && registryVersion(logic.version)) { context.registryVersion = logic.version; evidence("registryVersion", "components.json version selector") }
  } else unknown("No components.json supplied; installation locations and theme stylesheet are unknown.")
  if (context.framework.name === "vite") unknown("Runtime Vite aliases and stylesheet imports are not verified by static configuration inspection.")
  if (context.framework.name === "astro" && deps["@astrojs/react"] === undefined) unknown("Astro React integration is not declared; confirm island integration before installing React components.")
  if (!context.iconLibrary) { const libraries = Object.entries({ "lucide-react": "lucide", "@tabler/icons-react": "tabler", "@phosphor-icons/react": "phosphor", "@hugeicons/react": "hugeicons" }).filter(([pkg]) => deps[pkg] !== undefined).map(([, icon]) => icon); if (libraries.length === 1) { context.iconLibrary = libraries[0]; evidence("iconLibrary", "package.json declared dependency", "inferred") } else unknown("Icon library is unknown or ambiguous.") }
  context.observedFiles = (snapshot.files ?? []).flatMap((file) => file.sha256 ? [{ path: file.path, sha256: file.sha256, ...(file.baselineSha256 ? { baselineSha256: file.baselineSha256, modified: file.sha256 !== file.baselineSha256 } : {}) }] : [])
  const observed = new Map((snapshot.files ?? []).map((file) => [file.path, file]))
  let recordedFiles = 0, inspectedFiles = 0, modifiedFiles = 0, missingFiles = 0, unknownFiles = 0
  const manifest = configs.get(".logic2b/manifest.json")
  const inspected = new Set<string>(), missing = new Set<string>(), modified = new Set<string>(), unverified = new Set<string>(), recorded = new Set<string>()
  if (manifest?.kind === "manifest") {
    const registry = manifest.data.registry as { resolvedVersion?: string }
    if (registry.resolvedVersion) { context.registryVersion = registry.resolvedVersion; evidence("registryVersion", ".logic2b/manifest.json last resolved selection; item versions retained separately") }
    for (const [name, entry] of Object.entries(manifest.data.items as Record<string, { files: string[]; version?: string; integrity?: string }>)) {
      const files: ProjectContextV1["installed"][number]["files"] = []
      for (const path of entry.files) {
        recorded.add(path)
        const target = resolveRegistryFilePath(context, path), file = target ? observed.get(target) : undefined
        if (target && file?.sha256) { inspected.add(path); if (file.baselineSha256 === undefined) unverified.add(path); else if (file.sha256 !== file.baselineSha256) modified.add(path); files.push({ path: target, sha256: file.sha256, ...(file.baselineSha256 ? { modified: file.sha256 !== file.baselineSha256 } : {}) }) }
        else if (file?.missing) missing.add(path)
        else unverified.add(path)
      }
      context.installed.push({ name, ...(entry.version ? { version: entry.version } : {}), ...(entry.integrity ? { integrity: entry.integrity } : {}), files })
    }
    if (unverified.size) unknown(`${unverified.size} installed file(s) lack a confirmed destination, current hash or baseline; request details/selected files before editing.`)
    if (missing.size) unknown(`${missing.size} recorded installed file(s) are missing from the selected root.`)
    evidence("installed", ".logic2b/manifest.json; only supplied current hashes appear in files")
  } else unknown("No logic2b install manifest supplied; existing native or shadcn components may still be present.")
  recordedFiles = recorded.size; inspectedFiles = inspected.size; modifiedFiles = modified.size; missingFiles = missing.size; unknownFiles = unverified.size
  context.aliases = Object.fromEntries(Object.entries(context.aliases).sort(([a], [b]) => a.localeCompare(b)))
  context.unknowns = [...unknowns].sort()
  const result: ProjectInspection = { schemaVersion: 1, summary: {
    framework: context.framework, ...(context.reactVersion ? { reactVersion: context.reactVersion } : {}), ...(context.tailwindVersion ? { tailwindVersion: context.tailwindVersion } : {}), ...(context.sourceRoot ? { sourceRoot: context.sourceRoot } : {}), locations: context.locations, aliasPatterns: Object.keys(context.aliases).slice(0, 32), stylesheets: context.stylesheets,
    ...(context.iconLibrary ? { iconLibrary: context.iconLibrary } : {}), ...(context.preset ? { preset: context.preset } : {}), ...(context.registryVersion ? { registryVersion: context.registryVersion } : {}), capabilities: context.capabilities,
    inventory: { items: context.installed.length, recordedFiles, inspectedFiles, modifiedFiles, missingFiles, unknownFiles }, configFiles: snapshot.configs.length, unknowns: context.unknowns.slice(0, 8), unknownCount: context.unknowns.length,
  }, ...(options.details ? { context } : {}) }
  if (bytes(result) > (options.details ? PROJECT_LIMITS.detailBytes : PROJECT_LIMITS.compactBytes)) fail(`Inspection exceeds the ${options.details ? "512 KiB detail" : "16 KiB compact"} response budget; select a smaller application/inventory.`)
  return result
}

const relativePath = { type: "string", minLength: 1, maxLength: 256 }
const hash = { type: "string", pattern: "^[a-f0-9]{64}$" }
const capabilitiesSchema = { type: "object", additionalProperties: false, required: ["fileWrites", "dependencyInstall", "browser"], properties: { fileWrites: { type: "boolean" }, dependencyInstall: { type: "boolean" }, browser: { type: "boolean" } } }
const strings = (maxItems = 1000) => ({ type: "array", maxItems, items: { type: "string" } })
const frameworkSchema = { type: "object", additionalProperties: false, required: ["name"], properties: { name: { type: "string", enum: ["next", "vite", "astro", "unknown"] }, version: { type: "string", maxLength: 64 } } }
const locationsSchema = { type: "object", additionalProperties: false, properties: Object.fromEntries(["components", "ui", "utils", "hooks", "lib", "theme"].map((key) => [key, relativePath])) }
export const PROJECT_SNAPSHOT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["schemaVersion", "configs", "capabilities"], properties: {
    schemaVersion: { const: 1 }, capabilities: capabilitiesSchema,
    configs: { type: "array", maxItems: 32, items: { type: "object", additionalProperties: false, required: ["path", "kind", "data"], properties: { path: relativePath, kind: { type: "string", enum: ["package", "tsconfig", "components", "manifest", "workspace"] }, data: { type: "object" } } } },
    directories: { type: "array", maxItems: 1000, items: relativePath }, notices: { type: "array", maxItems: 128, items: { type: "string", minLength: 1, maxLength: 512, enum: PROJECT_NOTICES } },
    files: { type: "array", maxItems: 1000, items: { type: "object", additionalProperties: false, required: ["path"], properties: { path: relativePath, sha256: hash, baselineSha256: hash, missing: { const: true } }, oneOf: [{ required: ["sha256"], not: { required: ["missing"] } }, { required: ["missing"], not: { required: ["sha256"] } }] } },
  },
} as const
// Compatibility export for adapters that name the input snapshot rather than the project.
export const SNAPSHOT_SCHEMA = PROJECT_SNAPSHOT_SCHEMA
const common = { framework: frameworkSchema, reactVersion: { type: "string" }, tailwindVersion: { type: "string" }, sourceRoot: relativePath, locations: locationsSchema, stylesheets: strings(16), iconLibrary: { type: "string" }, preset: { type: "string" }, registryVersion: { type: "string" }, capabilities: capabilitiesSchema, unknowns: strings(8192) }
export const PROJECT_INSPECTION_SCHEMA = {
  type: "object", additionalProperties: false, required: ["schemaVersion", "summary"], properties: {
    schemaVersion: { const: 1 }, summary: { type: "object", additionalProperties: false, required: ["framework", "locations", "aliasPatterns", "stylesheets", "capabilities", "inventory", "configFiles", "unknowns", "unknownCount"], properties: { ...common, aliasPatterns: strings(32), configFiles: { type: "integer", minimum: 0 }, unknownCount: { type: "integer", minimum: 0 }, inventory: { type: "object", additionalProperties: false, required: ["items", "recordedFiles", "inspectedFiles", "modifiedFiles", "missingFiles", "unknownFiles"], properties: Object.fromEntries(["items", "recordedFiles", "inspectedFiles", "modifiedFiles", "missingFiles", "unknownFiles"].map((key) => [key, { type: "integer", minimum: 0 }])) } } },
    context: { type: "object", additionalProperties: false, required: ["schemaVersion", "framework", "aliases", "locations", "stylesheets", "installed", "observedFiles", "capabilities", "evidence", "unknowns"], properties: { ...common, schemaVersion: { const: 1 }, aliases: { type: "object", additionalProperties: strings(8) }, installed: { type: "array", maxItems: 1000, items: { type: "object", additionalProperties: false, required: ["name", "files"], properties: { name: { type: "string" }, version: { type: "string" }, integrity: { type: "string" }, files: { type: "array", maxItems: 1000, items: { type: "object", additionalProperties: false, required: ["path", "sha256"], properties: { path: relativePath, sha256: hash, modified: { type: "boolean" } } } } } } }, observedFiles: { type: "array", maxItems: 1000, items: { type: "object", additionalProperties: false, required: ["path", "sha256"], properties: { path: relativePath, sha256: hash, baselineSha256: hash, modified: { type: "boolean" } } } }, evidence: { type: "array", maxItems: 256, items: { type: "object", additionalProperties: false, required: ["field", "source", "confidence"], properties: { field: { type: "string" }, source: { type: "string" }, confidence: { enum: ["known", "inferred"] } } } } } },
  },
} as const
