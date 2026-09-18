import { constants, type Dirent } from "node:fs"
import { lstat, mkdir, open, realpath, rename, unlink, link, opendir } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import { buildChangePlan, validateChangePlan, changePath, sha256, analyzePackageChange, CHANGE_LIMITS, type ChangePlanV1 } from "@logic2b/scaffold/change-plan"
import { collectProjectSnapshot } from "./inspect.ts"

type Conflict = { path: string; reason: string }
type Hooks = { afterStage?: () => Promise<void>; beforeWrite?: (index: number, path: string) => Promise<void>; afterWrite?: (index: number, path: string) => Promise<void> }
type Phase = "prepared" | "applying" | "applied" | "interrupted" | "recovering" | "recovered" | "aborted"
type RecordState = "pending" | "writing" | "written" | "restoring" | "restored" | "skipped"
interface JournalRecord { path: string; beforeContent: string | null; mode: number; state: RecordState }
interface Journal { schemaVersion: 1; transactionId: string; root: string; plan: ChangePlanV1; phase: Phase; records: JournalRecord[]; digest: string }
interface FileData { content: string; hash: string; mode: number }
interface Root { path: string; dev: number; ino: number }
interface Owner { id: string; pid: number; token: string; kind: "apply" | "recover" }
interface ActiveOwner extends Owner { finished: boolean; generation: number }
export interface ChangeResult {
  schemaVersion: 1
  status: "applied" | "already-applied" | "ready" | "conflict" | "interrupted" | "recovered" | "already-recovered"
  id: string
  transactionId?: string
  files: string[]
  conflicts: Conflict[]
  dependencyInstallation: "not-run"
  notes: string[]
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const STORE = ".logic2b/changes"
const JOURNAL_BYTES = 4 * 1024 * 1024
const absent = (error: unknown) => (error as NodeJS.ErrnoException)?.code === "ENOENT"
const message = (error: unknown) => error instanceof Error ? error.message.slice(0, 500) : "Filesystem operation failed."
const bytes = (text: string) => Buffer.byteLength(text, "utf8")
const equal = (file: FileData | undefined, hash: string | null) => (file?.hash ?? null) === hash
const result = (plan: ChangePlanV1, status: ChangeResult["status"], conflicts: Conflict[] = [], transactionId?: string): ChangeResult => ({
  schemaVersion: 1, status, id: plan.id, ...(transactionId ? { transactionId } : {}), files: plan.operations.map(op => op.path), conflicts,
  dependencyInstallation: "not-run", notes: ["No dependencies, scripts or verification commands were executed.", "File replacement is atomic individually; the multi-file operation uses a recovery journal. Keep the workspace stable: portable filesystem APIs do not provide atomic compare-and-swap against unrelated writers.", "Recovery preserves files that were already applied before this transaction; newly created empty directories may remain."],
})

async function rootFor(cwd: string, appRoot = "."): Promise<Root> {
  const workspace = await realpath(resolve(cwd))
  const base = await lstat(workspace)
  const root = { path: workspace, dev: base.dev, ino: base.ino }
  if (!base.isDirectory()) throw new Error("Change workspace must be a directory.")
  if (appRoot === ".") return root
  changePath(appRoot)
  const path = await checked(root, appRoot, "directory")
  const stat = await lstat(path)
  return { path, dev: stat.dev, ino: stat.ino }
}

/** Recheck all parents; O_NOFOLLOW also protects the final opened file. */
async function checked(root: Root, path: string, kind: "file" | "directory" = "file", createParents = false, linkPeer?: string): Promise<string> {
  const rootStat = await lstat(root.path)
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || rootStat.dev !== root.dev || rootStat.ino !== root.ino || await realpath(root.path) !== root.path) throw new Error("Application root changed; retry in a stable workspace.")
  if (path === "." && kind === "directory") return root.path
  const parts = path.split("/")
  if (parts.some(part => !part || part === "." || part === "..") || /[\\:\x00-\x1f\x7f]/.test(path)) throw new Error("Unsafe transaction path.")
  let current = root.path
  for (let index = 0; index < parts.length; index++) {
    current = join(current, parts[index])
    const directory = index < parts.length - 1 || kind === "directory"
    if (directory && createParents) await mkdir(current, { mode: parts[0] === ".logic2b" ? 0o700 : 0o755 }).catch(error => { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error })
    try {
      const stat = await lstat(current)
      let ownedLink = false
      if (!directory && stat.nlink === 2 && linkPeer) {
        await checked(root, dirname(linkPeer), "directory")
        const peer = await lstat(join(root.path, linkPeer)).catch(error => { if (absent(error)) return undefined; throw error })
        ownedLink = !!peer && peer.isFile() && !peer.isSymbolicLink() && peer.dev === stat.dev && peer.ino === stat.ino
      }
      if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1 && !ownedLink)) throw new Error(`Unsafe transaction path: ${path}. Use ordinary directories and a single-link regular file.`)
    } catch (error) { if (!absent(error)) throw error }
  }
  return current
}

async function read(root: Root, path: string, limit: number = CHANGE_LIMITS.fileBytes, linkPeer?: string): Promise<FileData | undefined> {
  const target = await checked(root, path, "file", false, linkPeer)
  let handle
  try { handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW) } catch (error) { if (absent(error)) return undefined; throw error }
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.nlink !== 1 && !(stat.nlink === 2 && linkPeer) || stat.size > limit) throw new Error(`File exceeds its byte limit or is not an ordinary file: ${path}.`)
    const buffer = Buffer.alloc(limit + 1)
    let size = 0
    while (size < buffer.length) { const chunk = await handle.read(buffer, size, buffer.length - size, null); if (!chunk.bytesRead) break; size += chunk.bytesRead }
    if (size > limit) throw new Error(`File exceeds its byte limit: ${path}.`)
    await checked(root, path, "file", false, linkPeer)
    const after = await handle.stat(), entry = await lstat(target)
    if (entry.dev !== stat.dev || entry.ino !== stat.ino || stat.size !== after.size || stat.mtimeMs !== after.mtimeMs || stat.ctimeMs !== after.ctimeMs) throw new Error(`File changed while reading: ${path}.`)
    const content = new TextDecoder("utf8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, size))
    return { content, hash: await sha256(content), mode: stat.mode & 0o777 }
  } finally { await handle.close() }
}
async function syncDirectory(path: string) {
  const handle = await open(path, "r")
  try { await handle.sync() } catch (error) { if (!["EINVAL", "ENOTSUP", "EBADF"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error } finally { await handle.close() }
}
async function exclusive(root: Root, path: string, content: string, mode = 0o600) {
  const target = await checked(root, path, "file", true)
  const handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, mode)
  try { await handle.writeFile(content); await handle.chmod(mode); await handle.sync() } finally { await handle.close() }
}
async function saveJournal(root: Root, journal: Journal) {
  const { digest: _, ...body } = journal
  journal.digest = await sha256(JSON.stringify(body))
  const content = JSON.stringify(journal)
  if (bytes(content) > JOURNAL_BYTES) throw new Error("Transaction journal exceeds its byte budget.")
  const path = `${STORE}/${journal.transactionId}/journal.json`, temporary = `${STORE}/${journal.transactionId}/journal-${randomUUID()}.tmp`
  await exclusive(root, temporary, content)
  try { await checked(root, path); await rename(join(root.path, temporary), join(root.path, path)); await syncDirectory(dirname(join(root.path, path))) }
  finally { await unlink(join(root.path, temporary)).catch(error => { if (!absent(error)) throw error }) }
}
function requireId(id: string) { if (!UUID.test(id)) throw new Error("Expected a transaction UUID from change status/apply, not a plan hash.") }
async function loadJournal(root: Root, id: string): Promise<Journal> {
  requireId(id)
  const file = await read(root, `${STORE}/${id}/journal.json`, JOURNAL_BYTES)
  if (!file) throw new Error("Transaction journal was not found.")
  let raw: Journal
  try { raw = JSON.parse(file.content) } catch { throw new Error("Malformed transaction journal.") }
  if (!raw || typeof raw !== "object" || Object.keys(raw).sort().join() !== ["schemaVersion", "transactionId", "root", "plan", "phase", "records", "digest"].sort().join() || raw.schemaVersion !== 1 || raw.transactionId !== id || raw.root !== root.path || !["prepared", "applying", "applied", "interrupted", "recovering", "recovered", "aborted"].includes(raw.phase)) throw new Error("Unsupported or inconsistent transaction journal.")
  const { digest, ...body } = raw
  if (digest !== await sha256(JSON.stringify(body))) throw new Error("Transaction journal checksum mismatch; preserve the journal and inspect it before recovering.")
  const plan = await validateChangePlan(raw.plan)
  if (!Array.isArray(raw.records) || raw.records.length !== plan.operations.length) throw new Error("Incomplete transaction journal records.")
  let total = 0
  for (let i = 0; i < raw.records.length; i++) {
    const record = raw.records[i], op = plan.operations[i]
    if (!record || Object.keys(record).sort().join() !== ["path", "beforeContent", "mode", "state"].sort().join() || record.path !== op.path || !["pending", "writing", "written", "restoring", "restored", "skipped"].includes(record.state) || !Number.isInteger(record.mode) || record.mode < 0 || record.mode > 0o777) throw new Error("Invalid transaction journal record.")
    if (record.state === "skipped") { if (record.beforeContent !== null || record.mode !== 0) throw new Error("Invalid skipped transaction record."); continue }
    if (record.beforeContent !== null && typeof record.beforeContent !== "string") throw new Error("Invalid original transaction content.")
    const size = record.beforeContent === null ? 0 : bytes(record.beforeContent)
    total += size
    if (size > CHANGE_LIMITS.fileBytes || total > CHANGE_LIMITS.totalFileBytes || (record.beforeContent === null ? null : await sha256(record.beforeContent)) !== op.beforeSha256) throw new Error("Original transaction content does not match its precondition.")
  }
  return raw
}

// Each complete owner is published by an exclusive hard link. Recovery claims
// append to an immutable chain keyed by the predecessor's random token: two
// recoverers can never both replace a stale lock. No stale owner is unlinked.
async function readOwner(root: Root, path: string): Promise<Owner | undefined> {
  await checked(root, dirname(path), "directory")
  let handle
  try { handle = await open(join(root.path, path), constants.O_RDONLY | constants.O_NOFOLLOW) } catch (error) { if (absent(error)) return undefined; throw error }
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.nlink !== 2 || stat.size > 512) throw new Error("Malformed transaction owner; preserve it for inspection.")
    const buffer = Buffer.alloc(513), { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    let raw: Owner
    try { raw = JSON.parse(buffer.subarray(0, bytesRead).toString("utf8")) } catch { throw new Error("Malformed transaction owner.") }
    if (!raw || Object.keys(raw).sort().join() !== "id,kind,pid,token" || !UUID.test(raw.id) || !UUID.test(raw.token) || !Number.isInteger(raw.pid) || raw.pid < 1 || !["apply", "recover"].includes(raw.kind)) throw new Error("Malformed transaction owner.")
    await checked(root, `${STORE}/${raw.id}`, "directory")
    const peer = await lstat(join(root.path, STORE, raw.id, `owner-${raw.token}.json`))
    const current = await lstat(join(root.path, path))
    if (!peer.isFile() || peer.isSymbolicLink() || peer.nlink !== 2 || peer.dev !== stat.dev || peer.ino !== stat.ino || current.dev !== stat.dev || current.ino !== stat.ino) throw new Error("Transaction owner changed.")
    return raw
  } finally { await handle.close() }
}
async function activeOwner(root: Root): Promise<ActiveOwner | undefined> {
  let owner = await readOwner(root, `${STORE}/active.json`)
  if (!owner) return undefined
  const seen = new Set<string>()
  for (let i = 0; i < 256; i++) {
    if (seen.has(owner.token)) throw new Error("Malformed transaction ownership chain.")
    seen.add(owner.token)
    const next = await readOwner(root, `${STORE}/${owner.id}/claim-${owner.token}.json`)
    if (!next) {
      const finished = await read(root, `${STORE}/${owner.id}/finished-${owner.token}`, 64)
      if (finished && finished.content !== owner.token) throw new Error("Malformed transaction completion marker.")
      return { ...owner, finished: !!finished, generation: i + 1 }
    }
    if (next.id !== owner.id || next.kind !== "recover") throw new Error("Inconsistent recovery owner.")
    owner = next
  }
  throw new Error("Transaction ownership exceeds 256 attempts; preserve journals for inspection.")
}
async function publishOwner(root: Root, owner: Owner, target: string) {
  const peer = `${STORE}/${owner.id}/owner-${owner.token}.json`
  await exclusive(root, peer, JSON.stringify(owner))
  await checked(root, dirname(target), "directory")
  await link(join(root.path, peer), join(root.path, target))
  await syncDirectory(dirname(join(root.path, target)))
}
async function acquire(root: Root, id: string, kind: Owner["kind"]): Promise<Owner> {
  const owner = { id, pid: process.pid, token: randomUUID(), kind }
  await publishOwner(root, owner, `${STORE}/active.json`)
  return owner
}
async function claimRecovery(root: Root, previous: ActiveOwner): Promise<Owner> {
  if (previous.generation >= 256) throw new Error("Transaction ownership reached 256 attempts; preserve journals for inspection.")
  const owner: Owner = { id: previous.id, pid: process.pid, token: randomUUID(), kind: "recover" }
  await publishOwner(root, owner, `${STORE}/${previous.id}/claim-${previous.token}.json`)
  if ((await activeOwner(root))?.token !== owner.token) throw new Error("Transaction ownership changed before recovery.")
  return owner
}
async function finishOwner(root: Root, owner: Owner) {
  await exclusive(root, `${STORE}/${owner.id}/finished-${owner.token}`, owner.token)
  await syncDirectory(join(root.path, STORE, owner.id))
}
async function release(root: Root, expected: Owner) {
  const owner = await activeOwner(root)
  if (owner?.id !== expected.id || owner.token !== expected.token) throw new Error("Transaction lock no longer belongs to this operation.")
  await unlink(join(root.path, STORE, "active.json")); await syncDirectory(join(root.path, STORE))
}
const running = (pid: number) => { try { process.kill(pid, 0); return true } catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH" } }

async function inspectTargets(root: Root, plan: ChangePlanV1) {
  const files: (FileData | undefined)[] = [], conflicts: Conflict[] = []
  let total = 0
  for (const op of plan.operations) {
    let file: FileData | undefined
    try {
      file = await read(root, op.path); total += file ? bytes(file.content) : 0
      if (!equal(file, op.beforeSha256) && !equal(file, op.afterSha256)) conflicts.push({ path: op.path, reason: "File differs from both the expected original and planned content. Inspect it and generate a fresh plan." })
      if (op.path === "package.json" && !equal(file, op.afterSha256)) {
        const policy = analyzePackageChange(file?.content ?? null, op.content)
        conflicts.push(...policy.unsupported.map(reason => ({ path: op.path, reason })))
        if (JSON.stringify(policy.dependencies) !== JSON.stringify(plan.dependencies)) conflicts.push({ path: op.path, reason: "Dependency metadata does not match the actual package.json change." })
      }
    } catch (error) { conflicts.push({ path: op.path, reason: message(error) }) }
    files.push(file)
  }
  if (total > CHANGE_LIMITS.totalFileBytes) conflicts.push({ path: ".", reason: "Original files exceed the total recovery byte budget; split the change." })
  return { files, conflicts }
}

export async function planLocalChange(options: { cwd: string; appRoot?: string; candidates: { path: string; content: string; reason: string }[]; registryVersion?: string }): Promise<ChangePlanV1> {
  if (!Array.isArray(options.candidates) || options.candidates.length < 1 || options.candidates.length > CHANGE_LIMITS.operations) throw new Error("Provide 1–32 explicit change candidates.")
  const root = await rootFor(options.cwd, options.appRoot)
  const observed: { path: string; file: FileData | undefined }[] = []
  for (const candidate of options.candidates) observed.push({ path: changePath(candidate?.path), file: await read(root, changePath(candidate?.path)) })
  const snapshot = await collectProjectSnapshot({ cwd: options.cwd, appRoot: options.appRoot, capabilities: { fileWrites: true, dependencyInstall: false, browser: false } })
  for (const { path, file } of observed) {
    const existing = snapshot.files.find(item => item.path === path)
    if (existing && existing.sha256 !== file?.hash) throw new Error(`File changed during context collection: ${path}.`)
    if (!existing && file) snapshot.files.push({ path, sha256: file.hash })
    const latest = await read(root, path)
    if (!equal(latest, file?.hash ?? null)) throw new Error(`File changed during planning: ${path}.`)
  }
  return buildChangePlan({ schemaVersion: 1, snapshot, ...(options.registryVersion !== undefined ? { registryVersion: options.registryVersion } : {}), candidates: options.candidates, missingFiles: observed.filter(item => !item.file).map(item => item.path) })
}

const temporaryFor = (path: string, id: string, index: number) => join(dirname(path), `.logic2b-change-${id}-${index}.tmp`)
async function publish(root: Root, path: string, content: string, expected: string | null, mode: number, id: string, index: number) {
  const target = await checked(root, path, "file", true)
  const temporary = temporaryFor(path, id, index)
  await exclusive(root, temporary, content, mode)
  try {
    const current = await read(root, path)
    if (!equal(current, expected) || current && current.mode !== mode) throw new Error(`File changed immediately before replacement: ${path}.`)
    await checked(root, path)
    if (expected === null) {
      // link() refuses a concurrently created target instead of replacing it.
      await link(join(root.path, temporary), target)
      await unlink(join(root.path, temporary))
    } else await rename(join(root.path, temporary), target)
    await syncDirectory(dirname(target))
  } finally { await unlink(join(root.path, temporary)).catch(error => { if (!absent(error)) throw error }) }
}

export async function applyLocalChange(options: { cwd: string; plan: unknown; dryRun?: boolean; hooks?: Hooks }): Promise<ChangeResult> {
  const plan = await validateChangePlan(options.plan)
  if (plan.conflicts.length || plan.unsupported.length) return result(plan, "conflict", [...plan.conflicts, ...plan.unsupported.map(reason => ({ path: ".", reason }))])
  const root = await rootFor(options.cwd, plan.appRoot)
  const active = await activeOwner(root)
  if (active) return result(plan, "conflict", [{ path: ".logic2b/changes", reason: `Transaction ${active.id} must finish or be recovered before applying another change.` }], active.id)
  const initial = await inspectTargets(root, plan)
  if (initial.conflicts.length) return result(plan, "conflict", initial.conflicts)
  if (initial.files.every((file, i) => equal(file, plan.operations[i].afterSha256))) return result(plan, "already-applied")
  if (options.dryRun) return result(plan, "ready")
  const id = randomUUID()
  const journal: Journal = { schemaVersion: 1, transactionId: id, root: root.path, plan, phase: "prepared", records: initial.files.map((file, i) => equal(file, plan.operations[i].afterSha256) ? { path: plan.operations[i].path, beforeContent: null, mode: 0, state: "skipped" } : { path: plan.operations[i].path, beforeContent: file?.content ?? null, mode: file?.mode ?? 0o644, state: "pending" }), digest: "" }
  await checked(root, `${STORE}/${id}`, "directory", true)
  await saveJournal(root, journal)
  let owner: Owner | undefined, started = false
  try {
    for (let i = 0; i < plan.operations.length; i++) if (journal.records[i].state !== "skipped") await exclusive(root, `${STORE}/${id}/${i}.new`, plan.operations[i].content)
    owner = await acquire(root, id, "apply")
    await options.hooks?.afterStage?.()
    const fresh = await inspectTargets(root, plan)
    for (let i = 0; i < fresh.files.length; i++) if (!equal(fresh.files[i], initial.files[i]?.hash ?? null) || fresh.files[i]?.mode !== initial.files[i]?.mode) fresh.conflicts.push({ path: plan.operations[i].path, reason: "File changed after staging; generate a fresh plan." })
    for (let i = 0; i < plan.operations.length; i++) if (journal.records[i].state !== "skipped" && !equal(await read(root, `${STORE}/${id}/${i}.new`), plan.operations[i].afterSha256)) fresh.conflicts.push({ path: plan.operations[i].path, reason: "Staged content changed; transaction cannot proceed." })
    if (fresh.conflicts.length) { journal.phase = "aborted"; await saveJournal(root, journal); await release(root, owner); return result(plan, "conflict", fresh.conflicts, id) }
    journal.phase = "applying"; await saveJournal(root, journal)
    for (let i = 0; i < plan.operations.length; i++) {
      const op = plan.operations[i], record = journal.records[i]
      if (record.state === "skipped") continue
      await options.hooks?.beforeWrite?.(i, op.path)
      const current = await read(root, op.path)
      if (!equal(current, op.beforeSha256) || current?.mode !== initial.files[i]?.mode) throw new Error(`File changed before writing: ${op.path}.`)
      if (!equal(await read(root, `${STORE}/${id}/${i}.new`), op.afterSha256)) throw new Error(`Staged content changed: ${op.path}.`)
      record.state = "writing"; await saveJournal(root, journal); started = true
      await publish(root, op.path, op.content, op.beforeSha256, record.mode, id, i)
      record.state = "written"; await saveJournal(root, journal)
      await options.hooks?.afterWrite?.(i, op.path)
    }
    journal.phase = "applied"; await saveJournal(root, journal); await release(root, owner)
    return result(plan, "applied", [], id)
  } catch (error) {
    journal.phase = started ? "interrupted" : "aborted"
    await saveJournal(root, journal)
    if (owner && !started) await release(root, owner)
    return result(plan, started ? "interrupted" : "conflict", [{ path: ".", reason: message(error) }], id)
  } finally { if (owner) await finishOwner(root, owner) }
}

async function inspectRecovery(root: Root, journal: Journal) {
  const plan = journal.plan
  const conflicts: Conflict[] = []
  const observed: (FileData | undefined)[] = []
  for (let i = 0; i < journal.records.length; i++) {
    const record = journal.records[i], op = plan.operations[i]
    if (["pending", "skipped"].includes(record.state)) { observed.push(undefined); continue }
    try {
      const file = await read(root, record.path, CHANGE_LIMITS.fileBytes, temporaryFor(record.path, journal.transactionId, i))
      if ((!equal(file, op.beforeSha256) && (record.state === "restored" || !equal(file, op.afterSha256))) || file && file.mode !== record.mode) conflicts.push({ path: record.path, reason: "Recovery would overwrite a newer edit or permission change; preserve it and resolve the conflict first." })
      observed.push(file)
    } catch (error) { observed.push(undefined); conflicts.push({ path: record.path, reason: message(error) }) }
  }
  return { conflicts, observed }
}

export async function recoverLocalChange(options: { cwd: string; appRoot?: string; id: string; dryRun?: boolean; hooks?: Hooks }): Promise<ChangeResult> {
  const root = await rootFor(options.cwd, options.appRoot)
  let journal = await loadJournal(root, options.id)
  const plan = journal.plan, active = await activeOwner(root)
  if (active && active.id !== options.id) return result(plan, "conflict", [{ path: STORE, reason: `Another transaction is active: ${active.id}.` }], options.id)
  if (active && !active.finished && running(active.pid)) return result(plan, "conflict", [{ path: STORE, reason: "The transaction process is still running. Wait for it to finish before recovering." }], options.id)
  const terminal = ["recovered", "aborted"].includes(journal.phase)
  if (terminal && (!active || options.dryRun)) return result(plan, "already-recovered", [], options.id)
  const initial = await inspectRecovery(root, journal)
  if (initial.conflicts.length) return result(plan, "conflict", initial.conflicts, options.id)
  if (options.dryRun) return result(plan, "ready", [], options.id)
  let owner: Owner
  try { owner = active ? await claimRecovery(root, active) : await acquire(root, options.id, "recover") }
  catch (error) { return result(plan, "conflict", [{ path: STORE, reason: `Could not claim recovery exclusively: ${message(error)}` }], options.id) }
  try {
    // A different attempt may have finished between the initial read and claim.
    // Reload both journal and all preconditions while holding this generation.
    journal = await loadJournal(root, options.id)
    if (["recovered", "aborted"].includes(journal.phase)) {
      await release(root, owner)
      return result(plan, "already-recovered", [], options.id)
    }
    const { conflicts, observed } = await inspectRecovery(root, journal)
    if (conflicts.length) return result(plan, "conflict", conflicts, options.id)
    // A termination between create's atomic link and unlink may leave the
    // owned temporary name attached. Check its inode/content before cleanup.
    for (let i = 0; i < journal.records.length; i++) {
      const record = journal.records[i], op = plan.operations[i]
      if (["pending", "skipped"].includes(record.state)) continue
      const temporary = temporaryFor(record.path, options.id, i)
      const staged = await read(root, temporary, CHANGE_LIMITS.fileBytes, record.path)
      if (staged) {
        if (!equal(staged, op.beforeSha256) && !equal(staged, op.afterSha256)) throw new Error(`Recovery temporary content changed: ${record.path}.`)
        await unlink(join(root.path, temporary))
      }
    }
    journal.phase = "recovering"; await saveJournal(root, journal)
    for (let i = journal.records.length - 1; i >= 0; i--) {
      const record = journal.records[i], op = plan.operations[i]
      if (["pending", "skipped"].includes(record.state)) continue
      await options.hooks?.beforeWrite?.(i, op.path)
      const current = await read(root, op.path)
      if (!equal(current, observed[i]?.hash ?? null) || current?.mode !== observed[i]?.mode) throw new Error(`File changed during recovery: ${op.path}.`)
      if (equal(current, op.beforeSha256)) { record.state = "restored"; await saveJournal(root, journal); continue }
      record.state = "restoring"; await saveJournal(root, journal)
      if (record.beforeContent === null) { await checked(root, op.path); await unlink(join(root.path, op.path)); await syncDirectory(dirname(join(root.path, op.path))) }
      else await publish(root, op.path, record.beforeContent, op.afterSha256, record.mode, options.id, i)
      record.state = "restored"; await saveJournal(root, journal)
      await options.hooks?.afterWrite?.(i, op.path)
    }
    journal.phase = "recovered"; await saveJournal(root, journal); await release(root, owner)
    return result(plan, "recovered", [], options.id)
  } catch (error) {
    journal.phase = "interrupted"; await saveJournal(root, journal)
    return result(plan, "interrupted", [{ path: ".", reason: message(error) }], options.id)
  } finally { await finishOwner(root, owner) }
}

export async function listChangeTransactions(cwd: string, appRoot?: string) {
  const root = await rootFor(cwd, appRoot), active = await activeOwner(root)
  const directory = await checked(root, STORE, "directory")
  const entries: Dirent[] = []
  try {
    for await (const entry of await opendir(directory)) {
      entries.push(entry)
      if (entries.length > 256) throw new Error("Transaction history exceeds 256 entries; archive completed journals before listing more.")
    }
  } catch (error) { if (!absent(error)) throw error }
  const transactions = [], issues: { path: string; reason: string; active: boolean }[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "active.json") continue
    try {
      requireId(entry.name)
      const journal = await loadJournal(root, entry.name)
      transactions.push({ id: entry.name, planId: journal.plan.id, state: journal.phase, fileCount: journal.records.filter(record => record.state !== "skipped").length, active: active?.id === entry.name })
    } catch (error) { issues.push({ path: `${STORE}/${entry.name}`, reason: message(error), active: active?.id === entry.name }) }
  }
  return { schemaVersion: 1 as const, transactions, issues }
}

/** Read an explicitly selected request/plan artifact without executing it. */
export async function readChangeArtifact(path: string): Promise<unknown> {
  const handle = await open(resolve(path), constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > CHANGE_LIMITS.planBytes) throw new Error("Change artifact must be a single-link regular file within the 2 MiB limit.")
    const buffer = Buffer.alloc(CHANGE_LIMITS.planBytes + 1)
    let size = 0
    while (size < buffer.length) { const read = await handle.read(buffer, size, buffer.length - size, null); if (!read.bytesRead) break; size += read.bytesRead }
    if (size > CHANGE_LIMITS.planBytes) throw new Error("Change artifact exceeds the 2 MiB limit.")
    const after = await handle.stat()
    if (stat.size !== after.size || stat.mtimeMs !== after.mtimeMs || stat.ctimeMs !== after.ctimeMs) throw new Error("Change artifact changed while reading.")
    try { return JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(buffer.subarray(0, size))) } catch { throw new Error("Change artifact must contain valid UTF-8 JSON.") }
  } finally { await handle.close() }
}
export async function writeChangeArtifact(path: string, plan: ChangePlanV1) {
  const target = resolve(path)
  const handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
  try { await handle.writeFile(JSON.stringify(plan, null, 2) + "\n"); await handle.sync() } finally { await handle.close() }
}
