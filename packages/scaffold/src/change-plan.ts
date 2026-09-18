import { detectProjectContext, projectPath, validateProjectSnapshot, type ProjectSnapshotV1 } from "./project-context.ts"

/** Limits cover decoded UTF-8 content; serialized requests/plans have a separate bound. */
export const CHANGE_LIMITS = { operations: 32, fileBytes: 128 * 1024, totalFileBytes: 256 * 1024, planBytes: 2 * 1024 * 1024, pathLength: 256 } as const
export interface ChangeRequestV1 {
  schemaVersion: 1
  snapshot: ProjectSnapshotV1
  registryVersion?: string
  candidates: { path: string; content: string; reason: string }[]
  missingFiles: string[]
}
export interface ChangePlanV1 {
  schemaVersion: 1
  id: string
  /** Operations are relative to this explicitly selected application root. */
  appRoot: string
  registryVersion: string
  operations: { path: string; kind: "create" | "update"; beforeSha256: string | null; afterSha256: string; content: string; reason: string }[]
  dependencies: { name: string; before?: string; after: string }[]
  conflicts: { path: string; reason: string }[]
  verification: { kind: "static" | "runtime"; check: string }[]
  unsupported: string[]
}
export class ChangePlanError extends Error {
  constructor(message: string) { super(message); this.name = "ChangePlanError" }
}
const fail = (message: string): never => { throw new ChangePlanError(message) }
const bytes = (value: string) => new TextEncoder().encode(value).byteLength
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const exact = (value: unknown, keys: string[], required: string[], label: string): Record<string, unknown> => {
  if (!object(value) || Object.keys(value).some(key => !keys.includes(key)) || required.some(key => !Object.hasOwn(value, key))) return fail(`${label} contains unexpected or missing fields.`)
  return value
}
const text = (value: unknown, label: string, max = 512): string => typeof value === "string" && value.trim() && value.length <= max && !/[\x00-\x1f\x7f]/.test(value) ? value : fail(`${label} must be nonempty bounded text.`)
const digest = (value: unknown): string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? value : fail("Expected a lowercase SHA-256 digest.")
function serializedBound(value: unknown) {
  let serialized: string | undefined
  try { serialized = JSON.stringify(value) } catch { return fail("Change data must be serializable JSON.") }
  if (serialized === undefined || bytes(serialized) > CHANGE_LIMITS.planBytes) return fail("Change data exceeds the 2 MiB serialized limit.")
}
function registryVersion(value: unknown): string {
  const version = text(value, "An exact registryVersion", 128)
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(version) || version.split("+")[0].split("-").slice(1).join("-").split(".").some(part => /^0\d+$/.test(part))) return fail("registryVersion must be an exact semantic version, not a channel, range or URL.")
  return version
}
/** Reject ambiguous filesystem targets rather than resolving imports or collapsing traversal. */
export function changePath(value: unknown): string {
  let path: string
  try { path = projectPath(value) } catch { return fail("Expected a safe app-relative change path (maximum 256 characters).") }
  if (/[\x7f]/.test(path) || path !== path.normalize("NFC") || /^[~@](?:\/|$)/.test(path) || /[?*<>|"#]/.test(path) || path.split("/").some(part => /^(?:\.logic2b|\.logic2b-change-.*|\.env.*)$/i.test(part) || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) return fail("Change paths cannot name aliases, reserved names, environment files or the .logic2b journal.")
  return path
}
function appRoot(value: unknown): string {
  let path: string
  try { path = projectPath(value, true) } catch { return fail("Expected a safe selected appRoot.") }
  if (path !== ".") changePath(path)
  return path
}
function uniquePaths(paths: string[], label: string) {
  const folded = paths.map(path => path.toLocaleLowerCase("en-US")), all = new Set(folded)
  if (all.size !== paths.length || folded.some(path => { const parts = path.split("/"); return parts.some((_, i) => i > 0 && all.has(parts.slice(0, i).join("/"))) })) return fail(`${label} contain duplicate, case-colliding or ancestor/descendant targets.`)
}
function content(value: unknown): string {
  if (typeof value !== "string" || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(value) || bytes(value) > CHANGE_LIMITS.fileBytes) return fail("Each candidate must contain UTF-8 text of at most 128 KiB.")
  return value
}
/** Synchronous validation is shared by CLI/MCP input adapters; no source is executed. */
export function validateChangeRequest(raw: unknown): ChangeRequestV1 {
  serializedBound(raw)
  const data = exact(raw, ["schemaVersion", "snapshot", "registryVersion", "candidates", "missingFiles"], ["snapshot", "candidates"], "Change request")
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1) return fail("Unsupported change request schemaVersion; expected 1.")
  let snapshot: ProjectSnapshotV1
  try { snapshot = validateProjectSnapshot(data.snapshot) } catch (error) { return fail(error instanceof Error ? error.message : "Invalid project snapshot.") }
  appRoot(snapshot.appRoot ?? ".")
  if (!Array.isArray(data.candidates) || data.candidates.length < 1 || data.candidates.length > CHANGE_LIMITS.operations) return fail("Between 1 and 32 change candidates are accepted.")
  let total = 0
  const candidates = data.candidates.map(raw => {
    const candidate = exact(raw, ["path", "content", "reason"], ["path", "content", "reason"], "Change candidate")
    const path = changePath(candidate.path), source = content(candidate.content)
    total += bytes(source)
    if (total > CHANGE_LIMITS.totalFileBytes) return fail("Total candidate content exceeds the 256 KiB limit.")
    return { path, content: source, reason: text(candidate.reason, "Candidate reason") }
  }).sort((a, b) => compare(a.path, b.path))
  uniquePaths(candidates.map(candidate => candidate.path), "Change candidates")
  if (data.missingFiles !== undefined && (!Array.isArray(data.missingFiles) || data.missingFiles.length > CHANGE_LIMITS.operations)) return fail("At most 32 explicitly missing files are accepted.")
  const missingFiles = ((data.missingFiles ?? []) as unknown[]).map(changePath).sort(compare)
  uniquePaths(missingFiles, "Missing files")
  return { schemaVersion: 1, snapshot, ...(data.registryVersion === undefined ? {} : { registryVersion: registryVersion(data.registryVersion) }), candidates, missingFiles }
}
function canonical(value: unknown, depth = 0): string {
  if (depth > 64) return fail("Change JSON nesting exceeds the supported depth.")
  if (Array.isArray(value)) return `[${value.map(item => canonical(item, depth + 1)).join(",")}]`
  if (object(value)) return `{${Object.keys(value).sort(compare).map(key => `${JSON.stringify(key)}:${canonical(value[key], depth + 1)}`).join(",")}}`
  return JSON.stringify(value)
}
/** Canonical JSON of the plan excluding its root id; object key order is immaterial. */
export function canonicalChangePlan(plan: unknown): string {
  if (!object(plan)) return fail("Expected a change plan object.")
  return canonical(Object.fromEntries(Object.entries(plan).filter(([key]) => key !== "id")))
}
// WebCrypto is available in Workers and current Node. The small SHA-256 fallback
// supports Node 18 processes without global WebCrypto, without a Node-only import.
const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]
export async function sha256(value: string): Promise<string> {
  const input = new TextEncoder().encode(value)
  if (globalThis.crypto?.subtle) return [...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", input))].map(byte => byte.toString(16).padStart(2, "0")).join("")
  const padded = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64)
  padded.set(input); padded[input.length] = 0x80
  const view = new DataView(padded.buffer); view.setUint32(padded.length - 8, Math.floor(input.length / 0x20000000)); view.setUint32(padded.length - 4, (input.length * 8) >>> 0)
  const state = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], w = new Uint32Array(64)
  const rotate = (n: number, count: number) => (n >>> count) | (n << (32 - count))
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4)
    for (let i = 16; i < 64; i++) { const x = w[i - 15], y = w[i - 2]; w[i] = w[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + w[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10)) }
    let [a,b,c,d,e,f,g,h] = state
    for (let i = 0; i < 64; i++) { const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0 }
    for (const [i, value] of [a,b,c,d,e,f,g,h].entries()) state[i] = (state[i] + value) >>> 0
  }
  return state.map(word => word.toString(16).padStart(8, "0")).join("")
}
const dependencyFields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const
const lifecycle = ["preinstall", "install", "postinstall", "prepublish", "prepare", "prepublishOnly", "prepack", "postpack", "publish", "postpublish", "preversion", "version", "postversion", "dependencies"]
const packageName = (value: unknown) => typeof value === "string" && value.length <= 214 && /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(value) ? value : fail("Invalid dependency package name.")
function packageJSON(source: string): Record<string, unknown> {
  let parsed: unknown
  try { parsed = JSON.parse(source.replace(/^\uFEFF/, "")) } catch { return fail("Package candidate must be a valid JSON object.") }
  return object(parsed) ? parsed : fail("Package candidate must be a valid JSON object.")
}
/** Recompute this against observed package bytes during apply; hashes are not signatures. */
export function analyzePackageChange(beforeContent: string | null, afterContent: string): Pick<ChangePlanV1, "dependencies" | "unsupported"> {
  const before = beforeContent === null ? {} : packageJSON(beforeContent), after = packageJSON(afterContent)
  const unsupported: string[] = [], dependencies: ChangePlanV1["dependencies"] = []
  for (const key of ["bundledDependencies", "bundleDependencies", "overrides", "resolutions", "pnpm", "workspaces", "packageManager"]) if (canonical(before[key] ?? null) !== canonical(after[key] ?? null)) unsupported.push(`Changing package.json ${key} requires a separate dependency-management operation.`)
  for (const pkg of [before, after]) {
    if (pkg.scripts !== undefined && (!object(pkg.scripts) || Object.values(pkg.scripts).some(value => typeof value !== "string"))) return fail("package.json scripts must be a map of strings.")
    for (const field of dependencyFields) if (pkg[field] !== undefined && (!object(pkg[field]) || Object.entries(pkg[field]).some(([name, spec]) => { packageName(name); return typeof spec !== "string" || !spec.trim() || spec.length > 512 || /[\x00-\x1f\x7f]/.test(spec) }))) return fail("package.json dependency declarations must be bounded string maps.")
  }
  const oldScripts = object(before.scripts) ? before.scripts : {}, newScripts = object(after.scripts) ? after.scripts : {}
  for (const hook of lifecycle) if (oldScripts[hook] !== newScripts[hook]) unsupported.push(`Changing package.json lifecycle hook ${hook} is unsupported.`)
  const names = [...new Set(dependencyFields.flatMap(field => [...Object.keys(object(before[field]) ? before[field] : {}), ...Object.keys(object(after[field]) ? after[field] : {})]))].sort(compare)
  if (names.length > 1024) return fail("package.json changes support at most 1024 distinct dependency names.")
  for (const name of names) {
    const oldValues: string[] = [], newValues: string[] = []
    let changed = false, removed = false
    for (const field of dependencyFields) {
      const oldValue = object(before[field]) && Object.hasOwn(before[field], name) ? before[field][name] : undefined, newValue = object(after[field]) && Object.hasOwn(after[field], name) ? after[field][name] : undefined
      if (typeof oldValue === "string") oldValues.push(oldValue)
      if (typeof newValue === "string") newValues.push(newValue)
      if (oldValue !== newValue) changed = true
      if (oldValue !== undefined && newValue === undefined) removed = true
    }
    if (!changed) continue
    if (removed) unsupported.push(`Removing or moving dependency ${name} between package.json sections is unsupported.`)
    if (new Set(oldValues).size > 1 || new Set(newValues).size > 1) { unsupported.push(`Changed dependency ${name} has ambiguous versions across package.json sections.`); continue }
    const next = newValues[0]
    if (next === undefined) continue
    if (!/^(?:[~^<>=*v\d][0-9A-Za-z.*~^<>=|+\- ]*|latest)$/.test(next)) unsupported.push(`Changed dependency ${name} requires a registry version declaration; local, Git and URL locators are unsupported.`)
    dependencies.push({ name, ...(oldValues[0] === undefined ? {} : { before: oldValues[0] }), after: next })
  }
  return { dependencies, unsupported: [...new Set(unsupported)].sort(compare) }
}

/** Assemble requested source deltas from explicit host evidence. Never synthesize source. */
export async function buildChangePlan(raw: unknown): Promise<ChangePlanV1> {
  const request = validateChangeRequest(raw), snapshot = request.snapshot
  let context: ReturnType<typeof detectProjectContext>
  try { context = detectProjectContext(snapshot) } catch (error) { return fail(error instanceof Error ? error.message : "Invalid project context.") }
  const version = registryVersion(request.registryVersion ?? context.registryVersion)
  const conflicts: ChangePlanV1["conflicts"] = [], unsupported: string[] = []
  const conflict = (path: string, reason: string) => conflicts.push({ path, reason })
  if (context.registryVersion !== undefined && registryVersion(context.registryVersion) !== version) conflict(".logic2b/manifest.json", "Requested registryVersion differs from the observed install manifest; refresh the snapshot or plan the registry update separately.")
  if (snapshot.applications?.length) unsupported.push("Workspace applications remain unselected; collect a snapshot for the intended app root before planning changes.")
  const observed = new Map(snapshot.files.map(file => [file.path, file.sha256]))
  for (const config of snapshot.configurations) {
    const hash = await sha256(config.content), inventoryHash = observed.get(config.path)
    if (inventoryHash !== undefined && inventoryHash !== hash) conflict(config.path, "Configuration bytes disagree with their inventory digest; collect a fresh snapshot.")
    observed.set(config.path, hash)
  }
  const observedPaths = [...observed.keys()].sort(compare), foldedPaths = observedPaths.map(path => [path, path.toLocaleLowerCase("en-US")] as const)
  const folded = new Set(foldedPaths.map(([, key]) => key)), seen = new Set<string>()
  for (const [path, key] of foldedPaths) {
    const parts = key.split("/")
    if (seen.has(key) || parts.some((_, i) => i > 0 && folded.has(parts.slice(0, i).join("/")))) conflict(path, "Snapshot paths collide by case or ancestor; collect an unambiguous snapshot.")
    seen.add(key)
  }
  const missing = new Set(request.missingFiles), configurations = new Map(snapshot.configurations.map(file => [file.path, file.content]))
  const operations: ChangePlanV1["operations"] = [], dependencies: ChangePlanV1["dependencies"] = []
  for (const candidate of request.candidates) {
    const before = observed.get(candidate.path)
    if (missing.has(candidate.path) && before !== undefined) conflict(candidate.path, "The target is both present and explicitly missing in the snapshot; collect fresh evidence.")
    const targetKey = candidate.path.toLocaleLowerCase("en-US")
    if (foldedPaths.some(([path, key]) => path !== candidate.path && (key === targetKey || key.startsWith(`${targetKey}/`) || targetKey.startsWith(`${key}/`)))) conflict(candidate.path, "The requested target collides with an observed path by case or ancestor.")
    if (before === undefined && !missing.has(candidate.path)) { conflict(candidate.path, "No current digest or explicit missing-file evidence was supplied; omission from an inventory does not prove absence."); continue }
    const after = await sha256(candidate.content)
    if (before === after) continue
    operations.push({ ...candidate, kind: before === undefined ? "create" : "update", beforeSha256: before ?? null, afterSha256: after })
    if (candidate.path.endsWith("/package.json")) unsupported.push("Nested package.json changes require a snapshot selected at that application's root.")
    if (candidate.path === "package.json") {
      const original = configurations.get("package.json")
      if (before !== undefined && original === undefined) unsupported.push("Updating package.json requires its original configuration bytes in the snapshot, not only a digest.")
      else { const changes = analyzePackageChange(original ?? null, candidate.content); dependencies.push(...changes.dependencies); unsupported.push(...changes.unsupported) }
    }
  }
  const plan: ChangePlanV1 = { schemaVersion: 1, id: "", appRoot: context.appRoot, registryVersion: version, operations, dependencies, conflicts: [...new Map(conflicts.map(item => [`${item.path}\0${item.reason}`, item])).values()].sort((a, b) => compare(a.path, b.path) || compare(a.reason, b.reason)), verification: [
    { kind: "static", check: "Review the bounded diff, preserved customizations and dependency declarations before applying." },
    { kind: "static", check: "After applying, run the project's existing type, lint and targeted test checks in the authorized host." },
    { kind: "runtime", check: "Verify changed interactions, keyboard access and responsive states in the consumer application; this plan does not execute checks." },
  ], unsupported: [...new Set(unsupported)].sort(compare) }
  plan.id = await sha256(canonicalChangePlan(plan))
  return validateChangePlan(plan)
}

/** Validate every nested field and recompute hashes; this does not grant authorization. */
export async function validateChangePlan(raw: unknown): Promise<ChangePlanV1> {
  serializedBound(raw)
  const keys = ["schemaVersion", "id", "appRoot", "registryVersion", "operations", "dependencies", "conflicts", "verification", "unsupported"]
  const data = exact(raw, keys, keys, "Change plan")
  if (data.schemaVersion !== 1) return fail("Unsupported change plan schemaVersion; expected 1.")
  const id = digest(data.id), root = appRoot(data.appRoot), version = registryVersion(data.registryVersion)
  if (root !== data.appRoot) return fail("Plan appRoot must be canonical.")
  const list = (value: unknown, limit: number, label: string): unknown[] => Array.isArray(value) && value.length <= limit ? value : fail(`${label} exceeds its bounded array limit.`)
  let total = 0
  const operations: ChangePlanV1["operations"] = []
  for (const rawOperation of list(data.operations, CHANGE_LIMITS.operations, "Plan operations")) {
    const operation = exact(rawOperation, ["path", "kind", "beforeSha256", "afterSha256", "content", "reason"], ["path", "kind", "beforeSha256", "afterSha256", "content", "reason"], "Plan operation")
    const path = changePath(operation.path), source = content(operation.content), afterSha256 = digest(operation.afterSha256)
    if (path !== operation.path) return fail("Plan operation paths must be canonical.")
    if (operation.kind !== "create" && operation.kind !== "update") return fail("Only create/update plan operations are supported.")
    if (operation.kind === "create" ? operation.beforeSha256 !== null : operation.beforeSha256 === null) return fail("Create requires a null beforeSha256; update requires an existing digest.")
    const beforeSha256 = operation.beforeSha256 === null ? null : digest(operation.beforeSha256)
    total += bytes(source)
    if (total > CHANGE_LIMITS.totalFileBytes) return fail("Total plan content exceeds the 256 KiB limit.")
    if (await sha256(source) !== afterSha256) return fail("Plan content does not match its afterSha256; rebuild the plan.")
    if (beforeSha256 === afterSha256) return fail("Plan operations must describe a change; omit unchanged content.")
    operations.push({ path, kind: operation.kind, beforeSha256, afterSha256, content: source, reason: text(operation.reason, "Operation reason") })
  }
  uniquePaths(operations.map(operation => operation.path), "Plan operations")
  const dependencies = list(data.dependencies, 1024, "Plan dependencies").map(rawDependency => {
    const dependency = exact(rawDependency, ["name", "before", "after"], ["name", "after"], "Plan dependency")
    return { name: packageName(dependency.name), ...(dependency.before === undefined ? {} : { before: text(dependency.before, "Previous dependency declaration") }), after: text(dependency.after, "Dependency declaration") }
  })
  if (new Set(dependencies.map(item => item.name)).size !== dependencies.length) return fail("Plan dependency names must be unique.")
  const packageOperation = operations.find(operation => operation.path === "package.json")
  if (dependencies.length && !packageOperation) return fail("Dependency changes require a preconditioned package.json operation.")
  if (packageOperation) {
    const pkg = packageJSON(packageOperation.content)
    for (const dependency of dependencies) if (!dependencyFields.some(field => object(pkg[field]) && Object.hasOwn(pkg[field], dependency.name) && pkg[field][dependency.name] === dependency.after)) return fail("Dependency metadata does not match the package.json operation.")
  }
  const conflicts = list(data.conflicts, 2048, "Plan conflicts").map(rawConflict => {
    const item = exact(rawConflict, ["path", "reason"], ["path", "reason"], "Plan conflict")
    let path: string
    try { path = projectPath(item.path) } catch { return fail("Conflict path must be project-relative.") }
    if (path !== item.path) return fail("Conflict paths must be canonical.")
    return { path, reason: text(item.reason, "Conflict reason") }
  })
  const verification = list(data.verification, 16, "Plan verification").map(rawCheck => {
    const check = exact(rawCheck, ["kind", "check"], ["kind", "check"], "Verification entry")
    if (check.kind !== "static" && check.kind !== "runtime") return fail("Verification kind must be static or runtime.")
    return { kind: check.kind, check: text(check.check, "Verification check") } as ChangePlanV1["verification"][number]
  })
  const unsupported = list(data.unsupported, 2048, "Unsupported changes").map(item => text(item, "Unsupported change"))
  if (operations.some(operation => operation.path.endsWith("/package.json")) && !unsupported.includes("Nested package.json changes require a snapshot selected at that application's root.")) return fail("Nested package.json operations must be explicitly unsupported; select that application root.")
  const plan: ChangePlanV1 = { schemaVersion: 1, id, appRoot: root, registryVersion: version, operations, dependencies, conflicts, verification, unsupported }
  if (await sha256(canonicalChangePlan(plan)) !== id) return fail("Change plan id does not match its canonical content; rebuild the plan.")
  return plan
}
