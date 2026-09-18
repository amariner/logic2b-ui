import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { chmod, link, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { applyLocalChange, listChangeTransactions, planLocalChange, recoverLocalChange } from "../src/change.ts"
import { addComponents, updateComponents, versionsUrl, type FetchLike } from "../src/lib.ts"

type TestContext = { after: (fn: () => Promise<void>) => void }
const registryVersion = "1.0.0-rc.3"
const candidate = (path: string, content: string) => ({ path, content, reason: `Requested change to ${path}` })

async function fixture(t: TestContext, files: Record<string, string | Buffer> = {}) {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-change-"))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  for (const [path, content] of Object.entries({ "package.json": "{}\n", ...files })) {
    await mkdir(dirname(join(cwd, path)), { recursive: true })
    await writeFile(join(cwd, path), content)
  }
  return cwd
}

async function tree(cwd: string) {
  const files: Record<string, { bytes: string; mode: number }> = {}
  async function walk(directory: string, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${prefix}${entry.name}`
      if (entry.isDirectory()) await walk(join(directory, entry.name), `${path}/`)
      else if (entry.isFile()) files[path] = { bytes: (await readFile(join(cwd, path))).toString("base64"), mode: (await lstat(join(cwd, path))).mode & 0o777 }
    }
  }
  await walk(cwd)
  return files
}

async function refused(result: Promise<unknown>) {
  try {
    const value = await result as { status: string }
    assert.ok(value.status === "conflict" || value.status === "interrupted", JSON.stringify(value))
  } catch (error) {
    // Invalid input and unsafe filesystem objects may be rejected before a
    // structured application result exists; assertion failures are not refusal.
    if (error instanceof assert.AssertionError) throw error
    assert.ok(error instanceof Error)
  }
}

function withJournalChecksum(journal: Record<string, unknown>) {
  const { digest: _digest, ...body } = journal
  return { ...body, digest: createHash("sha256").update(JSON.stringify(body)).digest("hex") }
}

async function writingSnapshot(cwd: string, id: string) {
  const path = join(cwd, ".logic2b/changes", id, "journal.json")
  const journal = JSON.parse(await readFile(path, "utf8"))
  journal.phase = "interrupted"
  journal.records[0].state = "writing"
  await writeFile(path, JSON.stringify(withJournalChecksum(journal)))
}

test("planning and dry-run are read-only, while apply writes exact content and repeats without writes", async t => {
  const cwd = await fixture(t, { "src/customers.tsx": "export const title = 'Clientes VIP'\n", "src/theme.css": ":root { --primary: oklch(0.6 0.1 230); }\n" })
  await chmod(join(cwd, "src/customers.tsx"), 0o640)
  const before = await tree(cwd)
  const source = "export const title = 'Clientes VIP'\nexport const filter = 'active'\n"
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/customers.tsx", source), candidate("src/filters/status.ts", "export const statuses = ['active', 'inactive']\n")] })
  assert.equal(plan.operations.find(operation => operation.path === "src/customers.tsx")?.kind, "update")
  assert.equal(plan.operations.find(operation => operation.path === "src/filters/status.ts")?.beforeSha256, null)
  assert.deepEqual(await tree(cwd), before)
  assert.equal((await applyLocalChange({ cwd, plan, dryRun: true })).status, "ready")
  assert.deepEqual(await tree(cwd), before)
  assert.equal((await applyLocalChange({ cwd, plan })).status, "applied")
  assert.equal(await readFile(join(cwd, "src/customers.tsx"), "utf8"), source)
  assert.equal((await lstat(join(cwd, "src/customers.tsx"))).mode & 0o777, 0o640)
  assert.equal(await readFile(join(cwd, "src/filters/status.ts"), "utf8"), "export const statuses = ['active', 'inactive']\n")
  assert.deepEqual((await tree(cwd))["src/theme.css"], before["src/theme.css"])
  const applied = await tree(cwd)
  assert.equal((await applyLocalChange({ cwd, plan })).status, "already-applied")
  assert.deepEqual(await tree(cwd), applied)
  assert.ok(JSON.stringify(await listChangeTransactions(cwd)).includes(plan.id))
})

test("all stale preconditions reject before any target write, including a stale package manifest", async t => {
  for (const stalePath of ["src/customer.ts", "package.json", "src/new.ts"]) {
    const cwd = await fixture(t, { "src/customer.ts": "export const filter = false\n" })
    const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/customer.ts", "export const filter = true\n"), candidate("package.json", '{"dependencies":{"react":"19.2.0"}}\n'), candidate("src/new.ts", "export const newlyCreated = true\n")] })
    const newer = stalePath === "package.json" ? '{"name":"newer-user-edit"}\n' : "// newer user edit\n"
    await writeFile(join(cwd, stalePath), newer)
    const before = await tree(cwd)
    const result = await applyLocalChange({ cwd, plan })
    assert.equal(result.status, "conflict", stalePath)
    assert.ok(result.conflicts.some(conflict => conflict.path === stalePath))
    assert.deepEqual(await tree(cwd), before)
  }
})

test("rechecks every staged precondition before the first project replacement", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n"), candidate("package.json", '{"name":"candidate"}\n')] })
  const newer = '{"name":"edited-while-staging"}\n'
  await refused(applyLocalChange({ cwd, plan, hooks: { afterStage: async () => { await writeFile(join(cwd, "package.json"), newer) } } }))
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "before\n")
  assert.equal(await readFile(join(cwd, "package.json"), "utf8"), newer)
})

test("interrupted apply restores original bytes and modes and removes only transaction-created files", async t => {
  const cwd = await fixture(t, { "src/a.ts": "a before\r\n", "src/b.ts": "\uFEFFconst greeting = '¡Hola!'\r\n" })
  await chmod(join(cwd, "src/a.ts"), 0o600)
  await chmod(join(cwd, "src/b.ts"), 0o751)
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/already.ts", "already created\n"), candidate("src/b.ts", "b after\n"), candidate("src/new.ts", "new\n")] })
  // This target already has the result before this transaction starts. It is
  // positive evidence, not a write that recovery is allowed to undo.
  await writeFile(join(cwd, "src/a.ts"), "a after\n")
  await writeFile(join(cwd, "src/already.ts"), "already created\n")
  const originalB = await readFile(join(cwd, "src/b.ts"))
  const result = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async (_index, path) => { if (path === "src/new.ts") throw new Error("simulated process failure") } } })
  assert.equal(result.status, "interrupted")
  assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b after\n")
  assert.equal(await readFile(join(cwd, "src/new.ts"), "utf8"), "new\n")
  await writeFile(join(cwd, "src/a.ts"), "newer user copy of already-applied update\n")
  await writeFile(join(cwd, "src/already.ts"), "newer user copy of already-applied create\n")
  const beforeDryRun = await tree(cwd)
  assert.ok(result.transactionId)
  assert.equal((await recoverLocalChange({ cwd, id: result.transactionId, dryRun: true })).status, "ready")
  assert.deepEqual(await tree(cwd), beforeDryRun)
  assert.equal((await recoverLocalChange({ cwd, id: result.transactionId })).status, "recovered")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "newer user copy of already-applied update\n")
  assert.equal(await readFile(join(cwd, "src/already.ts"), "utf8"), "newer user copy of already-applied create\n")
  assert.deepEqual(await readFile(join(cwd, "src/b.ts")), originalB)
  assert.equal((await lstat(join(cwd, "src/b.ts"))).mode & 0o777, 0o751)
  await assert.rejects(lstat(join(cwd, "src/new.ts")), { code: "ENOENT" })
  assert.equal((await lstat(join(cwd, "src/a.ts"))).mode & 0o777, 0o600)
})

test("a newer user edit blocks the whole recovery before any original is restored", async t => {
  const cwd = await fixture(t, { "src/a.ts": "a before\n", "src/b.ts": "b before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/b.ts", "b after\n")] })
  const applied = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async (_index, path) => { if (path === "src/b.ts") throw new Error("interrupted") } } })
  assert.equal(applied.status, "interrupted")
  assert.ok(applied.transactionId)
  await writeFile(join(cwd, "src/b.ts"), "b newer user edit\n")
  const before = await tree(cwd)
  const result = await recoverLocalChange({ cwd, id: applied.transactionId })
  assert.equal(result.status, "conflict")
  assert.ok(result.conflicts.some(conflict => conflict.path === "src/b.ts"))
  assert.deepEqual(await tree(cwd), before)
})

test("a write-time race interrupts without replacing that user edit and remains recoverable", async t => {
  const cwd = await fixture(t, { "src/a.ts": "a before\n", "src/b.ts": "b before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/b.ts", "b after\n")] })
  const result = await applyLocalChange({ cwd, plan, hooks: { beforeWrite: async (_index, path) => { if (path === "src/b.ts") await writeFile(join(cwd, path), "b changed during apply\n") } } })
  assert.equal(result.status, "interrupted")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "a after\n")
  assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b changed during apply\n")
  // The journal proves the second target was never written, so recovery can
  // restore this transaction's first replacement and retain the racing edit.
  assert.ok(result.transactionId)
  assert.equal((await recoverLocalChange({ cwd, id: result.transactionId })).status, "recovered")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "a before\n")
  assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b changed during apply\n")
})

test("a newer permission change blocks recovery before any file or mode is restored", async t => {
  const cwd = await fixture(t, { "src/a.ts": "a before\n", "src/b.ts": "b before\n" })
  await chmod(join(cwd, "src/b.ts"), 0o640)
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/b.ts", "b after\n")] })
  const applied = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async (_index, path) => { if (path === "src/b.ts") throw new Error("interrupted") } } })
  assert.equal(applied.status, "interrupted")
  assert.ok(applied.transactionId)
  await chmod(join(cwd, "src/b.ts"), 0o600)
  const before = await tree(cwd)
  const recovered = await recoverLocalChange({ cwd, id: applied.transactionId })
  assert.equal(recovered.status, "conflict")
  assert.ok(recovered.conflicts.some(conflict => conflict.path === "src/b.ts"))
  assert.deepEqual(await tree(cwd), before)
})

test("malformed schemas, plan ids and content digests are refused with zero project writes", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n")] })
  for (const invalid of [null, { ...plan, schemaVersion: 99 }, { ...plan, id: "0".repeat(64) }, { ...plan, operations: plan.operations.map(operation => ({ ...operation, content: "tampered\n" })) }, { ...plan, command: "touch executed" }]) {
    const before = await tree(cwd)
    await refused(applyLocalChange({ cwd, plan: invalid }))
    assert.deepEqual(await tree(cwd), before)
  }
})

test("planning rejects unsafe paths, duplicate destinations, linked files and non-files", async t => {
  const cwd = await fixture(t, { "src/a.ts": "source\n", ".env": "PRIVATE\n" })
  const outside = await fixture(t, { "private.ts": "OUTSIDE\n" })
  await symlink(join(outside, "private.ts"), join(cwd, "leak.ts"))
  await symlink(outside, join(cwd, "outside"))
  await symlink(join(cwd, "src/a.ts"), join(cwd, "inside.ts"))
  await link(join(outside, "private.ts"), join(cwd, "hardlink.ts"))
  const before = await tree(cwd)
  const outsideBefore = await tree(outside)
  for (const path of ["../escape.ts", join(outside, "escape.ts"), "C:\\escape.ts", "src/../escape.ts", ".git/config", ".logic2b/transactions/overwrite.json", "node_modules/private.ts", ".env", "leak.ts", "inside.ts", "outside/new.ts", "hardlink.ts", "src", "src/a.ts/child.ts"]) {
    await assert.rejects(planLocalChange({ cwd, registryVersion, candidates: [candidate(path, "unsafe overwrite\n")] }), error => error instanceof Error, path)
  }
  await assert.rejects(planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "one\n"), candidate("./src/a.ts", "two\n")] }))
  assert.deepEqual(await tree(cwd), before)
  assert.deepEqual(await tree(outside), outsideBefore)
})

test("a target replaced with a symlink or hardlink after planning is never written", async t => {
  for (const makeLink of [symlink, link]) {
    const cwd = await fixture(t, { "src/a.ts": "before\n", "src/b.ts": "b before\n" })
    const outside = await fixture(t, { "private.ts": "before\n" })
    const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n"), candidate("src/b.ts", "b after\n")] })
    await rm(join(cwd, "src/a.ts"))
    await makeLink(join(outside, "private.ts"), join(cwd, "src/a.ts"))
    await refused(applyLocalChange({ cwd, plan }))
    assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "before\n")
    if (makeLink === symlink) assert.equal((await lstat(join(cwd, "src/a.ts"))).isSymbolicLink(), true)
    else assert.equal((await lstat(join(cwd, "src/a.ts"))).nlink, 2)
    assert.equal(await readFile(join(outside, "private.ts"), "utf8"), "before\n")
    assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b before\n")
  }
})

test("recovery refuses symlink and unrelated hardlink replacements before restoring any target", async t => {
  for (const makeLink of [symlink, link]) {
    const cwd = await fixture(t, { "src/a.ts": "a before\n", "src/b.ts": "b before\n" })
    const outside = await fixture(t, { "private.ts": "a after\n" })
    const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/b.ts", "b after\n")] })
    const applied = await applyLocalChange({ cwd, plan })
    assert.equal(applied.status, "applied")
    assert.ok(applied.transactionId)
    await rm(join(cwd, "src/a.ts"))
    await makeLink(join(outside, "private.ts"), join(cwd, "src/a.ts"))
    const before = await tree(cwd), outsideBefore = await tree(outside)
    assert.equal((await recoverLocalChange({ cwd, id: applied.transactionId })).status, "conflict")
    assert.deepEqual(await tree(cwd), before)
    assert.deepEqual(await tree(outside), outsideBefore)
    assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b after\n")
  }
})

test("a symlinked parent appearing after planning cannot redirect a create outside the consumer", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const outside = await fixture(t, { "a.ts": "before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n"), candidate("src/new.ts", "new\n")] })
  await rename(join(cwd, "src"), join(cwd, "original-src"))
  await symlink(outside, join(cwd, "src"))
  const before = await tree(outside)
  await refused(applyLocalChange({ cwd, plan }))
  assert.deepEqual(await tree(outside), before)
  assert.equal(await readFile(join(cwd, "original-src/a.ts"), "utf8"), "before\n")
})

test("package changes are preconditioned data and never run scripts or install dependencies", async t => {
  const cwd = await fixture(t, { "package.json": '{"scripts":{"postinstall":"touch EXECUTED"}}\n' })
  const source = JSON.stringify({ dependencies: { react: "19.2.0" }, scripts: { postinstall: "touch EXECUTED" } }, null, 2) + "\n"
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("package.json", source)] })
  assert.equal(plan.operations.length, 1)
  assert.equal(plan.operations[0].path, "package.json")
  assert.equal((await applyLocalChange({ cwd, plan })).status, "applied")
  assert.equal(await readFile(join(cwd, "package.json"), "utf8"), source)
  await assert.rejects(lstat(join(cwd, "EXECUTED")), { code: "ENOENT" })
  await assert.rejects(lstat(join(cwd, "node_modules")), { code: "ENOENT" })
})

test("unsupported package lifecycle changes prevent all plan writes", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n"), candidate("package.json", '{"scripts":{"postinstall":"touch EXECUTED"}}\n')] })
  assert.ok(plan.unsupported.some(message => message.includes("postinstall")))
  const before = await tree(cwd)
  await refused(applyLocalChange({ cwd, plan }))
  assert.deepEqual(await tree(cwd), before)
})

test("an explicitly selected app confines planning, application and recovery to that app", async t => {
  const cwd = await fixture(t, {
    "apps/admin/package.json": "{}\n",
    "apps/admin/src/a.ts": "admin before\n",
    "apps/store/package.json": "{}\n",
    "apps/store/src/a.ts": "store before\n",
  })
  const plan = await planLocalChange({ cwd, appRoot: "apps/admin", registryVersion, candidates: [candidate("src/a.ts", "admin after\n")] })
  assert.equal(plan.appRoot, "apps/admin")
  assert.equal(plan.operations[0].path, "src/a.ts")
  const result = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async () => { throw new Error("interrupted") } } })
  assert.equal(result.status, "interrupted")
  assert.ok(result.transactionId)
  assert.equal(await readFile(join(cwd, "apps/admin/src/a.ts"), "utf8"), "admin after\n")
  assert.equal(await readFile(join(cwd, "apps/store/src/a.ts"), "utf8"), "store before\n")
  assert.equal((await recoverLocalChange({ cwd, appRoot: "apps/admin", id: result.transactionId })).status, "recovered")
  assert.equal(await readFile(join(cwd, "apps/admin/src/a.ts"), "utf8"), "admin before\n")
  assert.equal(await readFile(join(cwd, "apps/store/src/a.ts"), "utf8"), "store before\n")
})

test("planning rejects invalid UTF-8 and oversized candidates without creating journal files", async t => {
  const cwd = await fixture(t, { "src/invalid.ts": Buffer.from([0xff, 0xfe, 0xfd]) })
  const before = await tree(cwd)
  await assert.rejects(planLocalChange({ cwd, registryVersion, candidates: [candidate("src/invalid.ts", "valid replacement\n")] }))
  await assert.rejects(planLocalChange({ cwd, registryVersion, candidates: [candidate("src/large.ts", "é".repeat(128 * 1024))] }))
  assert.deepEqual(await tree(cwd), before)
})

test("a pending interrupted transaction is visible and prevents an untracked second apply", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n")] })
  const interrupted = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async () => { throw new Error("interrupted") } } })
  assert.equal(interrupted.status, "interrupted")
  assert.ok(interrupted.transactionId)
  const transaction = (await listChangeTransactions(cwd)).transactions.find(item => item.id === interrupted.transactionId)
  assert.equal(transaction?.active, true)
  assert.equal(transaction?.planId, plan.id)
  const before = await tree(cwd)
  await refused(applyLocalChange({ cwd, plan }))
  assert.deepEqual(await tree(cwd), before)
  assert.equal((await recoverLocalChange({ cwd, id: interrupted.transactionId })).status, "recovered")
  const recovered = await tree(cwd)
  assert.equal((await recoverLocalChange({ cwd, id: interrupted.transactionId })).status, "already-recovered")
  assert.deepEqual(await tree(cwd), recovered)
  assert.equal((await applyLocalChange({ cwd, plan })).status, "applied")
})

test("status keeps the active transaction visible beside orphaned, malformed and symlinked journals", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const outside = await fixture(t, { "journal.json": "PRIVATE_OUTSIDE_JOURNAL_CONTENT" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n")] })
  const applied = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async () => { throw new Error("interrupted") } } })
  assert.equal(applied.status, "interrupted")
  assert.ok(applied.transactionId)
  const emptyId = randomUUID(), malformedId = randomUUID(), linkedId = randomUUID()
  await mkdir(join(cwd, ".logic2b/changes", emptyId))
  await mkdir(join(cwd, ".logic2b/changes", malformedId))
  await writeFile(join(cwd, ".logic2b/changes", malformedId, "journal.json"), "{")
  await symlink(outside, join(cwd, ".logic2b/changes", linkedId))
  const before = await tree(cwd), outsideBefore = await tree(outside)
  const status = await listChangeTransactions(cwd)
  assert.equal(status.transactions.length, 1)
  assert.equal(status.transactions[0].id, applied.transactionId)
  assert.equal(status.transactions[0].active, true)
  for (const id of [emptyId, malformedId, linkedId]) assert.ok(status.issues.some(issue => issue.path.includes(id)))
  assert.doesNotMatch(JSON.stringify(status), /PRIVATE_OUTSIDE_JOURNAL_CONTENT/)
  const cli = new URL("../src/index.ts", import.meta.url).pathname
  const command = spawnSync(process.execPath, ["--import", "tsx", cli, "change", "status", "--cwd", cwd, "--json"], { encoding: "utf8" })
  assert.equal(command.status, 1, command.stderr)
  const output = JSON.parse(command.stdout)
  assert.equal(output.transactions[0].id, applied.transactionId)
  assert.equal(output.transactions[0].active, true)
  assert.equal(output.issues.length, 3)
  assert.deepEqual(await tree(cwd), before)
  assert.deepEqual(await tree(outside), outsideBefore)
})

test("recovery resumes an actual terminated writer whose journal still says applying", async t => {
  const cwd = await fixture(t, { "src/a.ts": "a before\n", "src/b.ts": "b before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/b.ts", "b after\n")] })
  const moduleUrl = new URL("../src/change.ts", import.meta.url).href
  const script = `import { applyLocalChange } from ${JSON.stringify(moduleUrl)};
    await applyLocalChange({cwd:process.argv[1],plan:JSON.parse(process.argv[2]),hooks:{afterWrite:async()=>{process.exit(17)}}});`
  const writer = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script, cwd, JSON.stringify(plan)], { encoding: "utf8" })
  assert.equal(writer.status, 17, writer.stderr)
  const status = await listChangeTransactions(cwd)
  assert.equal(status.transactions.length, 1)
  assert.equal(status.transactions[0].state, "applying")
  assert.equal(status.transactions[0].active, true)
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "a after\n")
  assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b before\n")
  let guarded = false
  assert.equal((await recoverLocalChange({ cwd, id: status.transactions[0].id, hooks: { beforeWrite: async () => {
    const before = await tree(cwd)
    const nestedRecovery = await recoverLocalChange({ cwd, id: status.transactions[0].id })
    assert.equal(nestedRecovery.status, "conflict")
    assert.equal((await applyLocalChange({ cwd, plan })).status, "conflict")
    assert.deepEqual(await tree(cwd), before)
    guarded = true
  } } })).status, "recovered")
  assert.ok(guarded, "the recovery must claim the dead writer's transaction before restoring a target")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "a before\n")
  assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b before\n")
  assert.equal((await listChangeTransactions(cwd)).transactions[0].active, false)
})

test("two concurrent recoveries perform one rollback and leave no active transaction", async t => {
  const cwd = await fixture(t, { "src/a.ts": "a before\n", "src/b.ts": "b before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/b.ts", "b after\n")] })
  const applied = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async (_index, path) => { if (path === "src/b.ts") throw new Error("interrupted") } } })
  assert.equal(applied.status, "interrupted")
  assert.ok(applied.transactionId)
  let restored = 0
  const options = { cwd, id: applied.transactionId, hooks: { afterWrite: async () => { restored++ } } }
  const results = await Promise.all([recoverLocalChange(options), recoverLocalChange(options)])
  assert.equal(results.filter(result => result.status === "recovered").length, 1)
  assert.ok(results.every(result => ["recovered", "already-recovered", "conflict"].includes(result.status)))
  assert.equal(restored, 2, "each of the two original files is restored once")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "a before\n")
  assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b before\n")
  assert.equal((await listChangeTransactions(cwd)).transactions[0].active, false)
})

test("the 256-owner recovery limit rejects before changing files and keeps status readable", async t => {
  const cwd = await fixture(t, { "a.ts": "before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("a.ts", "after\n")] })
  const applied = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async () => { throw new Error("interrupted") } } })
  assert.equal(applied.status, "interrupted")
  assert.ok(applied.transactionId)
  const store = join(cwd, ".logic2b/changes"), directory = join(store, applied.transactionId)
  let owner = JSON.parse(await readFile(join(store, "active.json"), "utf8"))
  // One apply owner plus 255 completed recovery claims reaches the supported
  // bound. A rejected next attempt must not append an unreadable 257th owner.
  for (let index = 0; index < 255; index++) {
    const next = { ...owner, token: randomUUID(), kind: "recover" }
    const peer = join(directory, `owner-${next.token}.json`)
    await writeFile(peer, JSON.stringify(next))
    await link(peer, join(directory, `claim-${owner.token}.json`))
    await writeFile(join(directory, `finished-${next.token}`), next.token)
    owner = next
  }
  const beforeStatus = await listChangeTransactions(cwd), beforeFiles = await tree(cwd)
  assert.equal(beforeStatus.transactions[0].id, applied.transactionId)
  assert.equal(beforeStatus.transactions[0].active, true)
  assert.deepEqual(beforeStatus.issues, [])
  const recovered = await recoverLocalChange({ cwd, id: applied.transactionId })
  assert.equal(recovered.status, "conflict")
  assert.match(recovered.conflicts.map(conflict => conflict.reason).join("\n"), /256/)
  assert.deepEqual(await tree(cwd), beforeFiles)
  assert.deepEqual(await listChangeTransactions(cwd), beforeStatus)
})

test("a recovery interrupted after restoring one target resumes without losing original modes", async t => {
  const cwd = await fixture(t, { "src/a.ts": "a before\n", "src/b.ts": "b before\n" })
  await chmod(join(cwd, "src/a.ts"), 0o600)
  await chmod(join(cwd, "src/b.ts"), 0o751)
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/b.ts", "b after\n")] })
  const applied = await applyLocalChange({ cwd, plan })
  assert.equal(applied.status, "applied")
  assert.ok(applied.transactionId)
  const interrupted = await recoverLocalChange({ cwd, id: applied.transactionId, hooks: { afterWrite: async () => { throw new Error("recovery interrupted") } } })
  assert.equal(interrupted.status, "interrupted")
  assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b before\n")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "a after\n")
  assert.equal((await recoverLocalChange({ cwd, id: applied.transactionId })).status, "recovered")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "a before\n")
  assert.equal((await lstat(join(cwd, "src/a.ts"))).mode & 0o777, 0o600)
  assert.equal((await lstat(join(cwd, "src/b.ts"))).mode & 0o777, 0o751)
})

test("resumed recovery preserves a user's reapplication to a file already marked restored", async t => {
  const cwd = await fixture(t, { "src/a.ts": "a before\n", "src/b.ts": "b before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "a after\n"), candidate("src/b.ts", "b after\n")] })
  const applied = await applyLocalChange({ cwd, plan })
  assert.equal(applied.status, "applied")
  assert.ok(applied.transactionId)
  const firstRecovery = await recoverLocalChange({ cwd, id: applied.transactionId, hooks: { afterWrite: async () => { throw new Error("interrupted recovery") } } })
  assert.equal(firstRecovery.status, "interrupted")
  assert.equal(await readFile(join(cwd, "src/b.ts"), "utf8"), "b before\n")
  // Equal to afterSha256 is still a newer user edit when the journal proves
  // that this target was already restored by an earlier recovery attempt.
  await writeFile(join(cwd, "src/b.ts"), "b after\n")
  const before = await tree(cwd)
  const resumed = await recoverLocalChange({ cwd, id: applied.transactionId })
  assert.equal(resumed.status, "conflict")
  assert.ok(resumed.conflicts.some(conflict => conflict.path === "src/b.ts"))
  assert.deepEqual(await tree(cwd), before)
})

test("recovery handles the create link/unlink crash boundary for top-level and nested targets", async t => {
  for (const path of ["created.ts", "src/created.ts"]) {
    const cwd = await fixture(t, { "src/keep.ts": "keep this source\n" })
    const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate(path, "created content\n")] })
    let temporary = ""
    const applied = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async (index, writtenPath) => {
      const transaction = (await listChangeTransactions(cwd)).transactions.find(item => item.active)
      assert.ok(transaction)
      temporary = join(dirname(writtenPath), `.logic2b-change-${transaction.id}-${index}.tmp`)
      // Reconstruct the exact two-link boundary after publishing a create but
      // before removing its temporary name. Abrupt process exit is tested above.
      await link(join(cwd, writtenPath), join(cwd, temporary))
      throw new Error("interrupted between create link and temporary unlink")
    } } })
    assert.equal(applied.status, "interrupted")
    assert.ok(applied.transactionId)
    assert.ok(temporary)
    await writingSnapshot(cwd, applied.transactionId)
    const target = await lstat(join(cwd, path)), temp = await lstat(join(cwd, temporary))
    assert.equal(target.nlink, 2)
    assert.equal(target.ino, temp.ino)
    assert.equal(target.dev, temp.dev)
    const before = await tree(cwd)
    assert.equal((await recoverLocalChange({ cwd, id: applied.transactionId, dryRun: true })).status, "ready")
    assert.deepEqual(await tree(cwd), before)
    assert.equal((await recoverLocalChange({ cwd, id: applied.transactionId })).status, "recovered")
    await assert.rejects(lstat(join(cwd, path)), { code: "ENOENT" })
    await assert.rejects(lstat(join(cwd, temporary)), { code: "ENOENT" })
    assert.equal(await readFile(join(cwd, "src/keep.ts"), "utf8"), "keep this source\n")
    assert.equal((await listChangeTransactions(cwd)).transactions[0].active, false)
  }
})

test("recovery removes a pre-rename temporary while preserving original top-level and nested targets", async t => {
  for (const path of ["existing.ts", "src/existing.ts"]) {
    const original = "original bytes\r\n", replacement = "candidate replacement\n"
    const cwd = await fixture(t, { [path]: original })
    await chmod(join(cwd, path), 0o750)
    const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate(path, replacement)] })
    const applied = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async () => { throw new Error("interrupted") } } })
    assert.equal(applied.status, "interrupted")
    assert.ok(applied.transactionId)
    // Reconstruct the boundary before rename: the original is still present,
    // the complete replacement has its temporary name, and state is writing.
    await writeFile(join(cwd, path), original)
    const temporary = join(dirname(path), `.logic2b-change-${applied.transactionId}-0.tmp`)
    await writeFile(join(cwd, temporary), replacement, { mode: 0o750 })
    await writingSnapshot(cwd, applied.transactionId)
    const before = await tree(cwd), originalStat = await lstat(join(cwd, path))
    assert.equal((await recoverLocalChange({ cwd, id: applied.transactionId, dryRun: true })).status, "ready")
    assert.deepEqual(await tree(cwd), before)
    assert.equal((await recoverLocalChange({ cwd, id: applied.transactionId })).status, "recovered")
    assert.equal(await readFile(join(cwd, path), "utf8"), original)
    assert.equal((await lstat(join(cwd, path))).mode & 0o777, 0o750)
    assert.equal((await lstat(join(cwd, path))).ino, originalStat.ino)
    await assert.rejects(lstat(join(cwd, temporary)), { code: "ENOENT" })
  }
})

test("recovery and a second apply cannot take over a transaction whose writer is still active", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n")] })
  let checked = false
  const result = await applyLocalChange({ cwd, plan, hooks: { afterStage: async () => {
    const status = await listChangeTransactions(cwd)
    const active = status.transactions.find(item => item.active)
    assert.ok(active)
    const before = await tree(cwd)
    assert.equal((await recoverLocalChange({ cwd, id: active.id })).status, "conflict")
    assert.equal((await applyLocalChange({ cwd, plan })).status, "conflict")
    assert.deepEqual(await tree(cwd), before)
    checked = true
  } } })
  assert.equal(result.status, "applied")
  assert.ok(checked)
})

test("malformed or tampered recovery journals cannot restore arbitrary bytes or destinations", async t => {
  const mutations: Array<(journal: Record<string, any>) => unknown> = [
    () => "{",
    journal => ({ ...journal, schemaVersion: 99 }),
    journal => ({ ...journal, root: "/tmp/another-consumer" }),
    journal => ({ ...journal, records: journal.records.map((record: object) => ({ ...record, beforeContent: "invented original\n" })) }),
    journal => ({ ...journal, records: journal.records.map((record: object) => ({ ...record, path: "../outside.ts" })) }),
    journal => ({ ...journal, records: [...journal.records, journal.records[0]] }),
  ]
  for (const mutate of mutations) {
    const cwd = await fixture(t, { "src/a.ts": "before\n" })
    const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n")] })
    const interrupted = await applyLocalChange({ cwd, plan, hooks: { afterWrite: async () => { throw new Error("interrupted") } } })
    assert.equal(interrupted.status, "interrupted")
    assert.ok(interrupted.transactionId)
    const path = join(cwd, ".logic2b/changes", interrupted.transactionId, "journal.json")
    let changed = mutate(JSON.parse(await readFile(path, "utf8")))
    // A checksum alone is insufficient evidence of a valid journal. Exercise
    // structural and original-content validation with correctly hashed JSON.
    if (changed && typeof changed === "object") {
      changed = withJournalChecksum(changed as Record<string, unknown>)
    }
    await writeFile(path, typeof changed === "string" ? changed : JSON.stringify(changed))
    const before = await tree(cwd)
    await refused(recoverLocalChange({ cwd, id: interrupted.transactionId }))
    assert.deepEqual(await tree(cwd), before)
  }
})

test("the local journal location and recovery id cannot escape through links or traversal", async t => {
  const outside = await fixture(t, { "private.ts": "OUTSIDE\n" })
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", "after\n")] })
  await mkdir(join(cwd, ".logic2b"))
  await symlink(outside, join(cwd, ".logic2b/changes"))
  const outsideBefore = await tree(outside)
  await refused(applyLocalChange({ cwd, plan }))
  for (const id of ["../escape", "/tmp/escape", "", "0".repeat(64)]) await refused(recoverLocalChange({ cwd, id }))
  assert.deepEqual(await tree(outside), outsideBefore)
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "before\n")
})

test("tampered staged bytes are detected before they can become consumer source", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const after = "export const intended = true\n"
  const plan = await planLocalChange({ cwd, registryVersion, candidates: [candidate("src/a.ts", after)] })
  let tampered = false
  const result = await applyLocalChange({ cwd, plan, hooks: { afterStage: async () => {
    const transaction = (await listChangeTransactions(cwd)).transactions.find(item => item.planId === plan.id)
    assert.ok(transaction)
    const directory = join(cwd, ".logic2b/changes", transaction.id)
    for (const file of await readdir(directory)) {
      const path = join(directory, file)
      if ((await lstat(path)).isFile() && await readFile(path, "utf8") === after) {
        await writeFile(path, "UNREVIEWED STAGED BYTES\n")
        tampered = true
      }
    }
  } } })
  assert.ok(tampered, "the test must actually replace the staged file")
  assert.ok(result.status === "conflict" || result.status === "interrupted")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "before\n")
})

test("actual CLI returns parseable plans and exact exit codes for apply, conflict, invalid input and recovery", async t => {
  const cwd = await fixture(t, { "src/a.ts": "before\n" })
  const artifacts = await fixture(t)
  const request = join(artifacts, "request.json"), planPath = join(artifacts, "plan.json")
  await writeFile(request, JSON.stringify({ registryVersion, candidates: [candidate("src/a.ts", "after\n")] }))
  const cli = new URL("../src/index.ts", import.meta.url).pathname
  const run = (...args: string[]) => spawnSync(process.execPath, ["--import", "tsx", cli, "change", ...args, "--cwd", cwd, "--json"], { encoding: "utf8" })
  const before = await tree(cwd)
  const emptyStatus = run("status")
  assert.equal(emptyStatus.status, 0, emptyStatus.stderr)
  assert.deepEqual(JSON.parse(emptyStatus.stdout).transactions, [])
  const planned = run("plan", request, "--output", planPath)
  assert.equal(planned.status, 0, planned.stderr)
  const plan = JSON.parse(planned.stdout)
  assert.equal(plan.operations[0].path, "src/a.ts")
  assert.deepEqual(JSON.parse(await readFile(planPath, "utf8")), plan)
  assert.deepEqual(await tree(cwd), before)
  const existingArtifact = await readFile(planPath)
  assert.equal(run("plan", request, "--output", planPath).status, 2)
  assert.deepEqual(await readFile(planPath), existingArtifact)
  const dryRun = run("apply", planPath, "--dry-run")
  assert.equal(dryRun.status, 0, dryRun.stderr)
  assert.equal(JSON.parse(dryRun.stdout).status, "ready")
  assert.deepEqual(await tree(cwd), before)
  const applied = run("apply", planPath)
  assert.equal(applied.status, 0, applied.stderr)
  const result = JSON.parse(applied.stdout)
  assert.equal(result.status, "applied")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "after\n")
  const status = run("status")
  assert.equal(status.status, 0, status.stderr)
  assert.equal(JSON.parse(status.stdout).transactions[0].id, result.transactionId)
  const repeated = run("apply", planPath)
  assert.equal(repeated.status, 0, repeated.stderr)
  assert.equal(JSON.parse(repeated.stdout).status, "already-applied")
  const appliedTree = await tree(cwd)
  const recoveryPreview = run("recover", result.transactionId, "--dry-run")
  assert.equal(recoveryPreview.status, 0, recoveryPreview.stderr)
  assert.equal(JSON.parse(recoveryPreview.stdout).status, "ready")
  assert.deepEqual(await tree(cwd), appliedTree)
  const recovered = run("recover", result.transactionId)
  assert.equal(recovered.status, 0, recovered.stderr)
  assert.equal(JSON.parse(recovered.stdout).status, "recovered")
  assert.equal(await readFile(join(cwd, "src/a.ts"), "utf8"), "before\n")
  await writeFile(join(cwd, "src/a.ts"), "newer user edit\n")
  const staleTree = await tree(cwd)
  const stale = run("apply", planPath)
  assert.equal(stale.status, 1, stale.stderr)
  assert.equal(JSON.parse(stale.stdout).status, "conflict")
  assert.deepEqual(await tree(cwd), staleTree)
  await writeFile(planPath, JSON.stringify({ ...plan, schemaVersion: 99 }))
  const invalid = run("apply", planPath)
  assert.equal(invalid.status, 2)
  assert.equal(invalid.stdout, "")
  assert.match(invalid.stderr, /schemaVersion/)
  assert.deepEqual(await tree(cwd), staleTree)
  assert.equal(run("recover", "../escape").status, 2)
})

function registryFixture(base: string, version: string, content: string): FetchLike {
  const payload = JSON.stringify({ name: "customers", type: "registry:ui", description: "Customer list", files: [{ path: "ui/customers.tsx", type: "registry:ui", content }] })
  const hash = createHash("sha256").update(payload).digest()
  const contentPath = `/r/content/${hash.toString("hex")}.json`
  const routes: Record<string, unknown> = {
    [versionsUrl(base)]: { schemaVersion: 1, latest: version, channels: { next: version }, versions: [{ version, channel: "next", releasedAt: "2026-09-18", manifest: `/r/versions/${version}.json` }] },
    [`${base}/r/versions/${version}.json`]: { schemaVersion: 1, version, channel: "next", releasedAt: "2026-09-18", items: [{ name: "customers", type: "registry:ui", description: "Customer list", version, registryVersion: version, integrity: `sha256-${hash.toString("base64")}`, content: contentPath, changelog: "/r/changelog/customers.json" }] },
    [`${base}${contentPath}`]: payload,
  }
  return async url => ({ ok: url in routes, status: url in routes ? 200 : 404, text: async () => typeof routes[url] === "string" ? routes[url] as string : JSON.stringify(routes[url] ?? "Not found") })
}

test("a second request and real upstream update preserve custom columns, copy and token overrides and expose overlapping conflicts", async t => {
  const base = "https://registry-fixture.invalid"
  const token = ":root { --primary: oklch(0.61 0.17 248); }\n.brand-heading { letter-spacing: 0.03em; }\n"
  const cwd = await fixture(t, { "src/theme.css": token })
  const original = ["export const columns = ['name', 'email']", "export const heading = 'Customers'", "", "export const filters = []", "", "export const empty = 'No customers'", "", "export const pageSize = 10", ""].join("\n")
  const options = { cwd, registry: base, install: false, agentRules: false }
  await addComponents(["customers"], { ...options, registryVersion: "1.0.0", fetchImpl: registryFixture(base, "1.0.0", original) })
  const path = "src/components/ui/customers.tsx"
  const customized = original.replace("['name', 'email']", "['name', 'email', 'accountOwner']").replace("'Customers'", "'Clientes estratégicos'")
  await writeFile(join(cwd, path), customized)
  const secondRequest = customized.replace("export const filters = []", "export const filters = ['active', 'inactive']")
  const plan = await planLocalChange({ cwd, registryVersion: "1.0.0", candidates: [candidate(path, secondRequest)] })
  assert.equal((await applyLocalChange({ cwd, plan })).status, "applied")
  const updated = original.replace("export const pageSize = 10", "export const pageSize = 25")
  const summary = await updateComponents(["customers"], { ...options, registryVersion: "1.1.0", fetchImpl: registryFixture(base, "1.1.0", updated) })
  assert.equal(summary.conflicts, 0)
  assert.equal(summary.merged, 1)
  const merged = await readFile(join(cwd, path), "utf8")
  assert.match(merged, /accountOwner/)
  assert.match(merged, /Clientes estratégicos/)
  assert.match(merged, /filters = \['active', 'inactive'\]/)
  assert.match(merged, /pageSize = 25/)
  assert.equal(await readFile(join(cwd, "src/theme.css"), "utf8"), token)
  const conflicting = updated.replace("'Customers'", "'Registry heading'")
  const conflict = await updateComponents(["customers"], { ...options, registryVersion: "1.2.0", fetchImpl: registryFixture(base, "1.2.0", conflicting) })
  assert.equal(conflict.conflicts, 1)
  const marked = await readFile(join(cwd, path), "utf8")
  assert.match(marked, /<<<<<<< local[\s\S]*Clientes estratégicos[\s\S]*=======[\s\S]*Registry heading[\s\S]*>>>>>>> registry/)
  assert.match(marked, /accountOwner/)
  assert.equal(await readFile(join(cwd, "src/theme.css"), "utf8"), token)
})
