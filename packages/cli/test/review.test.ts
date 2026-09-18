import assert from "node:assert/strict"
import { link, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { test } from "node:test"
import { reviewLocalFiles } from "../src/review.ts"
async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-review-"))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  await mkdir(join(cwd, "src"))
  return cwd
}
test("local review matches shared evidence and never changes files or executes source", async t => {
  const cwd = await fixture(t)
  const source = 'throw new Error("DO_NOT_EXECUTE"); const App=()=> <button className="text-red-500" />'
  await writeFile(join(cwd, "src/App.tsx"), source)
  const result = await reviewLocalFiles({ cwd, paths: ["src"], semanticColors: true })
  assert.equal(result.findings.length, 1); assert.equal(result.findings[0].rule, "L2B-TOK-001")
  assert.equal(result.unknowns.length, 1)
  assert.equal(await readFile(join(cwd, "src/App.tsx"), "utf8"), source)
  assert.equal((await reviewLocalFiles({ cwd, paths: ["src/App.tsx"], semanticColors: true, completeLabelContext: true })).findings.length, 2)
})
test("file collector rejects escapes, private paths, symlinks, overlaps and byte overflow", async t => {
  const cwd = await fixture(t), outside = await fixture(t)
  await writeFile(join(cwd, "src/App.tsx"), '<button/>')
  await writeFile(join(outside, "private.tsx"), 'PRIVATE_SECRET')
  await symlink(join(outside, "private.tsx"), join(cwd, "leak.tsx"))
  await link(join(outside, "private.tsx"), join(cwd, "linked.tsx"))
  await symlink(outside, join(cwd, "outside"))
  for (const paths of [[join(outside,"private.tsx")], ["leak.tsx"], ["linked.tsx"], ["outside/private.tsx"], [".git/private.tsx"], ["src", "src/App.tsx"]]) await assert.rejects(reviewLocalFiles({cwd,paths}))
  await writeFile(join(cwd, "large.tsx"), "é".repeat(140000))
  await assert.rejects(reviewLocalFiles({cwd,paths:["large.tsx"]}), /256 KiB/)
  await writeFile(join(cwd, "invalid.tsx"), Buffer.from([0xff, 0xfe]))
  await assert.rejects(reviewLocalFiles({cwd,paths:["invalid.tsx"]}), /encoded data/)
})
test("actual CLI exit codes distinguish findings, parse failure and zero demonstrated findings", async t => {
  const cwd = await fixture(t)
  const cli = new URL("../src/index.ts", import.meta.url).pathname
  const run = (...args: string[]) => spawnSync(process.execPath, ["--import", "tsx", cli, "review", "src", "--cwd", cwd, "--json", ...args], {encoding:"utf8"})
  await writeFile(join(cwd, "src/App.tsx"), '<button className="text-red-500"/>')
  const partial=run(); assert.equal(partial.status,0,partial.stderr); assert.equal(JSON.parse(partial.stdout).unknowns.length,1)
  const policy=run('--semantic-colors'); assert.equal(policy.status,1,policy.stderr); assert.equal(JSON.parse(policy.stdout).findings[0].category,'design-policy')
  const complete=run('--complete-label-context'); assert.equal(complete.status,1,complete.stderr); assert.equal(JSON.parse(complete.stdout).findings[0].rule,'L2B-A11Y-003')
  await writeFile(join(cwd, "src/App.tsx"), 'const App=()=> <broken')
  const invalid=run(); assert.equal(invalid.status,2,invalid.stderr); assert.equal(JSON.parse(invalid.stdout).unknowns[0].rule,'parse')
  const invalidScope=run('--scope','states'); assert.equal(invalidScope.status,2); assert.match(invalidScope.stderr,/scope/)
  await writeFile(join(cwd, "src/App.tsx"), "é".repeat(140000))
  const oversized=run(); assert.equal(oversized.status,2); assert.match(oversized.stderr,/256 KiB/)
})
