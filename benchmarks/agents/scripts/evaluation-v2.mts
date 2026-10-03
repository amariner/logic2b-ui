import { createHash } from "node:crypto"
import { constants } from "node:fs"
import { lstat, open } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"

export type Metric = number | "unavailable"
export type CheckStatus = "passed" | "failed" | "unknown" | "not-run"
export interface Protocol {
  schemaVersion: 2
  id: string
  version: string
  minimumAttempts: number
  conditions: { id: string; label: string; availability: "available" | "planned"; tools: string[]; [key: string]: unknown }[]
  tasks: { id: string; title: string; prompt: string; fixtureId: string; heldOut: boolean; checks: { id: string; kind: "build" | "browser" | "human"; description: string; required: boolean; independent: boolean }[] }[]
  design: Record<string, unknown>
}
export interface Attempt {
  schemaVersion: 2
  protocolVersion: string
  attemptId: string
  classification: "real" | "synthetic"
  conditionId: string
  taskId: string
  repetition: number
  order: number
  cohortId: string
  workspace: { id: string; fresh: boolean }
  fixture: { id: string; sha256: string }
  versions: { registry: string; cli: string; mcp: string; toolSchema: string }
  host: { name: string; version: string }
  model: { name: string; version: string; versionKind: "alias" | "immutable" }
  environment: { os: string; node: string }
  capabilities: { network: boolean; shell: boolean; mcp: boolean; tools: string[] }
  budget: { elapsedMs: number; toolCalls: number; inputBytes: number; outputBytes: number; tokens: Metric }
  status: "completed" | "failed" | "timed-out" | "interrupted"
  assistance: "autonomous" | "human-assisted"
  metrics: { elapsedMs: Metric; toolCalls: Metric; inputBytes: Metric; outputBytes: Metric; tokens: Metric }
  humanCorrections: { count: Metric; reasonArtifactIds?: string[] }
  checks: { id: string; status: CheckStatus; artifactIds: string[]; observer: "independent" | "agent" }[]
  artifacts: { id: string; path: string; sha256: string; bytes: number }[]
}
export interface EvaluatedAttempt {
  attempt: Attempt
  integrity: { status: "passed" | "failed"; issues: string[] }
  checks: { id: string; kind: string; status: CheckStatus; reason: string }[]
  budgetStatus: "passed" | "failed" | "unknown"
  success: boolean
}

export const LIMITS = { manifestBytes: 1_000_000, artifactBytes: 16_000_000, totalArtifactBytes: 64_000_000, attempts: 1000, artifacts: 128 } as const
const ID = /^[a-z0-9][a-z0-9._-]{0,127}$/
const HASH = /^sha256-[a-f0-9]{64}$/
const METRICS = ["elapsedMs", "toolCalls", "inputBytes", "outputBytes", "tokens"] as const
type Obj = Record<string, unknown>

function object(value: unknown, label: string): Obj {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`)
  return value as Obj
}
function keys(value: Obj, allowed: string[], label: string) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error(`${label} contains unsupported keys.`)
}
function string(value: unknown, label: string, pattern?: RegExp): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 256 || /[\x00-\x1f]/.test(value) || (pattern && !pattern.test(value))) throw new Error(`${label} must be a bounded valid string.`)
}
function integer(value: unknown, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`${label} must be an integer between ${min} and ${max}.`)
}
function metric(value: unknown, label: string) { if (value !== "unavailable") integer(value, label) }
function boolean(value: unknown, label: string) { if (typeof value !== "boolean") throw new Error(`${label} must be a boolean.`) }
function choice(value: unknown, allowed: string[], label: string) { if (typeof value !== "string" || !allowed.includes(value)) throw new Error(`${label} has an unsupported value.`) }
function array(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label} must be an array with at most ${max} entries.`)
  return value
}
function ids(value: unknown, label: string, max = 128): string[] {
  const values = array(value, label, max)
  for (const id of values) string(id, label, ID)
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicates.`)
  return values as string[]
}
function unique(values: string[], label: string) { if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicates.`) }
function validateIdentity(a: Obj, includeTools: boolean) {
  for (const [key, fields] of Object.entries({ versions: ["registry", "cli", "mcp", "toolSchema"], host: ["name", "version"], model: ["name", "version", "versionKind"], environment: ["os", "node"] })) {
    const value = object(a[key], key); keys(value, fields, key)
    for (const field of fields) string(value[field], `${key}.${field}`, /^[^\\/]+$/)
  }
  choice((a.model as Obj).versionKind, ["alias", "immutable"], "model.versionKind")
  for (const name of ["registry", "cli", "mcp"]) string((a.versions as Obj)[name], `versions.${name}`, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
  const capabilityKeys = ["network", "shell", "mcp", ...(includeTools ? ["tools"] : [])]
  const capabilities = object(a.capabilities, "capabilities"); keys(capabilities, capabilityKeys, "capabilities")
  for (const key of ["network", "shell", "mcp"]) boolean(capabilities[key], `capabilities.${key}`)
  if (includeTools) ids(capabilities.tools, "capabilities.tools")
  const budget = object(a.budget, "budget"); keys(budget, ["elapsedMs", "toolCalls", "inputBytes", "outputBytes", "tokens"], "budget")
  for (const key of ["elapsedMs", "toolCalls", "inputBytes", "outputBytes"]) integer(budget[key], `budget.${key}`, 1)
  metric(budget.tokens, "budget.tokens")
}

export function validateProtocol(raw: unknown): Protocol {
  const p = object(raw, "Protocol")
  keys(p, ["schemaVersion", "id", "version", "status", "description", "minimumAttempts", "conditions", "tasks", "design"], "Protocol")
  if (p.schemaVersion !== 2) throw new Error("Protocol requires schemaVersion 2.")
  string(p.id, "Protocol id", ID); string(p.version, "Protocol version")
  integer(p.minimumAttempts, "minimumAttempts", 5, 100)
  const conditions = array(p.conditions, "conditions", 16)
  const tasks = array(p.tasks, "tasks", 32)
  if (!conditions.length || !tasks.length) throw new Error("Protocol needs conditions and tasks.")
  if (conditions.length * tasks.length * p.minimumAttempts > LIMITS.attempts) throw new Error("Protocol minimum pilot exceeds attempt count limit.")
  for (const rawCondition of conditions) {
    const c = object(rawCondition, "Condition")
    keys(c, ["id", "label", "availability", "tools", "access", "intervention", "unavailableTools"], "Condition")
    string(c.id, "Condition id", ID); string(c.label, "Condition label")
    choice(c.availability, ["available", "planned"], "Condition availability")
    ids(c.tools, "Condition tools")
  }
  unique(conditions.map((c) => (c as Obj).id as string), "Condition ids")
  for (const rawTask of tasks) {
    const t = object(rawTask, "Task")
    keys(t, ["id", "title", "prompt", "fixtureId", "fixtureStatus", "heldOut", "checks"], "Task")
    string(t.id, "Task id", ID); string(t.fixtureId, "Fixture id", ID); string(t.title, "Task title")
    if (typeof t.prompt !== "string" || !t.prompt.trim() || t.prompt.length > 16_000) throw new Error("Task prompt must be bounded text.")
    boolean(t.heldOut, "Task heldOut")
    const checks = array(t.checks, "Task checks", 64)
    if (!checks.length) throw new Error("Task requires independent checks.")
    for (const rawCheck of checks) {
      const c = object(rawCheck, "Check")
      keys(c, ["id", "kind", "description", "required", "independent"], "Check")
      string(c.id, "Check id", ID); choice(c.kind, ["build", "browser", "human"], "Check kind")
      if (typeof c.description !== "string" || !c.description.trim() || c.description.length > 2048) throw new Error("Check description must be bounded text.")
      if (c.required !== true || c.independent !== true) throw new Error("Protocol checks must be required and independent.")
    }
    unique(checks.map((c) => (c as Obj).id as string), "Check ids")
    if (!["build", "browser", "human"].every((kind) => checks.some((c) => (c as Obj).kind === kind))) throw new Error("Each task requires build, browser and human checks.")
  }
  unique(tasks.map((t) => (t as Obj).id as string), "Task ids")
  object(p.design, "Protocol design")
  return raw as Protocol
}

export function validateAttempt(raw: unknown, protocol: Protocol): Attempt {
  const a = object(raw, "Attempt")
  keys(a, ["schemaVersion", "protocolVersion", "attemptId", "classification", "conditionId", "taskId", "repetition", "order", "cohortId", "workspace", "fixture", "versions", "host", "model", "environment", "capabilities", "budget", "status", "assistance", "metrics", "humanCorrections", "checks", "artifacts"], "Attempt")
  if (a.schemaVersion !== 2 || a.protocolVersion !== protocol.version) throw new Error("Attempt requires schemaVersion 2 and the exact protocolVersion.")
  for (const key of ["attemptId", "conditionId", "taskId", "cohortId"]) string(a[key], key, ID)
  const condition = protocol.conditions.find((c) => c.id === a.conditionId)
  const task = protocol.tasks.find((t) => t.id === a.taskId)
  if (!condition || !task) throw new Error("Attempt references an unknown condition or task.")
  choice(a.classification, ["real", "synthetic"], "classification")
  if (a.classification === "real" && condition.availability !== "available") throw new Error("Real attempts cannot claim a planned condition is available.")
  integer(a.repetition, "repetition", 1, 100); integer(a.order, "order", 1, 100_000)
  choice(a.status, ["completed", "failed", "timed-out", "interrupted"], "status")
  choice(a.assistance, ["autonomous", "human-assisted"], "assistance")
  const workspace = object(a.workspace, "workspace"); keys(workspace, ["id", "fresh"], "workspace")
  string(workspace.id, "Workspace id", ID)
  if (workspace.fresh !== true) throw new Error("Every attempt requires a fresh workspace.")
  const fixture = object(a.fixture, "fixture"); keys(fixture, ["id", "sha256"], "fixture")
  if (fixture.id !== task.fixtureId) throw new Error("Attempt fixture does not match the task.")
  string(fixture.sha256, "Fixture sha256", HASH)
  validateIdentity(a, true)
  const capabilities = a.capabilities as Obj
  const tools = ids(capabilities.tools, "capabilities.tools")
  if (JSON.stringify([...tools].sort()) !== JSON.stringify([...condition.tools].sort())) throw new Error("Attempt tools must match the condition's declared tools.")
  const metrics = object(a.metrics, "metrics"); keys(metrics, [...METRICS], "metrics")
  for (const key of METRICS) metric(metrics[key], `metrics.${key}`)
  const corrections = object(a.humanCorrections, "humanCorrections"); keys(corrections, ["count", "reasonArtifactIds"], "humanCorrections")
  metric(corrections.count, "humanCorrections.count")
  if (a.assistance === "autonomous" && typeof corrections.count === "number" && corrections.count > 0) throw new Error("Human corrections require human-assisted classification.")
  const artifacts = array(a.artifacts, "artifacts", LIMITS.artifacts)
  let total = 0
  for (const rawArtifact of artifacts) {
    const artifact = object(rawArtifact, "Artifact"); keys(artifact, ["id", "path", "sha256", "bytes"], "Artifact")
    string(artifact.id, "Artifact id", ID); string(artifact.sha256, "Artifact sha256", HASH)
    safeRelativePath(artifact.path)
    integer(artifact.bytes, "Artifact bytes", 0, LIMITS.artifactBytes)
    total += artifact.bytes
  }
  if (total > LIMITS.totalArtifactBytes) throw new Error("Attempt exceeds total artifact byte limit.")
  unique(artifacts.map((v) => (v as Obj).id as string), "Artifact ids")
  unique(artifacts.map((v) => (v as Obj).path as string), "Artifact paths")
  const artifactIds = new Set(artifacts.map((v) => (v as Obj).id))
  const reasons = corrections.reasonArtifactIds === undefined ? [] : ids(corrections.reasonArtifactIds, "Correction reason artifactIds")
  if (reasons.some((id) => !artifactIds.has(id)) || (typeof corrections.count === "number" && corrections.count > 0 && reasons.length === 0)) throw new Error("Human corrections require referenced reason artifacts.")
  const checks = array(a.checks, "checks", 64)
  for (const rawCheck of checks) {
    const c = object(rawCheck, "Attempt check"); keys(c, ["id", "status", "artifactIds", "observer"], "Attempt check")
    if (!task.checks.some((check) => check.id === c.id)) throw new Error("Attempt has an unknown check id.")
    choice(c.status, ["passed", "failed", "unknown", "not-run"], "Check status")
    choice(c.observer, ["independent", "agent"], "Check observer")
    if (ids(c.artifactIds, "Check artifactIds").some((id) => !artifactIds.has(id))) throw new Error("Check references an unknown artifact.")
  }
  unique(checks.map((v) => (v as Obj).id as string), "Attempt check ids")
  return raw as Attempt
}

function safeRelativePath(path: unknown): asserts path is string {
  string(path, "Artifact path")
  if (isAbsolute(path) || path.includes("\\") || path.includes(":") || path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Unsafe artifact path; use a relative path without traversal.")
}
export async function readBoundedFile(root: string, path: string, maxBytes: number): Promise<Buffer> {
  safeRelativePath(path)
  const target = resolve(root, path)
  const info = await lstat(root)
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Evidence root must be a regular directory; symlinks are rejected.")
  let current = root
  const segments = relative(root, target).split(sep)
  for (const [index, segment] of segments.entries()) {
    current = resolve(current, segment)
    const stat = await lstat(current)
    if (stat.isSymbolicLink()) throw new Error("Evidence symlinks are rejected.")
    if (index === segments.length - 1 ? !stat.isFile() : !stat.isDirectory()) throw new Error("Evidence requires regular files and directories; special files are rejected.")
  }
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > maxBytes) throw new Error("Evidence must be a regular file within the byte limit.")
    const buffer = Buffer.alloc(Math.min(stat.size + 1, maxBytes + 1))
    let bytes = 0
    while (bytes < buffer.length) {
      const result = await handle.read(buffer, bytes, buffer.length - bytes, bytes)
      if (!result.bytesRead) break
      bytes += result.bytesRead
    }
    if (bytes > maxBytes || bytes !== stat.size) throw new Error("Evidence changed during reading or exceeds its byte limit.")
    return buffer.subarray(0, bytes)
  } finally { await handle.close() }
}
export function sha256(bytes: Buffer | string): string { return `sha256-${createHash("sha256").update(bytes).digest("hex")}` }

export async function evaluateAttempt(attemptDir: string, protocol: Protocol): Promise<EvaluatedAttempt> {
  const attempt = validateAttempt(JSON.parse((await readBoundedFile(attemptDir, "attempt.json", LIMITS.manifestBytes)).toString("utf8")), protocol)
  const issues: string[] = []
  const invalidIds = new Set<string>()
  for (const artifact of attempt.artifacts) {
    try {
      const bytes = await readBoundedFile(attemptDir, artifact.path, artifact.bytes)
      if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) throw new Error("Artifact hash or size mismatch.")
    } catch {
      invalidIds.add(artifact.id)
      issues.push(`Artifact ${artifact.id} is missing, unsafe, oversized or has a hash/size mismatch.`)
    }
  }
  const task = protocol.tasks.find((t) => t.id === attempt.taskId)!
  const checks = task.checks.map((spec) => {
    const observed = attempt.checks.find((c) => c.id === spec.id)
    let status: CheckStatus = observed?.status ?? "not-run"
    let reason = observed ? "Recorded evaluator observation; artifact hashes verify retained bytes only." : "No observation supplied."
    if (observed && (observed.observer !== "independent" || !observed.artifactIds.length || observed.artifactIds.some((id) => invalidIds.has(id)))) {
      status = "unknown"
      reason = "Independent observation and verified referenced artifacts are required."
    }
    return { id: spec.id, kind: spec.kind, status, reason }
  })
  const requiredUsage = (["elapsedMs", "toolCalls", "inputBytes", "outputBytes"] as const).map((key) => ({ usage: attempt.metrics[key], limit: attempt.budget[key] }))
  if (typeof attempt.budget.tokens === "number") requiredUsage.push({ usage: attempt.metrics.tokens, limit: attempt.budget.tokens })
  const budgetStatus = requiredUsage.some(({ usage, limit }) => typeof usage === "number" && usage > limit) ? "failed" : requiredUsage.some(({ usage }) => usage === "unavailable") ? "unknown" : "passed"
  const noUnrecordedCorrections = attempt.assistance !== "autonomous" || attempt.humanCorrections.count === 0
  return { attempt, integrity: { status: issues.length ? "failed" : "passed", issues }, checks, budgetStatus, success: !issues.length && budgetStatus === "passed" && noUnrecordedCorrections && attempt.status === "completed" && checks.every((c) => c.status === "passed") }
}

export interface Summary { available: number; unavailable: number; median: number | null; min: number | null; max: number | null }
function summarize(values: Metric[]): Summary {
  const numbers = values.filter((v): v is number => typeof v === "number").sort((a, b) => a - b)
  const n = numbers.length
  return { available: n, unavailable: values.length - n, median: n ? (numbers[Math.floor((n - 1) / 2)] + numbers[Math.floor(n / 2)]) / 2 : null, min: numbers[0] ?? null, max: numbers[n - 1] ?? null }
}
function aggregate(attempts: EvaluatedAttempt[], primary = false) {
  const successes = attempts.filter((a) => a.success && (!primary || a.attempt.assistance === "autonomous")).length
  return { attempts: attempts.length, successes, failures: attempts.length - successes, rate: attempts.length ? successes / attempts.length : null, metrics: Object.fromEntries(METRICS.map((key) => [key, summarize(attempts.map((a) => primary && a.attempt.assistance === "human-assisted" ? "unavailable" : a.attempt.metrics[key]))])) as Record<typeof METRICS[number], Summary>, humanCorrections: summarize(attempts.map((a) => a.attempt.humanCorrections.count)) }
}
function profile(a: Attempt) {
  return { cohortId: a.cohortId, host: a.host, model: a.model, environment: a.environment, capabilities: { network: a.capabilities.network, shell: a.capabilities.shell, mcp: a.capabilities.mcp }, versions: a.versions, budget: a.budget, fixture: a.fixture }
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`
  return JSON.stringify(value)
}
export function generateReport(evaluated: EvaluatedAttempt[], protocol: Protocol, cohorts: Cohort[] = []) {
  if (evaluated.length > LIMITS.attempts) throw new Error("Too many attempts.")
  const real = evaluated.filter((e) => e.attempt.classification === "real").sort((a, b) => a.attempt.attemptId.localeCompare(b.attempt.attemptId))
  for (const entry of evaluated) validateAttempt(entry.attempt, protocol)
  unique(real.map((e) => e.attempt.attemptId), "Attempt ids")
  unique(real.map((e) => e.attempt.workspace.id), "Workspace ids")
  unique(real.map((e) => `${e.attempt.cohortId}/${e.attempt.order}`), "Attempt order within a cohort")
  unique(real.map((e) => `${e.attempt.cohortId}/${e.attempt.conditionId}/${e.attempt.taskId}/${e.attempt.repetition}`), "Attempt repetitions")
  cohorts.forEach((cohort) => validateCohort(cohort, protocol))
  unique(cohorts.map((c) => c.cohortId), "Cohort ids")
  cohorts = [...cohorts].sort((a, b) => a.cohortId.localeCompare(b.cohortId))
  const commonPins = new Map<string, string>()
  const fixturePins = new Map<string, string>()
  if (cohorts.length) for (const entry of real) {
    const cohort = cohorts.find((c) => c.cohortId === entry.attempt.cohortId)
    const assignment = cohort?.schedule.entries.find((e) => e.order === entry.attempt.order)
    if (!assignment || assignment.conditionId !== entry.attempt.conditionId || assignment.taskId !== entry.attempt.taskId || assignment.repetition !== entry.attempt.repetition) throw new Error("Attempt does not match its frozen cohort assignment.")
    const { cohortId, host, model, environment, capabilities, versions, budget, fixture } = entry.attempt
    const common = stable({ host, model, environment, capabilities: { network: capabilities.network, shell: capabilities.shell, mcp: capabilities.mcp }, versions, budget })
    const fixtureKey = `${cohortId}/${entry.attempt.taskId}`
    const frozenFixture = stable(fixture)
    const { fixtures, ...controls } = cohort!.controls
    if (common !== stable(controls) || !fixtures.some((f) => stable(f) === frozenFixture)) throw new Error("Attempt does not match predeclared cohort controls or fixture digest.")
    if ((commonPins.has(cohortId) && commonPins.get(cohortId) !== common) || (fixturePins.has(fixtureKey) && fixturePins.get(fixtureKey) !== frozenFixture)) throw new Error("A frozen cohort must use the same host, model, environment, capabilities, versions, budgets and task fixture across treatments.")
    commonPins.set(cohortId, common)
    fixturePins.set(fixtureKey, frozenFixture)
  }
  const coverage = cohorts.map((cohort) => ({ cohortId: cohort.cohortId, manifestSha256: sha256(stable(cohort)), pins: cohort.pins, controls: cohort.controls, cells: protocol.tasks.flatMap((task) => protocol.conditions.map((condition) => {
    const assignments = cohort.schedule.entries.filter((e) => e.taskId === task.id && e.conditionId === condition.id)
    const observations = real.filter((e) => e.attempt.cohortId === cohort.cohortId && e.attempt.taskId === task.id && e.attempt.conditionId === condition.id)
    const planned = condition.availability === "planned" ? assignments.length : 0
    const successes = observations.filter((e) => e.success && e.attempt.assistance === "autonomous").length
    return { conditionId: condition.id, taskId: task.id, assigned: assignments.length, observed: observations.length, missing: planned ? 0 : assignments.length - observations.length, planned, autonomousSuccesses: successes, rate: planned || !assignments.length ? null : successes / assignments.length }
  })) }))
  const groups = new Map<string, { profileId: string; taskId: string; profile: ReturnType<typeof profile>; members: EvaluatedAttempt[] }>()
  for (const entry of real) {
    const p = profile(entry.attempt)
    const profileId = sha256(stable(p))
    const key = `${entry.attempt.taskId}/${profileId}`
    if (!groups.has(key)) groups.set(key, { profileId, taskId: entry.attempt.taskId, profile: p, members: [] })
    groups.get(key)!.members.push(entry)
  }
  const summaries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group]) => {
    const conditions = protocol.conditions.map((condition) => {
      const entries = group.members.filter((e) => e.attempt.conditionId === condition.id)
      const autonomous = aggregate(entries, true)
      return { conditionId: condition.id, availability: condition.availability, autonomous, assisted: aggregate(entries.filter((e) => e.attempt.assistance === "human-assisted")), pendingMinimumAttempts: Math.max(0, protocol.minimumAttempts - autonomous.attempts), attemptIds: entries.map((e) => e.attempt.attemptId), pilotReady: condition.availability === "available" && autonomous.attempts >= protocol.minimumAttempts }
    })
    return { profileId: group.profileId, taskId: group.taskId, profile: group.profile, conditions }
  })
  const ready = coverage.length > 0 && coverage.every((c) => c.cells.every((cell) => !cell.missing && !cell.planned)) && summaries.length > 0 && protocol.tasks.every((task) => summaries.some((g) => g.taskId === task.id && g.conditions.every((c) => c.pilotReady)))
  return { schemaVersion: 2 as const, protocol: { id: protocol.id, version: protocol.version, sha256: protocolDigest(protocol) }, status: real.length === 0 ? "pending" as const : ready ? "pilot-ready" as const : "insufficient-evidence" as const, assignmentCoverage: cohorts.length ? "verified" as const : "unverified" as const, excludedSynthetic: evaluated.length - real.length, coverage, groups: summaries, attempts: real.map((e) => ({ attemptId: e.attempt.attemptId, cohortId: e.attempt.cohortId, conditionId: e.attempt.conditionId, taskId: e.attempt.taskId, status: e.attempt.status, assistance: e.attempt.assistance, repetition: e.attempt.repetition, order: e.attempt.order, success: e.success, integrity: e.integrity, budgetStatus: e.budgetStatus, checks: e.checks, artifactReferences: e.attempt.artifacts.map(({ id, sha256, bytes }) => ({ id, sha256, bytes })) })) }
}
export type Report = ReturnType<typeof generateReport>

export function createSchedule(protocol: Protocol, options: { seed: number; repetitions: number }) {
  integer(options.seed, "seed", 0, 0xffffffff)
  integer(options.repetitions, "repetitions", protocol.minimumAttempts, 100)
  if (protocol.conditions.length * protocol.tasks.length * options.repetitions > LIMITS.attempts) throw new Error("Schedule exceeds attempt count limit.")
  let state = options.seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000 }
  const entries = protocol.tasks.flatMap((task) => protocol.conditions.flatMap((condition) => Array.from({ length: options.repetitions }, (_, index) => ({ order: 0, conditionId: condition.id, taskId: task.id, repetition: index + 1, availability: condition.availability }))))
  for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [entries[i], entries[j]] = [entries[j], entries[i]] }
  entries.forEach((entry, index) => { entry.order = index + 1 })
  return { schemaVersion: 2 as const, protocolVersion: protocol.version, seed: options.seed, repetitions: options.repetitions, entries }
}

export interface Cohort {
  schemaVersion: 2
  cohortId: string
  protocolSha256: string
  pins: { commit: string; documentationSha256: string; registrySha256: string; rubricSha256: string; browser: { name: string; version: string } }
  schedule: ReturnType<typeof createSchedule>
  controls: { host: Attempt["host"]; model: Attempt["model"]; environment: Attempt["environment"]; versions: Attempt["versions"]; budget: Attempt["budget"]; capabilities: Omit<Attempt["capabilities"], "tools">; fixtures: Attempt["fixture"][] }
}
export function protocolDigest(protocol: Protocol) { return sha256(stable(protocol)) }
export function validateCohort(raw: unknown, protocol: Protocol): Cohort {
  const cohort = object(raw, "Cohort")
  keys(cohort, ["schemaVersion", "cohortId", "protocolSha256", "pins", "schedule", "controls"], "Cohort")
  if (cohort.schemaVersion !== 2) throw new Error("Cohort requires schemaVersion 2.")
  string(cohort.cohortId, "Cohort id", ID)
  if (cohort.protocolSha256 !== protocolDigest(protocol)) throw new Error("Cohort protocol digest does not match the exact protocol.")
  const pins = object(cohort.pins, "Cohort pins")
  keys(pins, ["commit", "documentationSha256", "registrySha256", "rubricSha256", "browser"], "Cohort pins")
  string(pins.commit, "Commit", /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/)
  for (const key of ["documentationSha256", "registrySha256", "rubricSha256"]) string(pins[key], key, HASH)
  const browser = object(pins.browser, "Browser")
  keys(browser, ["name", "version"], "Browser")
  string(browser.name, "Browser name"); string(browser.version, "Browser version")
  const controls = object(cohort.controls, "Cohort controls")
  keys(controls, ["host", "model", "environment", "versions", "budget", "capabilities", "fixtures"], "Cohort controls")
  validateIdentity(controls, false)
  const fixtures = array(controls.fixtures, "Cohort fixtures", 32)
  for (const rawFixture of fixtures) {
    const fixture = object(rawFixture, "Cohort fixture"); keys(fixture, ["id", "sha256"], "Cohort fixture")
    string(fixture.id, "Fixture id", ID); string(fixture.sha256, "Fixture digest", HASH)
  }
  const fixtureIds = fixtures.map((f) => (f as Obj).id as string)
  unique(fixtureIds, "Cohort fixture ids")
  if (stable([...fixtureIds].sort()) !== stable([...new Set(protocol.tasks.map((t) => t.fixtureId))].sort())) throw new Error("Cohort must predeclare every task fixture exactly once.")
  const schedule = object(cohort.schedule, "Schedule")
  integer(schedule.seed, "Schedule seed", 0, 0xffffffff)
  integer(schedule.repetitions, "Schedule repetitions", protocol.minimumAttempts, 100)
  const expected = createSchedule(protocol, { seed: schedule.seed, repetitions: schedule.repetitions })
  if (stable(cohort.schedule) !== stable(expected)) throw new Error("Cohort schedule must match the complete deterministic assignments.")
  return raw as Cohort
}
