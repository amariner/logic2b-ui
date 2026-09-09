/** Network/filesystem-free project inspection. Inputs are data, never executable configuration. */
export const PROJECT_LIMITS = { configBytes: 128 * 1024, snapshotBytes: 1024 * 1024, configurations: 32, inventory: 1000, pathLength: 256, compactBytes: 16 * 1024, fileBytes: 2 * 1024 * 1024, totalFileBytes: 32 * 1024 * 1024 } as const
export type HostCapabilities = { fileWrites: boolean; dependencyInstall: boolean; browser: boolean }
export interface ProjectSnapshotV1 {
  schemaVersion: 1
  appRoot?: string
  configurations: { path: string; content: string }[]
  files: { path: string; sha256: string; baseSha256?: string }[]
  applications?: string[]
  capabilities?: HostCapabilities
}
export interface ProjectContextV1 {
  schemaVersion: 1
  appRoot: string
  framework: { name: "next" | "vite" | "astro" | "unknown"; version?: string }
  reactVersion?: string
  tailwindVersion?: string
  sourceRoot?: string
  aliases: Record<string, string[]>
  componentAliases: Record<string, string>
  stylesheets: string[]
  stylesheetEntry?: string
  iconLibrary?: string
  preset?: string
  registryVersion?: string
  registrySelector?: string
  installed: { name: string; files: { registryPath: string; path?: string; sha256?: string; modified?: boolean; state: "present" | "missing" | "unresolved" }[] }[]
  selectedFiles: { path: string; sha256: string }[]
  capabilities: HostCapabilities
  evidence: { field: string; source: string; confidence: "known" | "inferred" }[]
  unknowns: string[]
}
export class ProjectContextError extends Error {
  constructor(message: string) { super(message); this.name = "ProjectContextError" }
}
const bytes = (value: string) => new TextEncoder().encode(value).byteLength
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
const fail = (message: string): never => { throw new ProjectContextError(message) }
const bounded = (value: unknown, label: string, max = 256): string => typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[\x00-\x1f]/.test(value) ? value : fail(`${label} must be nonempty bounded text.`)
const exact = (value: unknown, keys: string[], required: string[], label: string): Record<string, unknown> => {
  if (!object(value) || Object.keys(value).some(key => !keys.includes(key)) || required.some(key => !Object.hasOwn(value, key))) return fail(`${label} contains unexpected or missing fields.`)
  return value
}
/** Canonical paths stay relative to the selected app. Never collapse traversal. */
export function projectPath(value: unknown, allowRoot = false): string {
  if (typeof value !== "string" || !value || value.length > PROJECT_LIMITS.pathLength || /^[\/\\]/.test(value) || /[\\:\x00-\x1f]/.test(value)) return fail("Expected a safe project-relative path (maximum 256 characters).")
  const parts = value.split("/")
  if (parts.includes("..")) return fail("Project paths cannot traverse outside the selected root.")
  const normalized = parts.filter(part => part && part !== ".").join("/")
  if (!normalized) return allowRoot ? "." : fail("A file path cannot name the root.")
  if (normalized.split("/").some(part => /^(?:node_modules|\.git|\.env(?:\..*)?)$/i.test(part))) return fail("Environment, dependency and Git paths are excluded from inspection.")
  return normalized
}
export function joinProjectPath(base: string, relative: string): string { return projectPath(`${base}/${projectPath(relative, true)}`, true) }
export function isProjectConfiguration(path: string): boolean {
  return ["package.json", "components.json", ".logic2b/manifest.json"].includes(path) || /(?:^|\/)(?:tsconfig(?:[\w.-]*)|jsconfig)\.json$/.test(path)
}
/** JSONC is accepted only for TS/JS configuration. Comment removal preserves strings. */
export function parseProjectConfiguration(path: string, content: string): Record<string, unknown> {
  let json = content.replace(/^\uFEFF/, "")
  if (/(?:^|\/)(?:tsconfig[^/]*|jsconfig)\.json$/.test(path)) {
    let clean = "", quoted = false, escaped = false
    for (let i = 0; i < json.length; i++) {
      const c = json[i], next = json[i + 1]
      if (quoted) { clean += c; if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; continue }
      if (c === '"') { quoted = true; clean += c }
      else if (c === "/" && next === "/") { while (i < json.length && json[i] !== "\n") i++; clean += "\n" }
      else if (c === "/" && next === "*") { i += 2; while (i < json.length && !(json[i] === "*" && json[i + 1] === "/")) i++; if (i >= json.length) return fail(`Malformed JSONC in ${path.slice(0, 80)}.`); i++; clean += " " }
      else clean += c
    }
    json = ""; quoted = false; escaped = false
    for (let i = 0; i < clean.length; i++) {
      const c = clean[i]
      if (quoted) { json += c; if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; continue }
      if (c === '"') quoted = true
      if (c === "," && /^\s*[}\]]/.test(clean.slice(i + 1))) continue
      json += c
    }
  }
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { return fail(`Malformed JSON configuration: ${path.slice(0, 80)}.`) }
  return object(parsed) ? parsed : fail(`Configuration ${path.slice(0, 80)} must be a JSON object.`)
}
export function validateProjectSnapshot(value: unknown): ProjectSnapshotV1 {
  const data = exact(value, ["schemaVersion", "appRoot", "configurations", "files", "applications", "capabilities"], ["schemaVersion", "configurations", "files"], "Project snapshot")
  if (data.schemaVersion !== 1) return fail("Unsupported project snapshot schemaVersion; expected 1.")
  if (bytes(JSON.stringify(data)) > PROJECT_LIMITS.snapshotBytes) return fail("Project snapshot exceeds the 1 MiB limit.")
  if (!Array.isArray(data.configurations) || data.configurations.length > PROJECT_LIMITS.configurations || !Array.isArray(data.files) || data.files.length > PROJECT_LIMITS.inventory) return fail("Project snapshot exceeds configuration/inventory limits.")
  let total = 0
  const paths = new Set<string>()
  const configurations = data.configurations.map(raw => {
    const item = exact(raw, ["path", "content"], ["path", "content"], "Configuration")
    const path = projectPath(item.path)
    if (!isProjectConfiguration(path)) return fail("Unsupported configuration path. Supply package, components, tsconfig/jsconfig or the Logic2b manifest only.")
    if (paths.has(path)) return fail("Duplicate normalized configuration target.")
    paths.add(path)
    if (typeof item.content !== "string") return fail("Configuration content must be a string.")
    total += bytes(item.content)
    if (total > PROJECT_LIMITS.configBytes) return fail("Configuration content exceeds the 128 KiB limit.")
    parseProjectConfiguration(path, item.content)
    return { path, content: item.content }
  }).sort((a, b) => a.path.localeCompare(b.path, "en"))
  paths.clear()
  const files = data.files.map(raw => {
    const item = exact(raw, ["path", "sha256", "baseSha256"], ["path", "sha256"], "File digest")
    const path = projectPath(item.path)
    if (paths.has(path)) return fail("Duplicate normalized inventory target.")
    paths.add(path)
    for (const digest of [item.sha256, ...(item.baseSha256 === undefined ? [] : [item.baseSha256])]) if (typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) return fail("File digests must be lowercase SHA-256 hex.")
    return { path, sha256: item.sha256 as string, ...(item.baseSha256 === undefined ? {} : { baseSha256: item.baseSha256 as string }) }
  }).sort((a, b) => a.path.localeCompare(b.path, "en"))
  let capabilities: HostCapabilities | undefined
  if (data.capabilities !== undefined) {
    const c = exact(data.capabilities, ["fileWrites", "dependencyInstall", "browser"], ["fileWrites", "dependencyInstall", "browser"], "Capabilities")
    if (Object.values(c).some(value => typeof value !== "boolean")) return fail("Capabilities must be explicit booleans.")
    capabilities = { fileWrites: c.fileWrites as boolean, dependencyInstall: c.dependencyInstall as boolean, browser: c.browser as boolean }
  }
  let applications: string[] | undefined
  if (data.applications !== undefined) {
    if (!Array.isArray(data.applications) || data.applications.length > 100) return fail("At most 100 candidate applications are accepted.")
    applications = data.applications.map(path => projectPath(path, true)).sort()
    if (new Set(applications).size !== applications.length) return fail("Duplicate normalized application root.")
  }
  return { schemaVersion: 1, ...(data.appRoot === undefined ? {} : { appRoot: projectPath(data.appRoot, true) }), configurations, files, ...(capabilities ? { capabilities } : {}), ...(applications ? { applications } : {}) }
}
/** Returns only unambiguous, app-relative destinations; does not assume @ means src. */
export function resolveProjectAlias(specifier: string, aliases: Record<string, string[]>): string | undefined {
  const matches = Object.entries(aliases).filter(([key]) => key.endsWith("/*") ? specifier.startsWith(key.slice(0, -1)) : key === specifier).sort(([a], [b]) => b.length - a.length)
  const match = matches[0]
  if (!match || match[1].length !== 1) return undefined
  const [pattern, targets] = match
  const suffix = pattern.endsWith("/*") ? specifier.slice(pattern.length - 1) : ""
  return projectPath(targets[0].replace(/\*$/, suffix), true)
}

export function detectProjectContext(raw: unknown): ProjectContextV1 {
  const snapshot = validateProjectSnapshot(raw)
  const configs = new Map(snapshot.configurations.map(file => [file.path, parseProjectConfiguration(file.path, file.content)]))
  const unknowns: string[] = [], evidence: ProjectContextV1["evidence"] = []
  const known = (field: string, source: string, confidence: "known" | "inferred" = "known") => evidence.push({ field, source, confidence })
  const context: ProjectContextV1 = { schemaVersion: 1, appRoot: snapshot.appRoot ?? ".", framework: { name: "unknown" }, aliases: Object.create(null), componentAliases: {}, stylesheets: [], installed: [], selectedFiles: snapshot.files.map(({ path, sha256 }) => ({ path, sha256 })), capabilities: snapshot.capabilities ?? { fileWrites: false, dependencyInstall: false, browser: false }, evidence, unknowns }
  if (snapshot.capabilities) known("capabilities", "host")
  else unknowns.push("Host capabilities were not supplied; all capabilities remain disabled in this context.")
  const pkg = configs.get("package.json")
  const dependencies = { ...(object(pkg?.devDependencies) ? pkg.devDependencies : {}), ...(object(pkg?.dependencies) ? pkg.dependencies : {}) }
  const versionSpec = (value: unknown, label: string): string | undefined => {
    const spec = bounded(value, label)
    if (/^[~^<>=*v\d][0-9A-Za-z.*~^<>=|+\- ]*$/.test(spec)) return spec
    unknowns.push(`${label} is not a semver declaration; its locator was omitted.`)
    return undefined
  }
  const frameworks = (["next", "vite", "astro"] as const).filter(name => typeof dependencies[name] === "string")
  // Astro commonly depends on Vite as an implementation detail; Next + Astro is ambiguous.
  const candidates = frameworks.includes("astro") ? frameworks.filter(name => name !== "vite") : frameworks
  if (candidates.length === 1 && !(snapshot.applications?.length)) { context.framework = { name: candidates[0] }; const version = versionSpec(dependencies[candidates[0]], "Declared framework version"); if (version) context.framework.version = version; known("framework", "package.json") }
  else unknowns.push(candidates.length > 1 ? "Conflicting framework dependencies; select the intended application." : snapshot.applications?.length ? "Workspace applications were found; select an app root before using root configuration for changes." : "No supported framework was confirmed from package.json.")
  for (const [dependency, field] of [["react", "reactVersion"], ["tailwindcss", "tailwindVersion"]] as const) if (dependencies[dependency] !== undefined) { const version = versionSpec(dependencies[dependency], `Declared ${dependency} version`); if (version) { context[field] = version; known(field, "package.json") } }
  if (pkg) unknowns.push("Dependency versions are declarations, not resolved installed versions; no dependency code or lockfile was read.")
  else unknowns.push("package.json was not supplied.")
  type TsConfiguration = { aliases: Record<string, string[]>; rawPaths: Record<string, string[]>; pathsDirectory: string; baseUrl: string | undefined; unresolved: boolean }
  const resolvedConfigs = new Map<string, TsConfiguration>()
  const resolving = new Set<string>()
  const resolveConfig = (path: string): TsConfiguration => {
    if (resolvedConfigs.has(path)) return resolvedConfigs.get(path)!
    if (resolving.has(path)) return fail("Circular TypeScript configuration inheritance.")
    resolving.add(path)
    const config = configs.get(path)!
    const directory = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "."
    const aliases: Record<string, string[]> = Object.create(null)
    let rawPaths: Record<string, string[]> = Object.create(null), pathsDirectory = directory, baseUrl: string | undefined = undefined, unresolved = false
    if (config.extends !== undefined) {
      if (typeof config.extends !== "string") { unknowns.push(`${path}: multiple or malformed extends is unsupported.`); unresolved = true }
      else if (!config.extends.startsWith(".")) { unknowns.push(`${path}: package-based extends was not read.`); unresolved = true }
      else {
        let parent: string | undefined
        try { parent = joinProjectPath(directory, config.extends.endsWith(".json") ? config.extends : `${config.extends}.json`) } catch { unknowns.push(`${path}: inherited configuration escapes the selected app root.`); unresolved = true }
        if (parent && configs.has(parent)) { const inherited = resolveConfig(parent); rawPaths = { ...inherited.rawPaths }; pathsDirectory = inherited.pathsDirectory; baseUrl = inherited.baseUrl; unresolved = inherited.unresolved }
        else if (parent) { unknowns.push(`${path}: inherited configuration was not supplied.`); unresolved = true }
      }
    }
    const options = object(config.compilerOptions) ? config.compilerOptions : {}
    if (options.baseUrl !== undefined) baseUrl = joinProjectPath(directory, bounded(options.baseUrl, "baseUrl"))
    if (options.paths !== undefined) {
      if (!object(options.paths) || Object.keys(options.paths).length > 64) return fail("TypeScript paths must be an object with at most 64 aliases.")
      // Preserve raw inherited paths: a child's explicit baseUrl also rebases them.
      rawPaths = Object.create(null); pathsDirectory = directory
      for (const [key, values] of Object.entries(options.paths)) {
        bounded(key, "Alias")
        if (!Array.isArray(values) || values.length < 1 || values.length > 8) return fail("Each alias requires one to eight targets.")
        const targets = values.map(value => bounded(value, "Alias target"))
        try { rawPaths[key] = targets.map(value => projectPath(value, true)) }
        catch (error) { if (!(error instanceof ProjectContextError)) throw error; unknowns.push(`${path}: an alias points outside the selected app or into an excluded path; its destination is withheld.`) }
      }
    }
    for (const [key, values] of Object.entries(rawPaths)) {
      const targets = values.map(value => joinProjectPath(baseUrl ?? pathsDirectory, value))
      if (unresolved && baseUrl === undefined) { unknowns.push(`${path}: alias base is unknown because inheritance is unresolved.`); continue }
      if ((key.match(/\*/g)?.length ?? 0) > 1 || (!key.endsWith("/*") && key.includes("*")) || targets.some(target => target.includes("*") && target !== "*" && !target.endsWith("/*"))) { unknowns.push(`${path}: non-prefix wildcard alias was not resolved.`); continue }
      aliases[key] = targets
    }
    resolving.delete(path)
    const result = { aliases, rawPaths, pathsDirectory, baseUrl, unresolved }; resolvedConfigs.set(path, result); return result
  }
  const primary = configs.has("tsconfig.json") ? "tsconfig.json" : configs.has("jsconfig.json") ? "jsconfig.json" : undefined
  const inspectedConfigs = new Set<string>()
  const addConfig = (path: string) => {
    if (inspectedConfigs.has(path)) return
    inspectedConfigs.add(path)
    const config = configs.get(path)
    if (!config) { unknowns.push(`${path}: referenced configuration was not supplied.`); return }
    const resolved = resolveConfig(path)
    if (resolved.unresolved) unknowns.push(`${path}: inherited settings remain incomplete.`)
    for (const [key, values] of Object.entries(resolved.aliases)) {
      if (context.aliases[key] && JSON.stringify(context.aliases[key]) !== JSON.stringify(values)) { context.aliases[key] = [...new Set([...context.aliases[key], ...values])].sort(); unknowns.push("Conflicting alias targets across project references; no unique destination assumed.") }
      else context.aliases[key] = values
      known(`aliases.${key}`, path)
    }
    if (config.references !== undefined) {
      if (!Array.isArray(config.references) || config.references.length > 32) return fail("Configuration references must be a bounded array.")
      for (const reference of config.references) {
        if (!object(reference) || typeof reference.path !== "string") return fail("Malformed project reference.")
        const directory = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "."
        const referenced = joinProjectPath(directory, reference.path)
        addConfig(referenced.endsWith(".json") ? referenced : `${referenced}/tsconfig.json`)
      }
    }
  }
  if (primary) addConfig(primary)
  else unknowns.push("No tsconfig.json/jsconfig.json was supplied; source root and aliases are unknown.")
  const roots = ["@/*", "~/*"].flatMap(key => context.aliases[key]?.length === 1 && (context.aliases[key][0] === "*" || context.aliases[key][0].endsWith("/*")) ? [context.aliases[key][0] === "*" ? "." : context.aliases[key][0].slice(0, -2)] : [])
  if (roots.length && new Set(roots).size === 1) { context.sourceRoot = roots[0]; known("sourceRoot", "TypeScript path aliases", "inferred") }
  else unknowns.push("No unique @/* or ~/* source root is confirmed.")
  const components = configs.get("components.json")
  if (components) {
    if (components.aliases !== undefined && !object(components.aliases)) return fail("components.json aliases must be an object.")
    for (const [key, value] of Object.entries(object(components.aliases) ? components.aliases : {})) {
      if (!["components", "ui", "utils", "hooks", "lib"].includes(key)) continue
      const alias = bounded(value, "Component alias")
      projectPath(alias, true)
      let target: string | undefined
      if (alias.startsWith(".")) target = projectPath(alias, true)
      else target = resolveProjectAlias(alias, context.aliases)
      if (target) { context.componentAliases[key] = target; known(`componentAliases.${key}`, "components.json + TypeScript paths", "inferred") }
      else unknowns.push(`components.json: ${key} alias has no confirmed unique destination.`)
    }
    if (object(components.tailwind) && components.tailwind.css !== undefined) { context.stylesheetEntry = projectPath(components.tailwind.css); context.stylesheets.push(context.stylesheetEntry); known("stylesheets", "components.json") }
    if (components.iconLibrary !== undefined) { context.iconLibrary = bounded(components.iconLibrary, "Icon library"); known("iconLibrary", "components.json") }
    if (object(components.logic2b)) {
      if (components.logic2b.preset !== undefined) { context.preset = bounded(components.logic2b.preset, "Preset"); known("preset", "components.json") }
      if (components.logic2b.version !== undefined) { context.registrySelector = bounded(components.logic2b.version, "Registry selector"); known("registrySelector", "components.json") }
    }
  } else unknowns.push("components.json was not supplied; component destinations and preset are not assumed.")
  for (const file of snapshot.files) if (file.path.endsWith(".css") && !context.stylesheets.includes(file.path)) { context.stylesheets.push(file.path); known("stylesheets", file.path, "inferred") }
  const manifest = configs.get(".logic2b/manifest.json")
  if (manifest) {
    if (manifest.schemaVersion !== 1 || !object(manifest.items) || !object(manifest.registry)) return fail("Unsupported or malformed Logic2b install manifest; expected schemaVersion 1.")
    if (Object.keys(manifest.items).length > PROJECT_LIMITS.inventory) return fail("Install manifest exceeds 1000 entries.")
    if (manifest.registry.resolvedVersion !== undefined) { context.registryVersion = bounded(manifest.registry.resolvedVersion, "Resolved registry version"); known("registryVersion", ".logic2b/manifest.json") }
    const byPath = new Map(snapshot.files.map(file => [file.path, file]))
    const seenTargets = new Set<string>()
    let fileCount = 0
    for (const [name, raw] of Object.entries(manifest.items).sort(([a], [b]) => a.localeCompare(b, "en"))) {
      bounded(name, "Installed item name", 128)
      if (!object(raw) || !Array.isArray(raw.files)) return fail("Malformed installed item file list.")
      const files: ProjectContextV1["installed"][number]["files"] = []
      const registryPaths = new Set<string>()
      for (const file of raw.files) {
        if (++fileCount > PROJECT_LIMITS.inventory) return fail("Install manifest exceeds 1000 file entries.")
        const registryPath = projectPath(file)
        if (registryPaths.has(registryPath)) return fail("Duplicate normalized registry file.")
        registryPaths.add(registryPath)
        const path = installedTarget(registryPath, context)
        if (!path) { files.push({ registryPath, state: "unresolved" }); unknowns.push(`Installed ${name}: file destination is unresolved.`); continue }
        if (seenTargets.has(path)) return fail("Installed registry files map to a duplicate normalized target.")
        seenTargets.add(path)
        const observed = byPath.get(path)
        if (observed) files.push({ registryPath, path, sha256: observed.sha256, state: "present", ...(observed.baseSha256 ? { modified: observed.sha256 !== observed.baseSha256 } : {}) })
        else { files.push({ registryPath, path, state: "missing" }); unknowns.push(`Installed ${name}: ${path} was not supplied or is missing.`) }
      }
      context.installed.push({ name, files: files.sort((a, b) => a.registryPath.localeCompare(b.registryPath, "en")) }); known(`installed.${name}`, ".logic2b/manifest.json + host file digests")
    }
    if (context.installed.some(item => item.files.some(file => file.state === "present" && file.modified === undefined))) unknowns.push("Some installed files lack a baseline hash; modification status is unknown.")
  } else unknowns.push("No Logic2b install manifest was supplied; existing shadcn/native files are not inferred to be registry installs.")
  context.stylesheets.sort()
  context.componentAliases = Object.fromEntries(Object.entries(context.componentAliases).sort(([a], [b]) => a.localeCompare(b, "en")))
  context.aliases = Object.fromEntries(Object.entries(context.aliases).sort(([a], [b]) => a.localeCompare(b, "en")))
  context.unknowns = [...new Set(unknowns)].sort()
  context.evidence = evidence.sort((a, b) => `${a.field}:${a.source}`.localeCompare(`${b.field}:${b.source}`, "en"))
  return context
}
export function installedTarget(registryPath: string, context: Pick<ProjectContextV1, "componentAliases" | "stylesheets" | "stylesheetEntry" | "sourceRoot">): string | undefined {
  const aliases = context.componentAliases
  let target: string | undefined
  if (registryPath.startsWith("ui/") && aliases.ui) target = `${aliases.ui}/${registryPath.slice(3)}`
  else if (registryPath.startsWith("blocks/") && aliases.components) target = `${aliases.components}/${registryPath.slice(7)}`
  else if (registryPath.startsWith("charts/") && aliases.components) target = `${aliases.components}/${registryPath}`
  else if (registryPath.startsWith("hooks/") && aliases.hooks) target = `${aliases.hooks}/${registryPath.slice(6)}`
  else if (registryPath === "lib/utils.ts" && aliases.utils) target = `${aliases.utils}.ts`
  else if (registryPath.startsWith("lib/") && aliases.lib) target = `${aliases.lib}/${registryPath.slice(4)}`
  else if (registryPath.endsWith(".css") && (context.stylesheetEntry || context.stylesheets.length === 1)) { const css = context.stylesheetEntry ?? context.stylesheets[0]; target = `${css.includes("/") ? css.slice(0, css.lastIndexOf("/")) : "."}/${registryPath}` }
  else if (!/^(ui|blocks|charts|hooks|lib)\//.test(registryPath) && context.sourceRoot !== undefined) target = `${context.sourceRoot}/${registryPath}`
  return target === undefined ? undefined : projectPath(target)
}
export function inspectProject(raw: unknown, detail: "summary" | "full" = "summary") {
  if (detail !== "summary" && detail !== "full") return fail("Inspection detail must be summary or full.")
  const snapshot = validateProjectSnapshot(raw)
  const context = detectProjectContext(snapshot)
  const files = context.installed.flatMap(item => item.files)
  const result = {
    schemaVersion: 1 as const, detail,
    summary: { framework: context.framework, appRoot: context.appRoot, ...(context.sourceRoot === undefined ? {} : { sourceRoot: context.sourceRoot }), installedItems: context.installed.length, inspectedFiles: snapshot.files.length, modifiedFiles: files.filter(file => file.modified === true).length, unresolvedFiles: files.filter(file => file.state !== "present").length, aliasCount: Object.keys(context.aliases).length, applications: detail === "full" ? snapshot.applications ?? [] : (snapshot.applications ?? []).slice(0, 10), applicationCount: snapshot.applications?.length ?? 0, capabilities: context.capabilities },
    unknownCount: context.unknowns.length, unknowns: detail === "full" ? context.unknowns : context.unknowns.slice(0, 10),
    guidance: ["This is static, host-supplied evidence; no configuration/source is executed and no network inspection occurs.", "Request full detail before planning writes: use confirmed aliases/component destinations and compare installed hashes; preserve modified or unresolved files.", "Current add/install_plan commands do not consume this context automatically. Reconcile their destinations with confirmed aliases before applying files; unknown is not permission to assume src/.", "Scaffold only a confirmed empty target. Existing applications need inspection and incremental changes.", "Host capabilities describe the supplied execution scope, not authorization to publish or contact others."],
    ...(detail === "full" ? { context } : {}),
  }
  if (detail === "summary" && bytes(JSON.stringify(result)) > PROJECT_LIMITS.compactBytes) return fail("Compact inspection exceeds the 16 KiB budget; request full detail.")
  return result
}
