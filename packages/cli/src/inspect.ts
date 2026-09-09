import { constants } from "node:fs"
import { lstat, open, readdir, realpath } from "node:fs/promises"
import { createHash } from "node:crypto"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { detectProjectContext, inspectProject, isProjectConfiguration, joinProjectPath, parseProjectConfiguration, projectPath, PROJECT_LIMITS, ProjectContextError, type HostCapabilities, type ProjectSnapshotV1 } from "@logic2b/scaffold/project-context"

export interface CollectProjectOptions {
  cwd: string
  appRoot?: string
  files?: string[]
  capabilities?: HostCapabilities
}
const inside = (root: string, candidate: string) => { const rel = relative(root, candidate); return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`)) }
const missing = (error: unknown) => !!error && typeof error === "object" && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR")
const sha256 = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex")

/** Reads only a selected app's bounded configuration and explicitly identified file bytes. */
export async function collectProjectSnapshot(options: CollectProjectOptions): Promise<ProjectSnapshotV1> {
  const workspace = await realpath(resolve(options.cwd))
  const appRoot = options.appRoot === undefined ? "." : projectPath(options.appRoot, true)
  const root = await realpath(join(workspace, appRoot))
  if (!inside(workspace, root)) throw new ProjectContextError("The selected app root resolves outside the workspace.")
  projectPath(relative(workspace, root).split(sep).join("/") || ".", true)
  if (!(await lstat(root)).isDirectory()) throw new ProjectContextError("The selected app root must be a directory.")
  let configBytes = 0, fileBytes = 0
  const read = async (path: string, kind: "config" | "source"): Promise<{ content: Buffer; real: string } | undefined> => {
    path = projectPath(path)
    const requested = join(root, path)
    let resolved: string
    try { resolved = await realpath(requested) } catch (error) { if (missing(error)) return undefined; throw error }
    if (!inside(root, resolved)) throw new ProjectContextError("Inspection path resolves outside the selected app root.")
    projectPath(relative(root, resolved).split(sep).join("/")) // Also excludes an internal symlink to .env/node_modules.
    const limit = kind === "config" ? PROJECT_LIMITS.configBytes - configBytes : Math.min(PROJECT_LIMITS.fileBytes, PROJECT_LIMITS.totalFileBytes - fileBytes)
    if (limit <= 0) throw new ProjectContextError("Inspection byte budget exceeded.")
    const handle = await open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const stat = await handle.stat()
      if (!stat.isFile() || stat.size > limit) throw new ProjectContextError(`${kind === "config" ? "Configuration" : "Selected file"} exceeds its byte budget or is not a regular file.`)
      // Verify the opened descriptor still corresponds to an in-root path before reading.
      const current = await realpath(requested)
      if (!inside(root, current)) throw new ProjectContextError("Inspection path changed outside the selected root.")
      const observed = await lstat(current)
      if (observed.ino !== stat.ino || observed.dev !== stat.dev) throw new ProjectContextError("Inspection file changed while opening; retry on a stable workspace.")
      const buffer = Buffer.alloc(limit + 1)
      let length = 0
      while (length < buffer.length) { const result = await handle.read(buffer, length, buffer.length - length, null); if (!result.bytesRead) break; length += result.bytesRead }
      if (length > limit) throw new ProjectContextError("Inspection file grew beyond its byte budget.")
      if (kind === "config") configBytes += length; else fileBytes += length
      return { content: buffer.subarray(0, length), real: current }
    } finally { await handle.close() }
  }
  const snapshot: ProjectSnapshotV1 = { schemaVersion: 1, appRoot, configurations: [], files: [], ...(options.capabilities ? { capabilities: options.capabilities } : {}) }
  const pending = ["package.json", "tsconfig.json", "jsconfig.json", "components.json", ".logic2b/manifest.json"]
  const visited = new Set<string>()
  while (pending.length) {
    const path = projectPath(pending.shift()!)
    if (visited.has(path)) continue
    visited.add(path)
    if (visited.size > PROJECT_LIMITS.configurations) throw new ProjectContextError("Inspection exceeds 32 configuration targets.")
    if (!isProjectConfiguration(path)) continue
    const result = await read(path, "config")
    if (!result) continue
    const content = result.content.toString("utf8")
    snapshot.configurations.push({ path, content })
    const config = parseProjectConfiguration(path, content)
    if (/(?:^|\/)(?:tsconfig[^/]*|jsconfig)\.json$/.test(path)) {
      if (typeof config.extends === "string" && config.extends.startsWith(".")) {
        try { pending.push(joinProjectPath(dirname(path), config.extends.endsWith(".json") ? config.extends : `${config.extends}.json`)) }
        catch (error) { if (!(error instanceof ProjectContextError)) throw error /* Pure detector reports out-of-root inheritance as unknown. */ }
      }
      if (Array.isArray(config.references)) for (const reference of config.references) {
        if (reference && typeof reference === "object" && typeof reference.path === "string") { const target = joinProjectPath(dirname(path), reference.path); pending.push(target.endsWith(".json") ? target : `${target}/tsconfig.json`) }
      }
    }
  }
  // Bounded workspace discovery: declared one-level workspaces plus conventional apps/packages.
  if (options.appRoot === undefined) {
    const pkgEntry = snapshot.configurations.find(file => file.path === "package.json")
    const pkg = pkgEntry ? parseProjectConfiguration("package.json", pkgEntry.content) : {}
    const workspaces = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces && typeof pkg.workspaces === "object" && "packages" in pkg.workspaces ? pkg.workspaces.packages : []
    const patterns = [...new Set(["apps/*", "packages/*", ...(Array.isArray(workspaces) ? workspaces.filter((value): value is string => typeof value === "string") : [])])]
    if (patterns.length > 32) throw new ProjectContextError("Too many workspace patterns; select --app-root explicitly.")
    const candidates = new Set<string>()
    for (const pattern of patterns) {
      if (pattern.includes("**") || (pattern.includes("*") && !pattern.endsWith("/*"))) continue
      const base = projectPath(pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern)
      if (!pattern.endsWith("/*")) { candidates.add(base); continue }
      let directory: string
      try { directory = await realpath(join(root, base)) } catch (error) { if (missing(error)) continue; throw error }
      if (!inside(root, directory)) throw new ProjectContextError("Workspace discovery directory escapes the selected root.")
      projectPath(relative(root, directory).split(sep).join("/") || ".", true)
      const entries = await readdir(directory, { withFileTypes: true })
      if (entries.length > PROJECT_LIMITS.inventory) throw new ProjectContextError("Workspace directory exceeds discovery limits; select --app-root.")
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) if (!entry.name.startsWith(".") && entry.name !== "node_modules" && (entry.isDirectory() || entry.isSymbolicLink())) candidates.add(projectPath(`${base}/${entry.name}`))
    }
    if (candidates.size > 100) throw new ProjectContextError("More than 100 workspace candidates; select --app-root.")
    const applications: string[] = []
    for (const candidate of [...candidates].sort()) {
      const result = await read(`${candidate}/package.json`, "config")
      if (!result) continue
      const config = parseProjectConfiguration(`${candidate}/package.json`, result.content.toString("utf8"))
      const deps = { ...(typeof config.dependencies === "object" ? config.dependencies : {}), ...(typeof config.devDependencies === "object" ? config.devDependencies : {}) }
      if (["next", "vite", "astro"].some(name => Object.hasOwn(deps, name))) applications.push(candidate)
    }
    if (applications.length) snapshot.applications = applications
  }
  const context = detectProjectContext(snapshot)
  const selected = (options.files ?? []).map(path => projectPath(path))
  if (new Set(selected).size !== selected.length) throw new ProjectContextError("Duplicate normalized selected file target.")
  const targets = new Map<string, string | undefined>()
  for (const item of context.installed) for (const file of item.files) if (file.path) targets.set(file.path, `.logic2b/base/${file.registryPath}`)
  for (const path of [...selected, ...context.stylesheets]) if (!targets.has(path)) targets.set(path, undefined)
  if (targets.size > PROJECT_LIMITS.inventory) throw new ProjectContextError("More than 1000 inventory targets.")
  const physicalTargets = new Set<string>()
  for (const [path, base] of [...targets].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    const result = await read(path, "source")
    if (!result) { if (selected.includes(path)) throw new ProjectContextError(`Explicitly selected file is missing: ${path}.`); continue }
    if (physicalTargets.has(result.real)) throw new ProjectContextError("Multiple inventory targets resolve to the same physical file.")
    physicalTargets.add(result.real)
    const baseline = base ? await read(base, "source") : undefined
    snapshot.files.push({ path, sha256: sha256(result.content), ...(baseline ? { baseSha256: sha256(baseline.content) } : {}) })
  }
  return snapshot
}
export async function inspectLocalProject(options: CollectProjectOptions, detail: "summary" | "full" = "summary") {
  return inspectProject(await collectProjectSnapshot(options), detail)
}
