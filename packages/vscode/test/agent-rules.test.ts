import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  agentRulesOptionsFromProject,
  applyWorkspaceAgentRules,
  prepareWorkspaceAgentRules,
  projectAgentRulesEnabled,
  type AgentRulesWorkspace,
  type WorkspaceAgentRulesFile,
  type WorkspaceAgentRulesOptions,
} from "../src/agent-rules.ts"
import { cliArgsForAgentRules } from "../src/core.ts"

const options: WorkspaceAgentRulesOptions = {
  stack: "vite",
  inventory: [{ name: "button", kind: "component" }],
  inventoryKind: "installed",
  registryVersion: "1.0.0-rc.17",
  availableTools: [],
  formats: ["agents"],
}

function workspace(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial))
  const reads: string[] = []
  const writes: WorkspaceAgentRulesFile[][] = []
  const io: AgentRulesWorkspace = {
    async read(path) { reads.push(path); return files.get(path) ?? null },
    async apply(changes) { writes.push(changes); for (const file of changes) files.set(file.path, file.content); return true },
  }
  return { io, files, reads, writes }
}

describe("VS Code agent rules bridge", () => {
  test("selects bounded project metadata and installed inventory without forwarding private fields", () => {
    const input = agentRulesOptionsFromProject(
      JSON.stringify({ $schema: "https://ui.logic2b.com/schema.json", logic2b: { registry: "https://private.example/SECRET_REGISTRY", version: "next" }, iconLibrary: "lucide", privateToken: "SECRET_CONFIG" }),
      JSON.stringify({ schemaVersion: 1, registry: { resolvedVersion: "1.0.0-rc.17", url: "SECRET_MANIFEST_URL" }, items: { "customer-list": { files: ["blocks/customer-list.tsx"] }, button: { files: ["ui/button.tsx"] }, "chart-area": { files: ["charts/chart-area.tsx"] } } }),
      JSON.stringify({ name: "SECRET_PACKAGE_NAME", scripts: { build: "SECRET_SCRIPT" }, dependencies: { react: "19.2.0" }, devDependencies: { vite: "7.0.0" } }),
    )
    assert.equal(input.stack, "vite")
    assert.deepEqual(input.inventory, [{ name: "button", kind: "component" }, { name: "chart-area", kind: "chart" }, { name: "customer-list", kind: "block" }])
    assert.equal(input.inventoryKind, "installed")
    assert.equal(input.registryVersion, "1.0.0-rc.17")
    assert.deepEqual(input.availableTools, [])
    assert.doesNotMatch(JSON.stringify(input), /SECRET_/)
    assert.equal(agentRulesOptionsFromProject('{"logic2b":{"registry":"https://ui.logic2b.com"}}', null, '{"dependencies":{"next":"16","vite":"7"}}').stack, "unknown")
    assert.throws(() => agentRulesOptionsFromProject("{}", null, null), /logic2b registry/i)
    assert.throws(() => agentRulesOptionsFromProject('{"logic2b":{"registry":"https://ui.logic2b.com"}}', '{"schemaVersion":2}', null), /schemaVersion/i)
  })

  test("preserves unmanaged instructions, refreshes installed inventory and becomes a no-op", async () => {
    const target = workspace({ "AGENTS.md": "# Project policy\nPreserve the customer's native controls.\n", "DESIGN.md": "# Existing design\nUse our custom spacing scale.\n" })
    const first = await prepareWorkspaceAgentRules(target.io, options)
    assert.equal(await applyWorkspaceAgentRules(target.io, first), 2)
    const originalAgents = target.files.get("AGENTS.md")!
    const originalDesign = target.files.get("DESIGN.md")!
    assert.ok(originalAgents.startsWith("# Project policy\nPreserve the customer's native controls.\n"))
    assert.ok(originalDesign.startsWith("# Existing design\nUse our custom spacing scale.\n"))
    target.files.set("AGENTS.md", `${originalAgents}\n## Local testing\nRun our customer fixture.\n`)
    const updated = await prepareWorkspaceAgentRules(target.io, { ...options, inventory: [...options.inventory!, { name: "card", kind: "component" }] })
    await applyWorkspaceAgentRules(target.io, updated)
    assert.match(target.files.get("AGENTS.md")!, /button.*card/)
    assert.ok(target.files.get("AGENTS.md")!.endsWith("\n## Local testing\nRun our customer fixture.\n"))
    assert.equal(target.files.get("DESIGN.md"), originalDesign)
    const before = [...target.files]
    const repeats = target.writes.length
    const repeated = await prepareWorkspaceAgentRules(target.io, { ...options, inventory: [...options.inventory!, { name: "card", kind: "component" }] })
    assert.equal(await applyWorkspaceAgentRules(target.io, repeated), 0)
    assert.deepEqual([...target.files], before)
    assert.equal(target.writes.length, repeats)
  })

  test("checks all expected snapshots before requesting any workspace mutation", async () => {
    const target = workspace({ "AGENTS.md": "Project instructions.\n" })
    const plan = await prepareWorkspaceAgentRules(target.io, options)
    target.files.set("AGENTS.md", "A colleague changed these instructions.\n")
    await assert.rejects(() => applyWorkspaceAgentRules(target.io, plan), /stale|changed|precondition|expected/i)
    assert.equal(target.writes.length, 0)
    assert.equal(target.files.has("DESIGN.md"), false)
    const missing = workspace()
    const create = await prepareWorkspaceAgentRules(missing.io, options)
    missing.files.set("DESIGN.md", "A colleague created this file.\n")
    await assert.rejects(() => applyWorkspaceAgentRules(missing.io, create), /stale|exist|appeared|precondition|expected/i)
    assert.equal(missing.writes.length, 0)
    const repeat = workspace(Object.fromEntries(plan.files.map((file) => [file.path, file.content])))
    const refresh = await prepareWorkspaceAgentRules(repeat.io, { ...options, inventory: [{ name: "card", kind: "component" }] })
    assert.equal(refresh.files.find((file) => file.path === "DESIGN.md")!.action, "unchanged")
    repeat.files.set("DESIGN.md", "A colleague changed the design context.\n")
    await assert.rejects(() => applyWorkspaceAgentRules(repeat.io, refresh), /stale|changed|precondition|expected/i)
    assert.equal(repeat.writes.length, 0)
  })

  test("respects the persisted automatic preference and rejects ambiguous values", () => {
    assert.equal(projectAgentRulesEnabled('{"logic2b":{"agentRules":false}}'), false)
    assert.equal(projectAgentRulesEnabled('{"logic2b":{"agentRules":true}}'), true)
    assert.equal(projectAgentRulesEnabled("{}"), true)
    assert.throws(() => projectAgentRulesEnabled('{"logic2b":{"agentRules":"false"}}'), /boolean/)
  })

  test("reads the persisted opt-out from UTF-8 BOM metadata", () => {
    assert.equal(projectAgentRulesEnabled('\ufeff{"logic2b":{"agentRules":false}}'), false)
  })

  test("reads project configuration, manifest and package metadata with UTF-8 BOMs", () => {
    const input = agentRulesOptionsFromProject(
      '\ufeff{"logic2b":{"registry":"https://ui.logic2b.com"}}',
      '\ufeff{"schemaVersion":1,"registry":{"resolvedVersion":"1.0.0-rc.17"},"items":{"button":{"files":["ui/button.tsx"]}}}',
      '\ufeff{"dependencies":{"react":"19"},"devDependencies":{"vite":"8"}}',
    )
    assert.equal(input.stack, "vite")
    assert.equal(input.registryVersion, "1.0.0-rc.17")
    assert.deepEqual(input.inventory, [{ name: "button", kind: "component" }])
  })

  test("reads only the requested editor formats and rejects malformed managed markers", async () => {
    const target = workspace({ "CLAUDE.md": "<!-- logic2b:rules:start v1 -->\nBroken unrelated file." })
    const plan = await prepareWorkspaceAgentRules(target.io, { ...options, formats: ["cursor", "copilot"] })
    assert.deepEqual(plan.files.map((file) => file.path).sort(), [".cursor/rules/logic2b.mdc", ".github/copilot-instructions.md", "DESIGN.md"])
    assert.equal(target.reads.includes("CLAUDE.md"), false)
    const broken = workspace({ "AGENTS.md": "<!-- logic2b:rules:start v1 -->\nMissing end marker." })
    await assert.rejects(() => prepareWorkspaceAgentRules(broken.io, options), /marker|managed|unterminated/i)
    assert.equal(broken.writes.length, 0)
  })

  test("surfaces a rejected workspace edit without claiming completion", async () => {
    const target = workspace()
    target.io.apply = async () => false
    const plan = await prepareWorkspaceAgentRules(target.io, options)
    await assert.rejects(() => applyWorkspaceAgentRules(target.io, plan), /could not apply|affected files/i)
  })

  test("opts out with capable CLIs without passing unknown flags to the old published CLI", () => {
    assert.deepEqual(cliArgsForAgentRules(["button"], false, "Options:\n  --registry <url>  Registry URL"), ["button"])
    assert.deepEqual(cliArgsForAgentRules(["button"], false, "Options:\n  --no-agent-rules  Skip project instructions"), ["button", "--no-agent-rules"])
    assert.deepEqual(cliArgsForAgentRules(["button"], true, "--no-agent-rules"), ["button"])
  })
})
