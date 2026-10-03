import "./node-runtime.ts"
import { Command } from "commander"
import { constants } from "node:fs"
import { createHash, randomBytes } from "node:crypto"
import { link, lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { collectProjectSnapshot } from "@logic2b/scaffold/project-collector"
import { inspectProject, normalizeProjectPath, PROJECT_LIMITS } from "@logic2b/scaffold/project-context"
import { decodePreset, ICON_LIBRARIES, type IconLibrary } from "@logic2b/tokens"
import {
  buildAgentRulesPlan,
  RULES_LIMITS,
  RULE_FILE_PATHS,
  validateRulePrecondition,
  type AgentRuleFormat,
  type AgentRulesOptions,
  type AgentRulesPlan,
} from "@logic2b/scaffold/rules"

const formatPaths = RULE_FILE_PATHS
const writablePaths = new Set([...Object.values(formatPaths), "components.json"])
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT"
const hash = (value: string) => createHash("sha256").update(value).digest("hex")
const plainObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value)
type PlannedFile = AgentRulesPlan["files"][number]

export interface RuleRefreshOptions {
  agentRules?: boolean
  formats?: AgentRuleFormat[]
  preset?: string
  registryVersion?: string
  /** Planned installs are checked before component writes; final refresh uses the manifest. */
  inventory?: AgentRulesOptions["inventory"]
  force?: boolean
}
export interface PreparedRuleRefresh {
  root: string
  rootIdentity: { dev: number; ino: number }
  files: PlannedFile[]
  notes: string[]
}

/** Managed writes never follow a symlink, including directory ancestors. */
async function safeTarget(root: string, path: string): Promise<string> {
  const rootStat = await lstat(root)
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory() || await realpath(root) !== root) throw new Error("Agent-rule project root changed or traverses a symlink; retry.")
  path = normalizeProjectPath(path)
  if (!writablePaths.has(path)) throw new Error("Unsupported agent-rule output path.")
  let current = root
  const parts = path.split("/")
  for (let index = 0; index < parts.length; index++) {
    current = join(current, parts[index])
    let stat
    try { stat = await lstat(current) } catch (error) { if (missing(error)) continue; throw error }
    if (stat.isSymbolicLink()) throw new Error(`Agent-rule target ${path} uses a symlink. Use a regular file inside the project.`)
    if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error(`Agent-rule target ${path} must use regular files and directories.`)
    }
  }
  return current
}

async function readLocal(root: string, path: string, limit = RULES_LIMITS.currentFileBytes): Promise<string | undefined> {
  const target = await safeTarget(root, path)
  let before
  try { before = await lstat(target) } catch (error) { if (missing(error)) return undefined; throw error }
  if (before.size > limit) throw new Error(`Agent-rule input ${path} exceeds ${limit} bytes.`)
  const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const descriptor = await file.stat()
    if (!descriptor.isFile() || descriptor.dev !== before.dev || descriptor.ino !== before.ino || descriptor.size !== before.size || descriptor.mtimeMs !== before.mtimeMs) {
      throw new Error(`Agent-rule input ${path} changed during reading; retry.`)
    }
    const chunks: Uint8Array[] = []
    let count = 0
    while (true) {
      const buffer = new Uint8Array(Math.min(65536, Math.max(1, limit - count + 1)))
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null)
      if (!bytesRead) break
      count += bytesRead
      if (count > limit) throw new Error(`Agent-rule input ${path} exceeds ${limit} bytes.`)
      chunks.push(buffer.subarray(0, bytesRead))
    }
    const after = await file.stat()
    await safeTarget(root, path)
    const final = await lstat(target)
    if (count !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || final.dev !== before.dev || final.ino !== before.ino || final.size !== before.size || final.mtimeMs !== before.mtimeMs || final.ctimeMs !== before.ctimeMs) {
      throw new Error(`Agent-rule input ${path} changed during reading; retry.`)
    }
    const bytes = new Uint8Array(count)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) } catch {
      throw new Error(`Agent-rule input ${path} must be UTF-8 text.`)
    }
  } finally { await file.close() }
}

async function configState(root: string) {
  const content = await readLocal(root, "components.json", PROJECT_LIMITS.configBytes)
  let data: Record<string, unknown> = {}
  if (content !== undefined) {
    try { const parsed: unknown = JSON.parse(content.replace(/^\uFEFF/, "")); if (!plainObject(parsed)) throw new Error(); data = parsed } catch {
      throw new Error("components.json must contain a valid JSON object before agent rules can be refreshed.")
    }
  }
  if (data.logic2b !== undefined && !plainObject(data.logic2b)) throw new Error("components.json logic2b must be an object.")
  const logic = (data.logic2b ?? {}) as Record<string, unknown>
  if (logic.agentRules !== undefined && typeof logic.agentRules !== "boolean") throw new Error("components.json logic2b.agentRules must be a boolean.")
  return { content, data, logic }
}

/** Check bounded preference data before existing install adapters load config. */
export async function validateAgentRulesConfig(cwd: string): Promise<void> {
  await configState(await realpath(resolve(cwd)))
}

function configWrite(content: string | undefined, data: Record<string, unknown>): PlannedFile {
  const next = `${JSON.stringify(data, null, 2)}\n`
  if (Buffer.byteLength(next) > PROJECT_LIMITS.configBytes) throw new Error("Updated components.json exceeds 128 KiB.")
  return {
    path: "components.json",
    content: next,
    action: content === undefined ? "create" : content === next ? "unchanged" : "update",
    precondition: content === undefined ? { kind: "missing" } : { kind: "sha256", sha256: hash(content) },
  }
}

/** Prepare all data and preconditions without making a filesystem mutation. */
export async function prepareAgentRulesRefresh(cwd: string, options: RuleRefreshOptions = {}): Promise<PreparedRuleRefresh> {
  const root = await realpath(resolve(cwd))
  const rootStat = await lstat(root)
  if (!rootStat.isDirectory()) throw new Error("Agent-rule working directory must be a directory.")
  const rootIdentity = { dev: rootStat.dev, ino: rootStat.ino }
  const config = await configState(root)
  if (options.agentRules === false) {
    return {
      root,
      rootIdentity,
      files: config.logic.agentRules === false ? [] : [configWrite(config.content, { ...config.data, logic2b: { ...config.logic, agentRules: false } })],
      notes: ["Automatic agent rules are disabled by logic2b.agentRules:false."],
    }
  }
  if (!options.force && config.logic.agentRules === false) return { root, rootIdentity, files: [], notes: [] }

  const snapshot = await collectProjectSnapshot(root, { capabilities: { fileWrites: false, dependencyInstall: false, browser: false } })
  const context = inspectProject(snapshot, { details: true }).context!
  const selectedIcon = options.preset ? decodePreset(options.preset)?.iconLibrary : context.iconLibrary && Object.hasOwn(ICON_LIBRARIES, context.iconLibrary) ? context.iconLibrary as IconLibrary : undefined
  const selectedVersion = options.registryVersion ?? (context.registryVersion && /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(context.registryVersion) ? context.registryVersion : undefined)
  const manifest = snapshot.configs.find((entry) => entry.kind === "manifest")
  const entries = manifest?.data.items as Record<string, { files: string[] }> | undefined
  const installed = Object.entries(entries ?? {}).map(([name, item]) => ({ name, kind: item.files.some((path) => path.startsWith("ui/")) ? "component" as const : item.files.some((path) => path.startsWith("charts/")) ? "chart" as const : item.files.some((path) => path.startsWith("blocks/")) ? "block" as const : "other" as const }))
  const inventory = [...new Map([...installed, ...(options.inventory ?? [])].map((item) => [item.name, item])).values()]
  const formats = options.formats?.length ? [...options.formats] : ["agents", "design"] as AgentRuleFormat[]
  const currentFiles: Array<{ path: string; content: string }> = []
  let totalBytes = 0
  for (const [format, path] of Object.entries(formatPaths) as Array<[AgentRuleFormat, string]>) {
    // Automatic refresh also maintains editor files that already carry our block.
    const requested = formats.includes(format) || format === "design" || (format === "agents" && formats.includes("claude"))
    let content: string | undefined
    try { content = await readLocal(root, path) } catch (error) { if (requested) throw error; continue }
    if (content === undefined) continue
    const managed = content.includes("logic2b:rules:") || (format === "claude" && /(?:^|\n)@AGENTS\.md(?:\r?\n|$)/.test(content))
    if (!requested && (options.formats || !managed)) continue
    if (!formats.includes(format)) formats.push(format)
    totalBytes += Buffer.byteLength(content)
    if (totalBytes > RULES_LIMITS.currentTotalBytes) throw new Error("Existing agent-rule files exceed the total input budget.")
    currentFiles.push({ path, content })
  }
  const plan = await buildAgentRulesPlan({
    ...(options.preset ?? context.preset ? { preset: options.preset ?? context.preset } : {}),
    stack: context.framework.name,
    ...(selectedIcon ? { iconLibrary: selectedIcon } : {}),
    ...(selectedVersion ? { registryVersion: selectedVersion } : {}),
    formats,
    inventory,
    inventoryKind: "installed",
    availableTools: ["cli:inspect", "cli:add", "cli:update"],
    currentFiles,
  })
  for (const file of plan.files) if (Buffer.byteLength(file.content) > RULES_LIMITS.currentFileBytes) throw new Error("Merged agent-rule output exceeds 64 KiB; reduce the selected file before installing.")
  return { root, rootIdentity, files: plan.files, notes: [...plan.notes, ...(!manifest ? ["No install manifest: untracked native or shadcn UI remains unknown."] : [])] }
}

async function ensureParents(root: string, path: string): Promise<void> {
  let parent = root
  for (const segment of path.split("/").slice(0, -1)) {
    parent = join(parent, segment)
    try { await mkdir(parent) } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error }
    const stat = await lstat(parent)
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Agent-rule output directories must be regular directories inside the project.")
  }
  await safeTarget(root, path)
}

/** Reject stale batches before any writes; each replacement is staged atomically. */
export async function applyAgentRulesRefresh(prepared: PreparedRuleRefresh): Promise<string[]> {
  const checkRoot = async () => {
    const stat = await lstat(prepared.root)
    if (stat.isSymbolicLink() || !stat.isDirectory() || stat.dev !== prepared.rootIdentity.dev || stat.ino !== prepared.rootIdentity.ino || await realpath(prepared.root) !== prepared.root) throw new Error("Agent-rule project root changed after planning; retry.")
  }
  await checkRoot()
  const paths = new Set<string>()
  for (const file of prepared.files) {
    await safeTarget(prepared.root, file.path)
    if (paths.has(file.path)) throw new Error("Agent-rule plan contains duplicate output paths.")
    paths.add(file.path)
    const limit = file.path === "components.json" ? PROJECT_LIMITS.configBytes : RULES_LIMITS.currentFileBytes
    if (Buffer.byteLength(file.content) > limit) throw new Error("Agent-rule output exceeds its file budget.")
    await validateRulePrecondition(await readLocal(prepared.root, file.path, limit), file.precondition)
  }
  const temporary: string[] = []
  const staged: Array<{ file: PlannedFile; target: string; temporary: string }> = []
  try {
    for (const file of prepared.files.filter((entry) => entry.action !== "unchanged")) {
      await ensureParents(prepared.root, file.path)
      const target = await safeTarget(prepared.root, file.path)
      const temp = join(dirname(target), `.logic2b-rules-${randomBytes(12).toString("hex")}.tmp`)
      const mode = file.precondition.kind === "missing" ? 0o644 : (await lstat(target)).mode & 0o777
      const descriptor = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, mode)
      temporary.push(temp)
      try { await descriptor.writeFile(file.content, "utf8") } finally { await descriptor.close() }
      staged.push({ file, target, temporary: temp })
    }
    // A target can change during staging. Check the whole batch again before committing it.
    for (const { file } of staged) await validateRulePrecondition(await readLocal(prepared.root, file.path, file.path === "components.json" ? PROJECT_LIMITS.configBytes : RULES_LIMITS.currentFileBytes), file.precondition)
    for (const entry of staged) {
      await checkRoot()
      await safeTarget(prepared.root, entry.file.path)
      if (entry.file.precondition.kind === "missing") {
        await link(entry.temporary, entry.target)
        await rm(entry.temporary)
      } else {
        await validateRulePrecondition(await readLocal(prepared.root, entry.file.path, entry.file.path === "components.json" ? PROJECT_LIMITS.configBytes : RULES_LIMITS.currentFileBytes), entry.file.precondition)
        await rename(entry.temporary, entry.target)
      }
    }
    return staged.map(({ file }) => file.path)
  } finally {
    for (const temp of temporary) await rm(temp, { force: true })
  }
}

export async function refreshAgentRules(cwd: string, options: RuleRefreshOptions = {}): Promise<string[]> {
  const plan = await prepareAgentRulesRefresh(cwd, options)
  const changed = await applyAgentRulesRefresh(plan)
  for (const path of changed) {
    if (path === "components.json") console.log("✓ saved automatic agent-rule preference in components.json")
    else {
      const status = plan.notes.find((note) => note.startsWith(`${path}:`))?.split(";")[0] ?? `refreshed ${path}`
      console.log(`✓ ${status} (project content preserved)`)
    }
  }
  for (const note of plan.notes.filter((entry) => entry.startsWith("No install manifest:") || entry.startsWith("Automatic agent rules"))) console.log(`  ${note}`)
  return changed
}

/** Used by init so selected theme metadata survives subsequent automatic refreshes. */
export async function updateAgentRulesConfig(cwd: string, metadata: { preset?: string; agentRules?: false; iconLibrary?: IconLibrary }): Promise<void> {
  const root = await realpath(resolve(cwd))
  const stat = await lstat(root)
  const state = await configState(root)
  const { iconLibrary, ...logicMetadata } = metadata
  const file = configWrite(state.content, { ...state.data, ...(iconLibrary ? { iconLibrary } : {}), logic2b: { ...state.logic, ...logicMetadata } })
  await applyAgentRulesRefresh({ root, rootIdentity: { dev: stat.dev, ino: stat.ino }, files: [file], notes: [] })
}

/** Create configuration without replacing a file that appeared after init preflight. */
export async function createAgentRulesConfig(cwd: string, data: Record<string, unknown>): Promise<void> {
  const root = await realpath(resolve(cwd))
  const stat = await lstat(root)
  await applyAgentRulesRefresh({ root, rootIdentity: { dev: stat.dev, ino: stat.ino }, files: [configWrite(undefined, data)], notes: [] })
}

export function registerRulesCommand(program: Command): void {
  program.command("rules")
    .description("Generate managed agent rules and design reference without installing dependencies.")
    .option("-c, --cwd <path>", "working directory")
    .option("--format <name>", "agents, design, claude, cursor or copilot (comma-separated or repeatable)", (value: string, previous: string[]) => [...previous, ...value.split(",").map((entry) => entry.trim())], [])
    .action(async (options: { cwd?: string; format: AgentRuleFormat[] }) => {
      const changed = await refreshAgentRules(resolve(options.cwd ?? process.cwd()), { ...(options.format.length ? { formats: options.format } : {}), force: true })
      if (!changed.length) console.log("Agent rules are already current.")
    })
}
