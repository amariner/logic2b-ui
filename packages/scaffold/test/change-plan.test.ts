import assert from "node:assert/strict"
import { createHash, webcrypto } from "node:crypto"
import { test } from "node:test"
import { analyzePackageChange, buildChangePlan, canonicalChangePlan, changePath, CHANGE_LIMITS, sha256, validateChangePlan, validateChangeRequest, type ChangePlanV1 } from "../src/change-plan.ts"
import type { ProjectSnapshotV1 } from "../src/project-context.ts"
const hash = (text: string) => createHash("sha256").update(text).digest("hex")
const version = "1.0.0-rc.3"
const snapshot = (files: Record<string, string> = {}, configurations: Record<string, unknown> = {}): ProjectSnapshotV1 => ({ schemaVersion: 1, files: Object.entries(files).map(([path, source]) => ({ path, sha256: hash(source) })), configurations: Object.entries(configurations).map(([path, value]) => ({ path, content: typeof value === "string" ? value : JSON.stringify(value) })) })
const candidate = (path: string, content = "export const x = 1\n") => ({ path, content, reason: "Preserve the custom customer column and add a filter." })
const request = (path = "src/customers.tsx") => ({ snapshot: snapshot(), registryVersion: version, candidates: [candidate(path)], missingFiles: [path] })
const resign = async (plan: ChangePlanV1): Promise<ChangePlanV1> => ({ ...plan, id: await sha256(canonicalChangePlan(plan)) })

test("builds create/update deltas preserving explicit content and app root; unchanged candidates are no-ops", async () => {
  const source = "custom-column: Company; copy: Mis clientes; filter: active\n"
  const original = "custom-column: Company; copy: Mis clientes\n"
  const input = { snapshot: { ...snapshot({ "src/customers.tsx": original }), appRoot: "apps/admin" }, registryVersion: version, candidates: [candidate("src/new.ts", "new"), candidate("src/customers.tsx", source)], missingFiles: ["src/new.ts"] }
  const plan = await buildChangePlan(input)
  assert.equal(plan.appRoot, "apps/admin"); assert.equal(plan.registryVersion, version)
  assert.deepEqual(plan.operations.map(({ path, kind, beforeSha256, afterSha256 }) => ({ path, kind, beforeSha256, afterSha256 })), [{ path: "src/customers.tsx", kind: "update", beforeSha256: hash(original), afterSha256: hash(source) }, { path: "src/new.ts", kind: "create", beforeSha256: null, afterSha256: hash("new") }])
  assert.equal(plan.operations[0].content, source); assert.deepEqual(plan.conflicts, []); assert.deepEqual(plan.unsupported, [])
  assert.deepEqual(await validateChangePlan(plan), plan)
  assert.deepEqual((await buildChangePlan({ ...input, candidates: [candidate("src/customers.tsx", original)] })).operations, [])
})
test("canonical hashes are deterministic for reordered request evidence and object keys", async () => {
  const input = { snapshot: snapshot({ "src/a": "before-a", "src/b": "before-b" }, { "tsconfig.json": {}, "package.json": {} }), registryVersion: version, candidates: [candidate("src/b"), candidate("src/a")], missingFiles: [] }
  const first = await buildChangePlan(input)
  const second = await buildChangePlan({ ...input, candidates: [...input.candidates].reverse(), snapshot: { ...input.snapshot, files: [...input.snapshot.files].reverse(), configurations: [...input.snapshot.configurations].reverse() } })
  assert.deepEqual(first, second)
  assert.equal(first.id, hash(canonicalChangePlan(first)))
  assert.deepEqual(await validateChangePlan(Object.fromEntries(Object.entries(first).reverse())), first)
  assert.notEqual((await buildChangePlan({ ...input, candidates: [candidate("src/a", "different")] })).id, first.id)
})
test("missing inventory evidence is a conflict, never inferred permission to create", async () => {
  const unknown = await buildChangePlan({ ...request(), missingFiles: [] })
  assert.equal(unknown.operations.length, 0); assert.match(unknown.conflicts[0].reason, /does not prove absence/)
  const contradiction = await buildChangePlan({ ...request(), snapshot: snapshot({ "src/customers.tsx": "before" }) })
  assert.equal(contradiction.operations[0].kind, "update"); assert.match(contradiction.conflicts[0].reason, /both present/)
  const collision = await buildChangePlan({ ...request(), snapshot: snapshot({ "SRC/customers.tsx": "different case", "src/customers.tsx/child": "ancestor" }) })
  assert.match(collision.conflicts.map(item => item.reason).join(" "), /collides|collide/)
})
test("configuration bytes supply preconditions and stale inventory digest blocks the plan", async () => {
  const before = '{"compilerOptions":{"strict":true}}\n'
  const input = { snapshot: snapshot({}, { "tsconfig.json": before }), registryVersion: version, candidates: [candidate("tsconfig.json", '{"compilerOptions":{"strict":true,"noUncheckedIndexedAccess":true}}')] }
  const plan = await buildChangePlan(input)
  assert.equal(plan.operations[0].beforeSha256, hash(before)); assert.deepEqual(plan.conflicts, [])
  const stale = await buildChangePlan({ ...input, snapshot: { ...input.snapshot, files: [{ path: "tsconfig.json", sha256: hash("stale") }] } })
  assert.match(stale.conflicts[0].reason, /disagree/)
  assert.deepEqual(await validateChangePlan(stale), stale)
})
test("exact observed registry version and selected app are required", async () => {
  const manifest = { schemaVersion: 1, registry: { resolvedVersion: version }, items: {} }
  const input = { ...request(), registryVersion: undefined, snapshot: snapshot({}, { ".logic2b/manifest.json": manifest }) }
  assert.equal((await buildChangePlan(input)).registryVersion, version)
  const mismatch = await buildChangePlan({ ...input, registryVersion: "1.0.0-rc.4" })
  assert.equal(mismatch.conflicts[0].path, ".logic2b/manifest.json")
  for (const badVersion of [undefined, "next", "^1.0.0", "v1.0.0", "1.0", "01.0.0", "1.0.0-01", "https://private:SECRET@example.test/"]) await assert.rejects(() => buildChangePlan({ ...request(), registryVersion: badVersion }), error => /registryVersion/.test(String(error)) && !String(error).includes("SECRET"))
  const workspace = await buildChangePlan({ ...request(), snapshot: { ...snapshot(), applications: ["apps/admin", "apps/shop"] } })
  assert.match(workspace.unsupported[0], /unselected/)
})
test("normalizes relative spelling but rejects unsafe, ambiguous and reserved file targets", () => {
  assert.equal(changePath("./src//customers.tsx"), "src/customers.tsx")
  for (const path of ["../x", "src/../x", "/x", "C:/x", "\\server\\x", "src\\x", ".", ".git/config", "node_modules/pkg/x", "src/.env", ".environment", ".env.local", ".logic2b/journal", "src/.logic2b-change-abc", "@/x", "~/x", "#imports/x", "src/*.tsx", "src/CON.txt", "x. ", "cafe\u0301.ts", "x\u0000y", "x".repeat(257)]) assert.throws(() => changePath(path), undefined, path)
  for (const paths of [["./src/x", "src/x"], ["src/X", "src/x"], ["src/a", "src/a/file"], ["SRC/A", "src/a/file"], ["src/a", "src/a-b", "src/a/file"]]) assert.throws(() => validateChangeRequest({ ...request(), candidates: paths.map(path => candidate(path)) }), /duplicate|case-colliding|ancestor/)
  assert.throws(() => validateChangeRequest({ ...request(), missingFiles: ["src/a", "src/a/b"] }), /ancestor/)
})
test("strict bounded requests reject unknown fields, malformed shapes and multibyte overflow without echoing source", () => {
  const input = request()
  const invalid = [null, [], { ...input, schemaVersion: 2 }, { ...input, execute: "SECRET" }, { ...input, candidates: [] }, { ...input, candidates: Array.from({ length: 33 }, (_, i) => candidate(`src/${i}`)) }, { ...input, candidates: [{ ...candidate("src/a"), beforeSha256: hash("x") }] }, { ...input, candidates: [candidate("src/a", "\ud800")] }, { ...input, candidates: [candidate("src/a", "\udc00")] }, { ...input, candidates: [candidate("src/a", "€".repeat(Math.floor(CHANGE_LIMITS.fileBytes / 3) + 1))] }, { ...input, candidates: [candidate("src/a", "a".repeat(CHANGE_LIMITS.fileBytes)), candidate("src/b", "b".repeat(CHANGE_LIMITS.fileBytes)), candidate("src/c", "SECRET")] }, { ...input, missingFiles: "SECRET" }, { ...input, candidates: [candidate("src/a", 1 as unknown as string)] }]
  for (const raw of invalid) assert.throws(() => validateChangeRequest(raw), error => !String(error).includes("SECRET"))
  assert.equal(validateChangeRequest({ ...input, candidates: [candidate("src/a", "😀")] }).candidates[0].content, "😀")
})
test("package dependency changes remain in a preconditioned manifest operation", async () => {
  const before = { dependencies: { react: "^19.0.0" }, devDependencies: { vite: "^7.0.0" }, scripts: { dev: "vite", prepare: "existing-inert-command" } }
  const after = { ...before, dependencies: { react: "^19.1.0", zod: "^4.0.0" } }
  const plan = await buildChangePlan({ snapshot: snapshot({}, { "package.json": before }), registryVersion: version, candidates: [candidate("package.json", JSON.stringify(after))] })
  assert.deepEqual(plan.dependencies, [{ name: "react", before: "^19.0.0", after: "^19.1.0" }, { name: "zod", after: "^4.0.0" }]); assert.deepEqual(plan.unsupported, [])
  assert.equal(plan.operations[0].beforeSha256, hash(JSON.stringify(before)))
  assert.deepEqual(await validateChangePlan(plan), plan)
  assert.equal(analyzePackageChange(null, JSON.stringify({ peerDependencies: { react: "^19" }, optionalDependencies: { sharp: "^0.34" } })).dependencies.length, 2)
})
test("package lifecycle changes, removals, moved/ambiguous dependencies and external locators remain unsupported", async () => {
  const before = JSON.stringify({ dependencies: { react: "^19" }, scripts: { prepare: "old" } })
  const cases: [unknown, RegExp][] = [[{ dependencies: {} }, /Removing/], [{ dependencies: { react: "^19" }, scripts: { prepare: "new" } }, /lifecycle/], [{ dependencies: {}, devDependencies: { react: "^19" } }, /moving/], [{ dependencies: { react: "^20" }, devDependencies: { react: "^19" } }, /ambiguous/], [{ dependencies: { react: "https://example.test/x" } }, /URL/], [{ dependencies: { react: "file:../escape" } }, /local/], [{ overrides: { react: "^19" } }, /overrides/]]
  for (const [after, expected] of cases) assert.match(analyzePackageChange(before, JSON.stringify(after)).unsupported.join(" "), expected)
  assert.throws(() => analyzePackageChange(before, '{"dependencies":{"x":false}}'), /declarations/)
  assert.throws(() => analyzePackageChange(before, '{"scripts":[]}'), /scripts/)
  const noBytes = await buildChangePlan({ snapshot: snapshot({ "package.json": before }), registryVersion: version, candidates: [candidate("package.json", "{}") ] })
  assert.match(noBytes.unsupported[0], /original configuration bytes/)
  const nested = await buildChangePlan(request("nested/package.json"))
  assert.match(nested.unsupported[0], /Nested package.json/)
  await assert.rejects(async () => validateChangePlan(await resign({ ...nested, unsupported: [] })), /Nested package.json/)
  assert.deepEqual(analyzePackageChange('{"dependencies":{}}', '{"dependencies":{"constructor":"^1"}}').dependencies, [{ name: "constructor", after: "^1" }])
})
test("tampered content, preconditions, metadata, shape and plan id reject, including re-signed unsafe operations", async () => {
  const plan = await buildChangePlan(request())
  for (const tampered of [{ ...plan, id: "a".repeat(64) }, { ...plan, operations: [{ ...plan.operations[0], content: "PRIVATE_SOURCE" }] }, { ...plan, operations: [{ ...plan.operations[0], reason: "different" }] }, { ...plan, extra: true }]) await assert.rejects(() => validateChangePlan(tampered), error => !String(error).includes("PRIVATE_SOURCE"))
  for (const operation of [{ ...plan.operations[0], path: "../x" }, { ...plan.operations[0], path: "./src/customers.tsx" }, { ...plan.operations[0], kind: "delete" }, { ...plan.operations[0], beforeSha256: hash("before") }, { ...plan.operations[0], kind: "update", beforeSha256: null }, { ...plan.operations[0], execute: "echo PRIVATE_SOURCE" }]) await assert.rejects(() => validateChangePlan(resignSync({ ...plan, operations: [operation] })), error => !String(error).includes("PRIVATE_SOURCE"))
  for (const change of [{ appRoot: "../outside" }, { dependencies: [{ name: "x", after: "^1" }] }, { conflicts: [{ path: "src/x", reason: "why", overwrite: true }] }, { verification: [{ kind: "command", check: "SECRET" }] }, { unsupported: [false] }]) await assert.rejects(() => validateChangePlan(resignSync({ ...plan, ...change })))
  await assert.rejects(async () => validateChangePlan(await resign({ ...plan, operations: [...plan.operations, plan.operations[0]] })), /duplicate/)
})
function resignSync(plan: unknown) { return { ...(plan as Record<string, unknown>), id: hash(canonicalChangePlan(plan)) } }
test("dependency metadata must agree with candidate manifest, never inject a standalone install", async () => {
  const plan = await buildChangePlan({ ...request("package.json"), candidates: [candidate("package.json", '{"dependencies":{"react":"^19"}}')] })
  await assert.rejects(async () => validateChangePlan(await resign({ ...plan, dependencies: [{ name: "react", after: "^20" }] })), /does not match/)
  await assert.rejects(async () => validateChangePlan(await resign({ ...plan, dependencies: [plan.dependencies[0], plan.dependencies[0]] })), /unique/)
})
test("portable SHA-256 matches Node for empty, boundary, Unicode and large input with and without WebCrypto", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto")
  try {
    for (const crypto of [undefined, webcrypto]) {
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: crypto })
      for (const source of ["", "abc", "a".repeat(55), "b".repeat(56), "c".repeat(63), "d".repeat(64), "e".repeat(65), "Clientes españoles € 😀", Array.from({ length: 4096 }, (_, i) => String.fromCharCode(i)).join(""), "x".repeat(CHANGE_LIMITS.totalFileBytes)]) assert.equal(await sha256(source), hash(source))
    }
  } finally { if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor); else Reflect.deleteProperty(globalThis, "crypto") }
})
