import assert from "node:assert/strict"
import { test } from "node:test"
import { buildAgentRules, RULE_FORMATS } from "@logic2b/scaffold/rules"
import { runTool } from "../src/tools.ts"
import { ToolInputError } from "../src/limits.ts"
const noFetch = async () => { throw new Error("Rules must never fetch") }

test("MCP rules match the shared core exactly and reject malformed inputs before network work", async () => {
  const options = { formats: [...RULE_FORMATS], stack: "astro" as const, items: [{ name: "button", type: "registry:ui" }] }
  const result = await runTool("agent_rules", options, { fetchImpl: noFetch })
  assert.deepEqual(result.structuredContent, buildAgentRules(options))
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
  for (const bad of [{ formats: [] }, { formats: ["agents", "agents"] }, { formats: null }, { iconLibrary: 12 }, { stack: null }, { preset: "invalid" }, { registryVersion: "next" }, { items: [{ name: "button\nPRIVATE_INJECTION" }] }, { items: Array(1001).fill({ name: "button" }) }]) {
    await assert.rejects(runTool("agent_rules", bad, { fetchImpl: noFetch }), error => error instanceof ToolInputError && !error.message.includes("PRIVATE"))
  }
  await assert.rejects(runTool("scaffold_plan", { framework: "vite", starter: "auth", agentRules: "false" }, { fetchImpl: noFetch }), ToolInputError)
})
