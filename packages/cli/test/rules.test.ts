import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile, stat, chmod, link, readdir } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { buildAgentRules, RULE_FORMATS, RULE_LIMITS } from "@logic2b/scaffold/rules"
import { generateLocalRules, writeAgentRules } from "../src/rules.ts"

async function root(t: { after: (fn: () => Promise<void>) => void }) {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-rules-"))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  return cwd
}
async function configured(t: { after: (fn: () => Promise<void>) => void }) {
  const cwd = await root(t)
  await writeFile(join(cwd, "components.json"), JSON.stringify({ logic2b: { registry: "https://ui.logic2b.com", version: "1.0.0-rc.17" }, iconLibrary: "lucide" }))
  await mkdir(join(cwd, ".logic2b"))
  await writeFile(join(cwd, ".logic2b/manifest.json"), JSON.stringify({ schemaVersion: 1, registry: { url: "https://ui.logic2b.com", resolvedVersion: "1.0.0-rc.17" }, items: { button: { files: ["ui/button.tsx"] } } }))
  return cwd
}

test("CLI rules writes actual local inventory and preserves project bytes and permissions on rerun", async t => {
  const cwd = await configured(t)
  const policy = "\ufeff# Project policy\r\nPreserve native controls.\r\n"
  await writeFile(join(cwd, "AGENTS.md"), policy)
  await chmod(join(cwd, "AGENTS.md"), 0o640)
  const result = await generateLocalRules({ cwd, formats: [...RULE_FORMATS] })
  assert.equal(result.length, 5)
  const text = await readFile(join(cwd, "AGENTS.md"), "utf8")
  assert.ok(text.startsWith(policy)); assert.match(text, /Components: button/)
  assert.equal((await stat(join(cwd, "AGENTS.md"))).mode & 0o777, 0o640)
  const time = (await stat(join(cwd, "AGENTS.md"))).mtimeMs
  assert.ok((await generateLocalRules({ cwd, formats: [...RULE_FORMATS] })).every(file => file.action === "unchanged"))
  assert.equal((await stat(join(cwd, "AGENTS.md"))).mtimeMs, time)
  assert.equal((await readFile(join(cwd, ".logic2b/manifest.json"), "utf8")).includes("button"), true)
})
test("preflight rejects malformed later documents before writing the first one", async t => {
  const cwd = await root(t)
  const malformed = "# Keep me\n<!-- logic2b:design:start v2 -->\n<!-- logic2b:design:end -->"
  await writeFile(join(cwd, "DESIGN.md"), malformed)
  await assert.rejects(writeAgentRules(cwd, buildAgentRules()), /markers/)
  assert.deepEqual(await readdir(cwd), ["DESIGN.md"])
  assert.equal(await readFile(join(cwd, "DESIGN.md"), "utf8"), malformed)
})
test("symlink files, parent directories and hardlinks cannot redirect rule writes", async t => {
  const cwd = await root(t), outside = await root(t)
  const target = join(outside, "policy.md")
  await writeFile(target, "outside rules")
  await symlink(target, join(cwd, "AGENTS.md"))
  await assert.rejects(writeAgentRules(cwd, buildAgentRules()), /Unsafe/)
  await rm(join(cwd, "AGENTS.md")); await link(target, join(cwd, "AGENTS.md"))
  await assert.rejects(writeAgentRules(cwd, buildAgentRules()), /Unsafe/)
  await rm(join(cwd, "AGENTS.md")); await symlink(outside, join(cwd, ".cursor"))
  await assert.rejects(writeAgentRules(cwd, buildAgentRules({ formats: ["cursor"] })), /Unsafe/)
  assert.equal(await readFile(target, "utf8"), "outside rules")
  assert.deepEqual(await readdir(cwd), [".cursor"])
})
test("oversized and invalid UTF-8 documents reject without modifying bytes", async t => {
  const cwd = await root(t)
  for (const buffer of [Buffer.alloc(RULE_LIMITS.documentBytes + 1, 97), Buffer.from([0xff, 0xfe, 0x00])]) {
    await writeFile(join(cwd, "AGENTS.md"), buffer)
    await assert.rejects(writeAgentRules(cwd, buildAgentRules()))
    assert.deepEqual(await readFile(join(cwd, "AGENTS.md")), buffer)
  }
})
test("actual command exposes editor formats and rejects non-logic2b projects", async t => {
  const cwd = await configured(t)
  const cli = new URL("../src/index.ts", import.meta.url).pathname
  const run = (...args: string[]) => spawnSync(process.execPath, ["--import", "tsx", cli, "rules", "--cwd", cwd, ...args], { encoding: "utf8" })
  const result = run("--format", "claude,cursor,copilot")
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /created CLAUDE.md/)
  assert.notEqual(run("--format", "invalid").status, 0)
  await writeFile(join(cwd, "components.json"), JSON.stringify({ logic2b: { registry: "https://other.invalid" } }))
  await assert.rejects(generateLocalRules({ cwd }), /logic2b registry/)
})

test("add/update refresh inventory and preserve project policy; opt-out leaves rules alone", async t => {
  const { addComponents, updateComponents } = await import("../src/lib.ts")
  const cwd = await root(t)
  await writeFile(join(cwd, "components.json"), JSON.stringify({ logic2b: { registry: "https://ui.logic2b.com" } }))
  let upstream = "export const Button = () => null\n"
  const fetchImpl = async (url: string) => {
    const name = new URL(url).pathname.split("/").pop()!.replace(".json", "")
    const payload = name === "index" ? ["button", "card"].map(name => ({ name, type: "registry:ui", description: name })) : { name, type: "registry:ui", description: name, files: [{ path: `ui/${name}.tsx`, type: "registry:ui", content: name === "button" ? upstream : "export const Card = () => null\n" }] }
    return { ok: true, status: 200, text: async () => JSON.stringify(payload) }
  }
  await addComponents(["button"], { cwd, install: false, fetchImpl })
  const agents = join(cwd, "AGENTS.md")
  const suffix = "\r\n# Owner policy\r\nKeep custom columns.\r\n"
  await writeFile(agents, (await readFile(agents, "utf8")) + suffix)
  await addComponents(["card"], { cwd, install: false, fetchImpl })
  assert.match(await readFile(agents, "utf8"), /Components: button, card/)
  assert.ok((await readFile(agents, "utf8")).endsWith(suffix))
  upstream = "export const Button = () => 'updated'\n"
  await updateComponents(["button"], { cwd, install: false, fetchImpl })
  assert.ok((await readFile(agents, "utf8")).endsWith(suffix))
  await rm(agents); await rm(join(cwd, "DESIGN.md"))
  await addComponents(["button"], { cwd, install: false, fetchImpl, agentRules: false })
  await assert.rejects(readFile(agents), { code: "ENOENT" })
})

test("actual init writes rules in both modes, records applied presets and honors opt-out", async t => {
  const { DEFAULT_CONFIG, encodePreset } = await import("@logic2b/tokens")
  const cwd = await root(t)
  const cli = new URL("../src/index.ts", import.meta.url).href
  const registry = new URL("../../../apps/web/public/r/", import.meta.url).pathname
  const script = `import {readFile} from 'node:fs/promises'; globalThis.fetch=async url=>{try{return {ok:true,status:200,text:()=>readFile(${JSON.stringify(registry)}+new URL(url).pathname.replace(/^\\/r\\//,''),'utf8')}}catch{return {ok:false,status:404,text:async()=>''}}}; process.argv=['node',...JSON.parse(process.env.LOGIC2B_TEST_ARGS)]; await import(${JSON.stringify(cli)});`
  const run = (...args: string[]) => spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { encoding: "utf8", env: { ...process.env, LOGIC2B_TEST_ARGS: JSON.stringify(["init", "--cwd", cwd, "--no-install", ...args]) } })
  const initialized = run(); assert.equal(initialized.status, 0, initialized.stderr)
  assert.match(await readFile(join(cwd, "AGENTS.md"), "utf8"), /logic2b:rules:start/)
  const config = JSON.parse(await readFile(join(cwd, "components.json"), "utf8")); config.customPolicy = { preserve: true }
  await writeFile(join(cwd, "components.json"), JSON.stringify(config))
  const preset = encodePreset({ ...DEFAULT_CONFIG, radius: "none" })
  const result = run("--preset", preset)
  assert.equal(result.status, 0, result.stderr)
  const updated = JSON.parse(await readFile(join(cwd, "components.json"), "utf8"))
  assert.equal(updated.logic2b.preset, preset); assert.deepEqual(updated.customPolicy, { preserve: true })
  assert.match(await readFile(join(cwd, "DESIGN.md"), "utf8"), new RegExp(preset))
  await rm(join(cwd, "AGENTS.md")); await rm(join(cwd, "DESIGN.md"))
  assert.equal(run("--no-agent-rules").status, 0)
  await assert.rejects(readFile(join(cwd, "AGENTS.md")), { code: "ENOENT" })
})
