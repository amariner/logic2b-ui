import { constants } from "node:fs"
import { lstat, mkdir, open, realpath, rename, unlink } from "node:fs/promises"
import { dirname, join, resolve, sep } from "node:path"
import { randomUUID } from "node:crypto"
import { buildAgentRules, mergeRuleFile, RULE_LIMITS, rulesItemFromFiles, type AgentRulesOptions, type AgentRulesPlan, type RuleFormat, type RuleMerge } from "@logic2b/scaffold/rules"
import { detectProjectContext } from "@logic2b/scaffold/project-context"
import { collectProjectSnapshot } from "./inspect.ts"

const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT"

/** Refuse symlinks and non-regular/hard-linked files, including parent directories. */
async function checkedTarget(root: string, path: string) {
  const target = resolve(root, path)
  if (!target.startsWith(root + sep)) throw new Error("Rules path escapes the project.")
  const parts = path.split("/")
  let current = root
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i])
    try {
      const stat = await lstat(current)
      if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)) throw new Error(`Unsafe rules target: ${path}. Use a regular file and directories.`)
    } catch (error) { if (!missing(error)) throw error }
  }
  return target
}
async function readDocument(target: string): Promise<{ content: string; mode: number } | undefined> {
  let file
  try { file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW) } catch (error) { if (missing(error)) return undefined; throw error }
  try {
    const stat = await file.stat()
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > RULE_LIMITS.documentBytes) throw new Error("Rules document is not a bounded regular file.")
    const buffer = Buffer.alloc(RULE_LIMITS.documentBytes + 1)
    let total = 0
    while (total < buffer.length) {
      const { bytesRead } = await file.read(buffer, total, buffer.length - total, null)
      if (bytesRead === 0) break
      total += bytesRead
    }
    if (total > RULE_LIMITS.documentBytes) throw new Error("Rules document exceeds the document limit.")
    const content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, total))
    return { content, mode: stat.mode & 0o777 }
  } finally { await file.close() }
}

/** Preflight every merge before writing. Atomic replacement preserves permissions. */
export async function writeAgentRules(cwd: string, plan: AgentRulesPlan): Promise<{ path: string; action: RuleMerge["action"] }[]> {
  const root = await realpath(cwd)
  if (plan.schemaVersion !== 1 || plan.files.length > 5 || new Set(plan.files.map(file => file.path)).size !== plan.files.length) throw new Error("Invalid rules plan.")
  const prepared = []
  for (const file of plan.files) {
    // Validate the path against the shared allowlist before looking it up.
    mergeRuleFile(file)
    const target = await checkedTarget(root, file.path)
    const previous = await readDocument(target)
    prepared.push({ file, target, previous, merge: mergeRuleFile(file, previous?.content) })
  }
  for (const item of prepared) {
    if (item.merge.action === "unchanged") continue
    await checkedTarget(root, item.file.path)
    const current = await readDocument(item.target)
    if (current?.content !== item.previous?.content || current?.mode !== item.previous?.mode) throw new Error(`${item.file.path} changed during rules generation; run the command again.`)
    await mkdir(dirname(item.target), { recursive: true })
    await checkedTarget(root, item.file.path)
    const temporary = join(dirname(item.target), `.logic2b-rules-${randomUUID()}.tmp`)
    const handle = await open(temporary, "wx", item.previous?.mode ?? 0o644)
    try {
      await handle.writeFile(item.merge.content)
      await handle.chmod(item.previous?.mode ?? 0o644)
      await handle.close()
      await checkedTarget(root, item.file.path)
      const latest = await readDocument(item.target)
      if (latest?.content !== item.previous?.content || latest?.mode !== item.previous?.mode) throw new Error(`${item.file.path} changed before replacement; run the command again.`)
      await rename(temporary, item.target)
    } finally {
      await handle.close().catch(() => {})
      await unlink(temporary).catch(error => { if (!missing(error)) throw error })
    }
  }
  return prepared.map(item => ({ path: item.file.path, action: item.merge.action }))
}

/** No network or configuration execution; take preset/inventory from bounded local evidence. */
export async function generateLocalRules(options: { cwd: string; formats?: RuleFormat[]; preset?: string }) {
  const snapshot = await collectProjectSnapshot({ cwd: options.cwd })
  const context = detectProjectContext(snapshot)
  const config = snapshot.configurations.find(file => file.path === "components.json")
  const raw = config ? JSON.parse(config.content) : undefined
  const manifest = snapshot.configurations.find(file => file.path === ".logic2b/manifest.json")
  const registry = raw?.logic2b?.registry ?? (manifest ? JSON.parse(manifest.content).registry?.url : undefined)
  if (registry !== "https://ui.logic2b.com" && registry !== "https://ui.logic2b.com/") throw new Error("Rules generation requires a project configured with the logic2b registry. Run logic2b init in the application directory first.")
  if (snapshot.applications?.length && !config) throw new Error("Run rules in the selected application's directory (--cwd), not the workspace root.")
  const plan = buildAgentRules({
    preset: options.preset ?? context.preset,
    iconLibrary: options.preset ? undefined : context.iconLibrary as AgentRulesOptions["iconLibrary"],
    stack: ["next", "vite", "astro"].includes(context.framework.name) ? context.framework.name as "next" | "vite" | "astro" : "react",
    registryVersion: context.registryVersion,
    items: manifest ? context.installed.map(item => rulesItemFromFiles(item.name, item.files.map(file => file.registryPath))) : undefined,
    formats: options.formats,
  })
  return writeAgentRules(options.cwd, plan)
}

/** Automatic installs reuse optional managed editor formats, never claiming other registries. */
export async function refreshLocalRules(cwd: string): Promise<void> {
  try {
    const root = await realpath(cwd)
    const formats: RuleFormat[] = ["agents"]
    for (const [format, path] of [["claude", "CLAUDE.md"], ["cursor", ".cursor/rules/logic2b.mdc"], ["copilot", ".github/copilot-instructions.md"]] as const) {
      const document = await readDocument(await checkedTarget(root, path))
      if (document && (format === "claude" ? /^@(?:\.\/)?AGENTS\.md\r?$/m.test(document.content) : document.content.includes("<!-- logic2b:rules:"))) formats.push(format)
    }
    for (const file of await generateLocalRules({ cwd, formats })) if (file.action !== "unchanged") console.log(`  rules ${file.action} ${file.path}`)
  } catch (error) {
    // The component operation already succeeded. Report the independent rules failure honestly.
    console.warn(`! Agent rules were not refreshed: ${error instanceof Error ? error.message : error}. Run logic2b rules after resolving this, or use --no-agent-rules.`)
  }
}
