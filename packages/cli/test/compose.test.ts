import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { test } from "node:test"
import { composeLocal, readComposeRequest, applyCompositionProject } from "../src/compose.ts"
import type { ComposePlan } from "@logic2b/scaffold/compose"
const execFileAsync = promisify(execFile)
const request = { requirements: [{ id: "browse", route: "/customers", task: "browse-customers", roles: ["list"], requiredStates: ["loading", "empty", "error"], actions: [] }] }

test("CLI composes immutable real items without project writes; exit codes distinguish gaps and invalid input", async t => {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-compose-"))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url!, "http://localhost").pathname
      if (!/^\/r\/(?:versions|content)/.test(pathname)) throw new Error("unexpected URL")
      res.end(await readFile(new URL(`../../../apps/web/public${pathname}`, import.meta.url)))
    } catch { res.writeHead(404).end() }
  })
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
  const registry = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const file = join(cwd, "request.json")
  const cli = new URL("../src/index.ts", import.meta.url).pathname
  const run = (...args: string[]) => execFileAsync(process.execPath, ["--import", "tsx", cli, "compose", file, "--registry", registry, ...args], { cwd: new URL("..", import.meta.url).pathname })
  await writeFile(file, JSON.stringify(request))
  const before = await readdir(cwd)
  const result = await run("--json")
  assert.deepEqual(JSON.parse(result.stdout), await composeLocal(request, { registry }))
  assert.deepEqual(await readdir(cwd), before)
  assert.match((await run()).stdout, /list: admin-customers-01/)
  const projectResult = await run("--project", "--json")
  const projectPlan = JSON.parse(projectResult.stdout) as ComposePlan
  assert.ok(projectPlan.project)
  assert.deepEqual(await readdir(cwd), before, "project output itself is read-only")
  const target = join(cwd, "generated")
  await run("--apply", target, "--json")
  for (const file of projectPlan.project!.files) assert.equal(await readFile(join(target, file.path), "utf8"), file.content)
  await assert.rejects(run("--apply", target), error => (error as { code: number }).code === 2)
  assert.equal(await readFile(join(target, "package.json"), "utf8"), projectPlan.project!.files.find(file => file.path === "package.json")!.content)
  await assert.rejects(applyCompositionProject({ ...projectPlan, project: { ...projectPlan.project!, files: [{ path: "../escape", content: "NEVER_WRITE" }] } }, join(cwd, "unsafe")), /unsafe/)
  const partial = { requirements: [{ ...request.requirements[0], actions: ["retry"] }] }
  await writeFile(file, JSON.stringify(partial))
  await assert.rejects(run("--json"), error => { const failure = error as { code: number; stdout: string }; assert.equal(failure.code, 1); assert.equal(JSON.parse(failure.stdout).coverage[0].status, "partial"); return true })
  await writeFile(file, '{"requirements": []}')
  await assert.rejects(run(), error => (error as { code: number }).code === 2)
  await writeFile(file, 'process.exit(88)')
  await assert.rejects(run(), error => (error as { code: number }).code === 2)
  await writeFile(file, "x".repeat(65537)); await assert.rejects(readComposeRequest(file), /65536 bytes/)
  await writeFile(file, Buffer.from([0xff])); await assert.rejects(readComposeRequest(file), /UTF-8 JSON/)
})
