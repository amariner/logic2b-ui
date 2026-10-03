import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { validateRulePrecondition, type AgentRulesPlan, type RuleInventoryItem } from "@logic2b/scaffold/rules"
import type { ScaffoldPlan } from "../../src/scaffold.ts"
import { runTool } from "../../src/tools.ts"

const paths = ["AGENTS.md", "DESIGN.md"]
const managed = (path: string) => new RegExp(`<!-- logic2b:${path === "DESIGN.md" ? "design" : "rules"}:start[^\\n]*-->[\\s\\S]*?<!-- logic2b:${path === "DESIGN.md" ? "design" : "rules"}:end -->`)
const outside = (path: string, content: string) => {
  assert.ok(managed(path).test(content), `${path} must have a complete managed section`)
  return content.replace(managed(path), "<managed-section>")
}

/** Refresh real consumer files through the public MCP plan and host preconditions. */
export async function verifyRuleRefresh(target: string, scaffold: ScaffoldPlan): Promise<void> {
  const currentFiles = await Promise.all(paths.map(async (path) => {
    const original = await readFile(join(target, path), "utf8")
    const block = original.match(managed(path))?.[0]
    assert.ok(block, `${path} must contain scaffolded managed context`)
    const staleBlock = `${block.slice(0, block.indexOf("\n"))}\nStale generated context to refresh.\n${block.slice(block.lastIndexOf("\n") + 1)}`
    const content = `# Consumer-owned ${path}\nKeep this UTF-8 policy · 😀.\n\n${original.replace(managed(path), staleBlock)}\nConsumer-owned suffix: preserve our existing data layer.\n`
    await writeFile(join(target, path), content)
    return { path, content }
  }))
  const inventory: RuleInventoryItem[] = scaffold.items.map((item) => ({
    name: item.name,
    kind: item.files?.some((path) => path.startsWith("charts/")) ? "chart"
      : item.files?.some((path) => path.startsWith("blocks/")) ? "block"
        : item.files?.some((path) => path.startsWith("ui/")) ? "component" : "other",
  }))
  const args = { stack: scaffold.framework, preset: scaffold.preset, iconLibrary: scaffold.iconLibrary,
    registryVersion: scaffold.registryVersion, inventory, inventoryKind: "installed", currentFiles }
  const result = await runTool("agent_rules", args)
  assert.equal(result.isError, undefined)
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
  const plan = result.structuredContent as unknown as AgentRulesPlan
  assert.deepEqual(plan.files.map((file) => file.path), paths)
  for (const file of plan.files) {
    assert.equal(file.action, "update", file.path)
    const original = currentFiles.find((entry) => entry.path === file.path)!.content
    assert.equal(outside(file.path, file.content), outside(file.path, original), `${file.path} changed project instructions`)
    await validateRulePrecondition(await readFile(join(target, file.path), "utf8"), file.precondition)
    if (file.path === "AGENTS.md") {
      assert.match(file.content, /Recorded installed inventory/)
      for (const item of scaffold.items) assert.ok(file.content.includes(`\`${item.name}\``), item.name)
    } else if (scaffold.preset === undefined) {
      assert.match(file.content, /Reference defaults; these tokens do not prove the consuming project's active theme/)
    }
  }
  for (const file of plan.files) await writeFile(join(target, file.path), file.content)
  const written = await Promise.all(paths.map(async (path) => ({ path, content: await readFile(join(target, path), "utf8") })))
  const repeated = await runTool("agent_rules", { ...args, currentFiles: written })
  assert.equal(repeated.isError, undefined)
  const unchanged = repeated.structuredContent as unknown as AgentRulesPlan
  assert.deepEqual(repeated.structuredContent, JSON.parse(repeated.content[0].text))
  assert.deepEqual(unchanged.files.map((file) => file.path), paths)
  for (const file of unchanged.files) {
    assert.equal(file.action, "unchanged", file.path)
    assert.equal(file.content, written.find((entry) => entry.path === file.path)!.content)
    await validateRulePrecondition(await readFile(join(target, file.path), "utf8"), file.precondition)
  }
}
