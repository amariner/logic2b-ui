import { constants } from "node:fs"
import { lstat, open, readdir, realpath } from "node:fs/promises"
import { createHash } from "node:crypto"
import { isAbsolute, relative, resolve } from "node:path"
import { inspectProject, normalizeProjectPath, parseProjectConfig, PROJECT_LIMITS, resolveProjectConfigPath, resolveRegistryFilePath, validateProjectSnapshot, type ProjectCapabilities, type ProjectConfigKind, type ProjectSnapshotV1 } from "./project-context.ts"

export interface CollectProjectOptions { appRoot?: string; capabilities: ProjectCapabilities; files?: string[]; inventory?: boolean }
const inside = (root: string, path: string) => { const rel = relative(root, path); return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) }
const dirname = (path: string) => path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "."
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex")
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT"

/** Files are bounded before/while reading and checked again to detect stale/racing paths. */
class Reader {
  configBytes = 0
  fileBytes = 0
  constructor(readonly root: string) {}
  async safePath(path: string): Promise<string | undefined> {
    normalizeProjectPath(path, true)
    const lexical = resolve(this.root, path)
    let physical: string
    try { physical = await realpath(lexical) } catch (error) { if (missing(error)) {
      // A missing leaf below an escaping directory symlink is still unsafe.
      let ancestor = lexical
      while (ancestor !== this.root) { ancestor = resolve(ancestor, ".."); try { if (!inside(this.root, await realpath(ancestor))) throw new Error("Project path escapes the selected root through a symlink."); break } catch (parentError) { if (!missing(parentError)) throw parentError } }
      return undefined
    } throw error }
    if (!inside(this.root, physical)) throw new Error("Project path escapes the selected root through a symlink.")
    return physical
  }
  async directory(path: string): Promise<string[] | undefined> {
    const physical = await this.safePath(path)
    if (!physical) return undefined
    const stat = await lstat(physical)
    if (!stat.isDirectory()) return undefined
    const entries = await readdir(physical, { withFileTypes: true })
    if (entries.length > PROJECT_LIMITS.inventoryEntries) throw new Error("Selected directory exceeds 1000 inventory entries; select a smaller app root.")
    if (await this.safePath(path) !== physical) throw new Error("Project directory changed during inspection; retry.")
    return entries.filter((entry) => entry.isDirectory() || entry.isSymbolicLink()).map((entry) => entry.name).sort()
  }
  async read(path: string, config = false): Promise<Uint8Array | undefined> {
    const physical = await this.safePath(path)
    if (!physical) return undefined
    const before = await lstat(physical)
    if (!before.isFile()) throw new Error("Only regular project files can be inspected; directories and special files are unsupported.")
    const limit = config ? PROJECT_LIMITS.configBytes - this.configBytes : Math.min(PROJECT_LIMITS.fileBytes, PROJECT_LIMITS.totalFileBytes - this.fileBytes)
    if (before.size > limit) throw new Error(config ? "Configuration input exceeds 128 KiB in total." : "Selected file input exceeds the 1 MiB per-file or 4 MiB total limit.")
    const file = await open(physical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    try {
      const descriptor = await file.stat()
      if (!descriptor.isFile() || descriptor.dev !== before.dev || descriptor.ino !== before.ino || descriptor.size !== before.size || descriptor.mtimeMs !== before.mtimeMs) throw new Error("Project file changed during inspection; retry.")
      if (await this.safePath(path) !== physical) throw new Error("Project file changed during inspection; retry.")
      const chunks: Uint8Array[] = []; let count = 0
      while (true) {
        const buffer = new Uint8Array(Math.min(65536, Math.max(1, limit - count + 1)))
        const { bytesRead } = await file.read(buffer, 0, buffer.length, null)
        if (!bytesRead) break
        count += bytesRead
        if (count > limit) throw new Error(config ? "Configuration input exceeds 128 KiB in total." : "Selected file input exceeds the bounded read limit.")
        chunks.push(buffer.subarray(0, bytesRead))
      }
      const after = await file.stat()
      const finalPhysical = await this.safePath(path)
      const final = finalPhysical ? await lstat(finalPhysical) : undefined
      if (after.size !== count || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || finalPhysical !== physical || final?.ino !== before.ino || final?.dev !== before.dev) throw new Error("Project file changed during inspection; retry.")
      if (config) this.configBytes += count; else this.fileBytes += count
      const output = new Uint8Array(count); let offset = 0
      for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length }
      return output
    } finally { await file.close() }
  }
}

/** Parse only the workspace package list. Other YAML is never executed or forwarded. */
function workspacePackages(content: string): string[] {
  const lines = content.split(/\r?\n/), packages: string[] = []
  let selected = false
  for (const line of lines) {
    if (!line.trim() || /^\s*#/.test(line)) continue
    if (/^packages:\s*(?:#.*)?$/.test(line)) { selected = true; continue }
    if (!selected) continue
    if (/^\S/.test(line)) { selected = false; continue }
    const match = /^\s*-\s*(?:'([^']*)'|"([^"]*)"|([^#\s]+))\s*(?:#.*)?$/.exec(line)
    if (!match) throw new Error("Unsupported workspace package list; select an explicit app root.")
    packages.push(match[1] ?? match[2] ?? match[3])
    if (packages.length > 32) throw new Error("Workspace package list exceeds 32 entries; select an app root.")
  }
  return packages
}

/** Local-only adapter: no installs, execution, network, source output or writes. */
export async function collectProjectSnapshot(cwd: string, options: CollectProjectOptions): Promise<ProjectSnapshotV1> {
  if (!options || typeof options !== "object") throw new Error("Collector options must declare host capabilities.")
  if (options.inventory !== undefined && typeof options.inventory !== "boolean") throw new Error("Collector inventory must be a boolean.")
  const anchor = await realpath(resolve(cwd))
  const appRoot = options.appRoot === undefined ? "." : normalizeProjectPath(options.appRoot, true)
  const candidate = resolve(anchor, appRoot), root = await realpath(candidate)
  if (!inside(anchor, root)) throw new Error("Application root escapes the working directory through a symlink.")
  if (!(await lstat(root)).isDirectory()) throw new Error("Application root must be a directory.")
  const reader = new Reader(root)
  const snapshot: ProjectSnapshotV1 = { schemaVersion: 1, configs: [], capabilities: options.capabilities, directories: [], files: [], notices: [] }
  // Validate host claims before reading configuration.
  validateProjectSnapshot(snapshot)
  const selectedPaths = options.files ?? []
  if (!Array.isArray(selectedPaths) || selectedPaths.length > PROJECT_LIMITS.inventoryEntries) throw new Error("Selected file inventory exceeds 1000 entries.")
  const normalizedFiles = selectedPaths.map((path) => normalizeProjectPath(path))
  if (new Set(normalizedFiles.map((path) => path.toLowerCase())).size !== normalizedFiles.length) throw new Error("Selected files contain duplicate normalized paths.")
  const added = new Set<string>()
  const addConfig = async (path: string, kind: ProjectConfigKind, depth = 0): Promise<void> => {
    path = normalizeProjectPath(path)
    if (added.has(path)) return
    if (depth >= 8) throw new Error("Configuration inheritance exceeds 8 levels.")
    added.add(path)
    const bytes = await reader.read(path, true)
    if (!bytes) return
    if (snapshot.configs.length >= PROJECT_LIMITS.configEntries) throw new Error("Project configurations exceed 32 entries; select an app root.")
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    if (kind === "workspace") {
      snapshot.configs.push({ path, kind, data: { packages: workspacePackages(content) } }); return
    }
    const config = parseProjectConfig(path, kind, content)
    snapshot.configs.push(config)
    if (kind !== "tsconfig") return
    const inherited = config.data.extends === undefined ? [] : Array.isArray(config.data.extends) ? config.data.extends : [config.data.extends]
    for (const target of inherited as string[]) {
      if (!target.startsWith(".")) continue
      let parent: string
      try { parent = resolveProjectConfigPath(dirname(path), target); if (!parent.endsWith(".json")) parent += ".json" } catch { continue }
      await addConfig(parent, "tsconfig", depth + 1)
    }
    for (const entry of (config.data.references ?? []) as Array<{ path: string }>) {
      let target: string
      try { target = resolveProjectConfigPath(dirname(path), entry.path); if (!target.endsWith(".json")) target = target === "." ? "tsconfig.json" : `${target}/tsconfig.json` } catch { continue }
      await addConfig(target, "tsconfig", depth + 1)
    }
  }
  for (const [path, kind] of [["package.json", "package"], ["tsconfig.json", "tsconfig"], ["jsconfig.json", "tsconfig"], ["components.json", "components"], [".logic2b/manifest.json", "manifest"], ["pnpm-workspace.yaml", "workspace"]] as const) await addConfig(path, kind)
  // A bounded metadata inventory provides source-root evidence without counting source files.
  const rootDirs = await reader.directory(".") ?? []
  for (const path of ["src", "app", "pages", "client", "components", "styles", "hooks", "lib"]) if (rootDirs.includes(path) && await reader.directory(path)) snapshot.directories!.push(path)
  const workspace = snapshot.configs.flatMap((config) => config.kind === "package" && config.path === "package.json" ? (config.data.workspaces ?? []) as string[] : config.kind === "workspace" ? config.data.packages as string[] : [])
  const workspaceApps = new Set<string>()
  for (const pattern of [...new Set(workspace)].sort()) {
    // One directory wildcard is enough for the normal apps/* monorepo topology.
    if (pattern.startsWith("!") || (pattern.match(/\*/g) ?? []).length > 1 || (pattern.includes("*") && !pattern.endsWith("/*"))) { snapshot.notices!.push("Unsupported workspace pattern; select an explicit app root."); continue }
    let base: string
    try { base = normalizeProjectPath(pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern, true) } catch { throw new Error("Workspace paths must stay inside the selected root.") }
    const roots = pattern.endsWith("/*") ? (await reader.directory(base) ?? []).map((name) => base === "." ? name : `${base}/${name}`) : [base]
    for (const path of roots) {
      normalizeProjectPath(path, true)
      const packagePath = path === "." ? "package.json" : `${path}/package.json`
      if (workspaceApps.has(packagePath)) continue
      workspaceApps.add(packagePath)
      await addConfig(packagePath, "package")
    }
  }
  const baselinePaths = new Map<string, string>()
  const selected = new Set(normalizedFiles)
  if (options.inventory) {
    const context = inspectProject(snapshot, { details: true }).context!
    const manifest = snapshot.configs.find((config) => config.kind === "manifest")
    if (manifest) for (const item of Object.values(manifest.data.items as Record<string, { files: string[] }>)) for (const registryPath of item.files) {
      const target = resolveRegistryFilePath(context, registryPath)
      if (target) {
        selected.add(target)
        const baseline = `.logic2b/base/${registryPath}`
        if (baselinePaths.has(target) && baselinePaths.get(target) !== baseline) throw new Error("Installed registry paths collide at a project destination; confirm aliases before inspection.")
        baselinePaths.set(target, baseline)
      }
    }
  }
  if (selected.size + snapshot.directories!.length > PROJECT_LIMITS.inventoryEntries) throw new Error("Project inventory exceeds 1000 entries.")
  if (new Set([...selected].map((path) => path.toLowerCase())).size !== selected.size) throw new Error("File inventory contains colliding normalized targets.")
  for (const path of [...selected].sort()) {
    const bytes = await reader.read(path), baselinePath = baselinePaths.get(path)
    const baseline = baselinePath ? await reader.read(baselinePath) : undefined
    snapshot.files!.push({ path, ...(bytes ? { sha256: sha256(bytes) } : { missing: true as const }), ...(baseline ? { baselineSha256: sha256(baseline) } : {}) })
  }
  return validateProjectSnapshot({ ...snapshot, notices: [...new Set(snapshot.notices)] })
}
