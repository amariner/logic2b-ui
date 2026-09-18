import { changePath, sha256 } from "./change-plan.ts"

/** Data-only contracts shared by the local browser host and the network-free MCP adapter. */
export const VERIFICATION_LIMITS = { reportBytes: 1024 * 1024, projectFiles: 64, fileBytes: 2 * 1024 * 1024, totalFileBytes: 16 * 1024 * 1024, scenarios: 16, viewports: 4, steps: 64, checks: 256, evidence: 512, tools: 16, notes: 32, pathLength: 256 } as const
export type VerificationStatus = "pass" | "fail" | "skipped" | "unknown"
export type VerificationKind = "static" | "browser-measured" | "human-reviewed"
export type VerificationSelector = { by: "role"; role: string; name?: string } | { by: "label" | "text" | "test-id"; value: string }
export type VerificationAction =
  | { type: "action"; action: "click"; target: VerificationSelector }
  | { type: "action"; action: "fill" | "select" | "press"; target: VerificationSelector; value: string }
  | { type: "action"; action: "text-scale"; value: number }
export type VerificationCheck = { type: "check"; id: string } & (
  | { assertion: "visible" | "hidden" | "enabled" | "disabled" | "focused"; target: VerificationSelector }
  | { assertion: "text" | "value" | "accessible-description"; target: VerificationSelector; expected: string }
  | { assertion: "attribute"; target: VerificationSelector; name: string; expected: string | null }
  | { assertion: "count"; target: VerificationSelector; expected: number }
  | { assertion: "order"; target: VerificationSelector; expected: string[] }
  | { assertion: "overflow" | "screenshot" }
  | { assertion: "axe"; disabledRules?: string[] }
)
export type VerificationStep = VerificationAction | VerificationCheck
export interface VerificationSuiteV1 {
  schemaVersion: 1
  projectFiles: string[]
  planId?: string
  viewports: { id: string; width: number; height: number }[]
  scenarios: { id: string; route: string; steps: VerificationStep[] }[]
}
export interface VerificationRun {
  scenarioId: string
  viewportId: string
  status: VerificationStatus
  reason: string
  failedStep?: number
}
export interface VerificationResult {
  scenarioId: string
  viewportId: string
  checkId: string
  kind: VerificationKind
  status: VerificationStatus
  reason: string
  evidenceIds: string[]
}
export interface VerificationEvidence {
  id: string
  kind: "log" | "screenshot" | "axe" | "human-note" | "static-result"
  reference: string
  sha256: string
  tool: string
}
export interface VerificationReportV1 {
  schemaVersion: 1
  origin: string
  suite: VerificationSuiteV1
  suiteSha256: string
  project: { scope: "selected-files"; fingerprint: string; files: { path: string; sha256: string }[]; servedSourceBinding: "unverified" }
  tools: { name: string; version: string }[]
  runs: VerificationRun[]
  checks: VerificationResult[]
  evidence: VerificationEvidence[]
  notes: string[]
}
export interface VerificationSummaryV1 {
  schemaVersion: 1
  origin: string
  status: VerificationStatus
  suiteSha256: string
  projectFingerprint: string
  planId?: string
  expectedChecks: number
  reportedChecks: number
  counts: Record<VerificationStatus, number>
  runCounts: Record<VerificationStatus, number>
  viewports: VerificationSuiteV1["viewports"]
  tools: VerificationReportV1["tools"]
  evidence: VerificationEvidence[]
  runs: VerificationRun[]
  checks: (VerificationResult & { route: string; assertion: VerificationCheck["assertion"]; disabledRules?: string[] })[]
  limitations: string[]
}
export class VerificationError extends Error {
  constructor(message: string) { super(message); this.name = "VerificationError" }
}
const fail = (message: string): never => { throw new VerificationError(message) }
const bytes = (value: string) => new TextEncoder().encode(value).byteLength
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const exact = (raw: unknown, keys: string[], required = keys): Record<string, unknown> => {
  if (!object(raw) || Object.keys(raw).some(key => !keys.includes(key)) || required.some(key => !Object.hasOwn(raw, key))) return fail("Verification data contains unexpected or missing fields.")
  return raw
}
const list = (raw: unknown, max: number, min = 0): unknown[] => Array.isArray(raw) && raw.length >= min && raw.length <= max ? raw : fail("Verification array exceeds its count bounds.")
const validUnicode = (value: string) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(value)
const text = (raw: unknown, max = 512, empty = false): string => typeof raw === "string" && (empty || raw.trim().length > 0) && raw.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(raw) && validUnicode(raw) ? raw : fail("Verification text must be bounded valid Unicode without control characters.")
const singleLine = (raw: unknown, max = 512): string => { const value = text(raw, max); return /[\r\n\t]/.test(value) ? fail("Verification identifiers must be single-line text.") : value }
const id = (raw: unknown): string => typeof raw === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(raw) ? raw : fail("Verification ids must contain 1–64 ASCII letters, digits, dots, underscores or hyphens.")
const digest = (raw: unknown): string => typeof raw === "string" && /^[a-f0-9]{64}$/.test(raw) ? raw : fail("Verification digests must be lowercase SHA-256 hex.")
const integer = (raw: unknown, min: number, max: number): number => typeof raw === "number" && Number.isInteger(raw) && raw >= min && raw <= max ? raw : fail("Verification number exceeds its integer bounds.")
const enumeration = <T extends string>(raw: unknown, values: readonly T[]): T => typeof raw === "string" && (values as readonly string[]).includes(raw) ? raw as T : fail("Unsupported verification value.")
const statuses = ["pass", "fail", "skipped", "unknown"] as const
const kinds = ["static", "browser-measured", "human-reviewed"] as const
const evidenceKinds = ["log", "screenshot", "axe", "human-note", "static-result"] as const
const path = (raw: unknown): string => {
  let value: string
  try { value = changePath(raw) } catch { return fail("Verification paths must be safe project-relative files.") }
  return value === raw ? value : fail("Verification paths must use canonical relative spelling.")
}
function unique(values: string[]) { if (new Set(values).size !== values.length) fail("Verification entries must have unique ids or paths.") }
function filePaths(values: string[]) {
  const folded = values.map(value => value.toLowerCase()), all = new Set(folded)
  unique(folded)
  if (folded.some(value => value.split("/").some((_, index, parts) => index > 0 && all.has(parts.slice(0, index).join("/"))))) fail("Verification file paths collide by ancestor.")
}
function serializedBound(raw: unknown) {
  let serialized: string | undefined
  try { serialized = JSON.stringify(raw) } catch { return fail("Verification data must be serializable JSON.") }
  if (serialized === undefined || bytes(serialized) > VERIFICATION_LIMITS.reportBytes) fail("Verification data exceeds the 1 MiB serialized limit.")
}
function canonical(raw: unknown): string {
  if (Array.isArray(raw)) return `[${raw.map(canonical).join(",")}]`
  if (object(raw)) return `{${Object.keys(raw).sort(compare).map(key => `${JSON.stringify(key)}:${canonical(raw[key])}`).join(",")}}`
  return JSON.stringify(raw)
}
function selector(raw: unknown): VerificationSelector {
  if (!object(raw)) return fail("Expected a semantic verification selector.")
  if (raw.by === "role") {
    const data = exact(raw, ["by", "role", "name"], ["by", "role"]), role = singleLine(data.role, 32)
    if (!/^[a-z]+$/.test(role)) return fail("Verification roles must be lowercase ARIA role names.")
    return { by: "role", role, ...(data.name === undefined ? {} : { name: singleLine(data.name, 256) }) }
  }
  const data = exact(raw, ["by", "value"])
  return { by: enumeration(data.by, ["label", "text", "test-id"]), value: singleLine(data.value, 256) }
}
function step(raw: unknown): VerificationStep {
  if (!object(raw)) return fail("Expected a declarative verification step.")
  if (raw.type === "action") {
    if (raw.action === "text-scale") { const data = exact(raw, ["type", "action", "value"]); return { type: "action", action: "text-scale", value: integer(data.value, 100, 300) } }
    if (raw.action === "click") { const data = exact(raw, ["type", "action", "target"]); return { type: "action", action: "click", target: selector(data.target) } }
    const data = exact(raw, ["type", "action", "target", "value"]), action = enumeration(data.action, ["fill", "select", "press"]), value = text(data.value, 2048, true)
    if (action === "press" && (!/^[A-Za-z0-9+]{1,64}$/.test(value) || value.endsWith("+"))) return fail("Keyboard actions require a bounded key or key combination.")
    return { type: "action", action, target: selector(data.target), value }
  }
  if (raw.type !== "check") return fail("Verification steps support actions and checks only.")
  const checkId = id(raw.id)
  if (["visible", "hidden", "enabled", "disabled", "focused"].includes(String(raw.assertion))) {
    const data = exact(raw, ["type", "id", "assertion", "target"])
    return { type: "check", id: checkId, assertion: enumeration(data.assertion, ["visible", "hidden", "enabled", "disabled", "focused"]), target: selector(data.target) }
  }
  if (["text", "value", "accessible-description"].includes(String(raw.assertion))) {
    const data = exact(raw, ["type", "id", "assertion", "target", "expected"])
    return { type: "check", id: checkId, assertion: enumeration(data.assertion, ["text", "value", "accessible-description"]), target: selector(data.target), expected: text(data.expected, 2048, true) }
  }
  if (raw.assertion === "attribute") {
    const data = exact(raw, ["type", "id", "assertion", "target", "name", "expected"]), name = singleLine(data.name, 128)
    if (!/^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/.test(name)) return fail("Verification attribute names must be literal HTML attribute names.")
    return { type: "check", id: checkId, assertion: "attribute", target: selector(data.target), name, expected: data.expected === null ? null : text(data.expected, 2048, true) }
  }
  if (raw.assertion === "count" || raw.assertion === "order") {
    const data = exact(raw, ["type", "id", "assertion", "target", "expected"]), target = selector(data.target)
    return raw.assertion === "count" ? { type: "check", id: checkId, assertion: "count", target, expected: integer(data.expected, 0, 10000) } : { type: "check", id: checkId, assertion: "order", target, expected: list(data.expected, 128).map(value => text(value, 2048, true)) }
  }
  if (raw.assertion === "axe") {
    const data = exact(raw, ["type", "id", "assertion", "disabledRules"], ["type", "id", "assertion"])
    const disabledRules = data.disabledRules === undefined ? undefined : list(data.disabledRules, 64).map(id)
    if (disabledRules) unique(disabledRules)
    return { type: "check", id: checkId, assertion: "axe", ...(disabledRules === undefined ? {} : { disabledRules }) }
  }
  const data = exact(raw, ["type", "id", "assertion"])
  return { type: "check", id: checkId, assertion: enumeration(data.assertion, ["overflow", "screenshot"]) }
}
/** No browser, filesystem, fetch, source evaluation or executable callbacks are accepted. */
export function validateVerificationSuite(raw: unknown): VerificationSuiteV1 {
  serializedBound(raw)
  const data = exact(raw, ["schemaVersion", "projectFiles", "planId", "viewports", "scenarios"], ["schemaVersion", "projectFiles", "viewports", "scenarios"])
  if (data.schemaVersion !== 1) return fail("Unsupported verification suite schemaVersion; expected 1.")
  const projectFiles = list(data.projectFiles, VERIFICATION_LIMITS.projectFiles, 1).map(path).sort(compare)
  filePaths(projectFiles)
  const viewports = list(data.viewports, VERIFICATION_LIMITS.viewports, 1).map(raw => {
    const value = exact(raw, ["id", "width", "height"])
    return { id: id(value.id), width: integer(value.width, 240, 3840), height: integer(value.height, 240, 3840) }
  })
  unique(viewports.map(value => value.id))
  let checkCount = 0
  const scenarios = list(data.scenarios, VERIFICATION_LIMITS.scenarios, 1).map(raw => {
    const value = exact(raw, ["id", "route", "steps"]), route = singleLine(value.route, 512)
    if (!route.startsWith("/") || route.startsWith("//") || /[\\\s]/.test(route)) return fail("Verification routes must be local absolute paths without an origin.")
    let parsed: URL
    try { parsed = new URL(route, "http://verification.invalid") } catch { return fail("Malformed verification route.") }
    if (parsed.origin !== "http://verification.invalid") return fail("Verification routes cannot change origin.")
    const steps = list(value.steps, VERIFICATION_LIMITS.steps, 1).map(step), checks = steps.filter((value): value is VerificationCheck => value.type === "check")
    if (!checks.length) return fail("Every verification scenario requires at least one check.")
    unique(checks.map(value => value.id)); checkCount += checks.length * viewports.length
    return { id: id(value.id), route, steps }
  })
  unique(scenarios.map(value => value.id))
  if (checkCount > VERIFICATION_LIMITS.checks) return fail("Verification suite exceeds 256 expected checks across viewports.")
  return { schemaVersion: 1, projectFiles, ...(data.planId === undefined ? {} : { planId: digest(data.planId) }), viewports, scenarios }
}
export async function hashVerificationSuite(raw: unknown): Promise<string> { return sha256(canonical(validateVerificationSuite(raw))) }
function projectFiles(raw: unknown): { path: string; sha256: string }[] {
  const files = list(raw, VERIFICATION_LIMITS.projectFiles, 1).map(raw => { const data = exact(raw, ["path", "sha256"]); return { path: path(data.path), sha256: digest(data.sha256) } }).sort((a, b) => compare(a.path, b.path))
  filePaths(files.map(value => value.path)); return files
}
/** Identifies only the explicit selected-file inventory, never the served app or whole repository. */
export async function projectFingerprint(raw: unknown): Promise<string> { return sha256(canonical({ scope: "selected-files", files: projectFiles(raw) })) }
const runKey = (scenarioId: string, viewportId: string) => `${scenarioId}\0${viewportId}`
const checkKey = (scenarioId: string, viewportId: string, checkId: string) => `${runKey(scenarioId, viewportId)}\0${checkId}`
function manifest(suite: VerificationSuiteV1) {
  return suite.scenarios.flatMap(scenario => suite.viewports.map(viewport => ({ scenario, viewport, checks: scenario.steps.filter((step): step is VerificationCheck => step.type === "check") })))
}
function reference(raw: unknown): string {
  const value = singleLine(raw, 1024)
  if (/^https?:\/\//.test(value)) {
    let url: URL
    try { url = new URL(value) } catch { return fail("Malformed verification evidence URL.") }
    if (!url.hostname || url.username || url.password) return fail("Evidence URLs cannot contain credentials.")
    return value
  }
  return path(value)
}
function origin(raw: unknown): string {
  const value = singleLine(raw, 512)
  let url: URL
  try { url = new URL(value) } catch { return fail("Verification origin must be a canonical HTTP(S) origin.") }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.origin !== value) return fail("Verification origin must be a canonical HTTP(S) origin without credentials, path, query or fragment.")
  return value
}
/** Validates structure, reference consistency and fingerprints; never retrieves or authenticates evidence. */
export async function validateVerificationReport(raw: unknown): Promise<VerificationReportV1> {
  serializedBound(raw)
  const data = exact(raw, ["schemaVersion", "origin", "suite", "suiteSha256", "project", "tools", "runs", "checks", "evidence", "notes"])
  if (data.schemaVersion !== 1) return fail("Unsupported verification report schemaVersion; expected 1.")
  const suite = validateVerificationSuite(data.suite), suiteSha256 = digest(data.suiteSha256)
  if (suiteSha256 !== await hashVerificationSuite(suite)) return fail("Verification suite fingerprint does not match its declared checks.")
  const project = exact(data.project, ["scope", "fingerprint", "files", "servedSourceBinding"])
  if (project.scope !== "selected-files" || project.servedSourceBinding !== "unverified") return fail("Verification must disclose selected-file scope and unverified served-source binding.")
  const files = projectFiles(project.files), fingerprint = digest(project.fingerprint)
  if (canonical(files.map(value => value.path)) !== canonical(suite.projectFiles)) return fail("Project evidence must cover exactly the suite's selected files.")
  if (fingerprint !== await projectFingerprint(files)) return fail("Verification project fingerprint does not match its selected-file inventory.")
  const tools = list(data.tools, VERIFICATION_LIMITS.tools).map(raw => { const value = exact(raw, ["name", "version"]); return { name: singleLine(value.name, 128), version: singleLine(value.version, 128) } })
  unique(tools.map(value => value.name))
  const toolNames = new Set(tools.map(value => value.name))
  const evidence = list(data.evidence, VERIFICATION_LIMITS.evidence).map(raw => {
    const value = exact(raw, ["id", "kind", "reference", "sha256", "tool"]), tool = singleLine(value.tool, 128)
    if (!toolNames.has(tool)) return fail("Verification evidence references an undeclared tool version.")
    return { id: id(value.id), kind: enumeration(value.kind, evidenceKinds), reference: reference(value.reference), sha256: digest(value.sha256), tool }
  })
  unique(evidence.map(value => value.id))
  const evidenceById = new Map(evidence.map(value => [value.id, value])), expectedRuns = new Map(manifest(suite).map(value => [runKey(value.scenario.id, value.viewport.id), value]))
  const runs = list(data.runs, VERIFICATION_LIMITS.scenarios * VERIFICATION_LIMITS.viewports).map(raw => {
    const value = exact(raw, ["scenarioId", "viewportId", "status", "reason", "failedStep"], ["scenarioId", "viewportId", "status", "reason"]), scenarioId = id(value.scenarioId), viewportId = id(value.viewportId), expected = expectedRuns.get(runKey(scenarioId, viewportId)), status = enumeration(value.status, statuses)
    if (!expected) return fail("Verification run is outside the declared scenario/viewport matrix.")
    if (value.failedStep !== undefined && status !== "fail") return fail("Only failed runs can identify a failed step.")
    return { scenarioId, viewportId, status, reason: text(value.reason), ...(value.failedStep === undefined ? {} : { failedStep: integer(value.failedStep, 0, expected.scenario.steps.length - 1) }) }
  })
  unique(runs.map(value => runKey(value.scenarioId, value.viewportId)))
  const checks = list(data.checks, VERIFICATION_LIMITS.checks).map(raw => {
    const value = exact(raw, ["scenarioId", "viewportId", "checkId", "kind", "status", "reason", "evidenceIds"]), scenarioId = id(value.scenarioId), viewportId = id(value.viewportId), checkId = id(value.checkId), expected = expectedRuns.get(runKey(scenarioId, viewportId))?.checks.find(value => value.id === checkId)
    if (!expected) return fail("Verification check is outside the declared scenario/viewport/check matrix.")
    const kind = enumeration(value.kind, kinds), status = enumeration(value.status, statuses), evidenceIds = list(value.evidenceIds, 16).map(id)
    unique(evidenceIds)
    const references = evidenceIds.map(value => evidenceById.get(value))
    if (references.some(value => value === undefined)) return fail("Verification check references missing evidence.")
    if (status === "pass" || status === "fail") {
      const compatible = kind === "human-reviewed" ? ["human-note"] : kind === "static" ? ["log", "static-result"] : expected.assertion === "axe" ? ["axe"] : expected.assertion === "screenshot" ? ["screenshot"] : ["log"]
      if (!references.some(value => value && compatible.includes(value.kind))) return fail("Pass/fail verification checks require compatible evidence references.")
    }
    return { scenarioId, viewportId, checkId, kind, status, reason: text(value.reason), evidenceIds }
  })
  unique(checks.map(value => checkKey(value.scenarioId, value.viewportId, value.checkId)))
  const notes = list(data.notes, VERIFICATION_LIMITS.notes).map(value => text(value))
  return { schemaVersion: 1, origin: origin(data.origin), suite, suiteSha256, project: { scope: "selected-files", fingerprint, files, servedSourceBinding: "unverified" }, tools, runs, checks, evidence, notes }
}
const combine = (values: VerificationStatus[]): VerificationStatus => values.includes("fail") ? "fail" : values.includes("unknown") ? "unknown" : values.includes("skipped") ? "skipped" : values.length ? "pass" : "unknown"
const counts = (values: { status: VerificationStatus }[]): Record<VerificationStatus, number> => ({ pass: values.filter(value => value.status === "pass").length, fail: values.filter(value => value.status === "fail").length, skipped: values.filter(value => value.status === "skipped").length, unknown: values.filter(value => value.status === "unknown").length })
/** Summarizes submitted evidence, not independent attestation; missing or non-browser coverage never passes. */
export async function summarizeVerificationReport(raw: unknown): Promise<VerificationSummaryV1> {
  const report = await validateVerificationReport(raw), checks: VerificationSummaryV1["checks"] = [], runs: VerificationRun[] = []
  const suppliedChecks = new Map(report.checks.map(value => [checkKey(value.scenarioId, value.viewportId, value.checkId), value])), suppliedRuns = new Map(report.runs.map(value => [runKey(value.scenarioId, value.viewportId), value]))
  for (const { scenario, viewport, checks: expectedChecks } of manifest(report.suite)) {
    const runChecks = expectedChecks.map(expected => {
      const supplied = suppliedChecks.get(checkKey(scenario.id, viewport.id, expected.id))
      const check: VerificationSummaryV1["checks"][number] = { ...(supplied ?? { scenarioId: scenario.id, viewportId: viewport.id, checkId: expected.id, kind: "browser-measured", status: "unknown", reason: "No result was supplied for this expected browser check.", evidenceIds: [] }), route: scenario.route, assertion: expected.assertion, ...(expected.assertion === "axe" && expected.disabledRules !== undefined ? { disabledRules: expected.disabledRules } : {}) }
      if (check.status === "pass" && check.kind !== "browser-measured") { check.status = "unknown"; check.reason = "Supplied static or human evidence does not establish this browser assertion." }
      checks.push(check); return check
    })
    const supplied = suppliedRuns.get(runKey(scenario.id, viewport.id))
    const checkStatus = combine(runChecks.map(value => value.status))
    const run: VerificationRun = supplied ? { ...supplied } : { scenarioId: scenario.id, viewportId: viewport.id, status: "unknown", reason: "No execution result was supplied for this scenario and viewport." }
    const effective = combine([run.status, checkStatus])
    if (effective !== run.status) { run.status = effective; delete run.failedStep; run.reason = "The submitted run status is limited by its check results or missing browser coverage." }
    runs.push(run)
  }
  return { schemaVersion: 1, origin: report.origin, status: combine(runs.map(value => value.status)), suiteSha256: report.suiteSha256, projectFingerprint: report.project.fingerprint, ...(report.suite.planId === undefined ? {} : { planId: report.suite.planId }), expectedChecks: checks.length, reportedChecks: report.checks.length, counts: counts(checks), runCounts: counts(runs), viewports: report.suite.viewports, tools: report.tools, evidence: report.evidence, runs, checks, limitations: [
    "This summarizes host-supplied evidence; referenced files and URLs were not retrieved or independently authenticated.",
    "The project fingerprint covers only selected files; the relationship between those files and served application bytes remains unverified.",
    "Passing checks apply only to the declared routes, viewports and assertions. Screenshot capture is not a visual review, and automated axe results are not WCAG conformance.",
    ...(report.suite.scenarios.some(value => value.steps.some(value => value.type === "check" && value.assertion === "axe" && value.disabledRules?.length)) ? ["One or more axe checks explicitly disable rules; inspect the suite before interpreting accessibility coverage."] : []),
  ] }
}
