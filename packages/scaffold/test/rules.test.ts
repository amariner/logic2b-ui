import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"
import {
  AGENT_RULE_FORMATS, RULES_CATALOG, RULES_LIMITS, buildAgentRulesPlan,
  buildDesignMd, buildStudioAgentsMd, hashRuleContent, mergeManagedRules,
  validateAgentRulesOptions, validateRulePrecondition,
} from "../src/rules.ts"

const preset = encodePreset(DEFAULT_CONFIG)
const pathOf = (value: { files: Array<{ path: string; content: string }> }, path: string) => { const file = value.files.find((file) => file.path === path); assert.ok(file, path); return file }
const fixture = (path: string) => readFile(new URL(`./fixtures/rules/${path}`, import.meta.url), "utf8")
const marker = (content: string) => content.slice(content.indexOf("<!-- logic2b:rules:start"), content.indexOf("<!-- logic2b:rules:end -->") + "<!-- logic2b:rules:end -->".length)

// The parity artifacts were captured before moving the existing studio generators.
test("studio AGENTS/DESIGN bytes survive the shared-generator move", async () => {
  const catalog = JSON.parse(await readFile(new URL("../../../apps/web/public/r/index.json", import.meta.url), "utf8"))
  const { BEHAVIOR_CONTRACTS } = await import("../../registry/behavior.ts")
  assert.equal(buildStudioAgentsMd(DEFAULT_CONFIG, catalog, BEHAVIOR_CONTRACTS), await fixture("studio-default-agents.md"))
  assert.equal(buildDesignMd(DEFAULT_CONFIG), await fixture("studio-default-design.md"))
  const inventory = catalog.map((entry: { name: string; type: string; categories?: string[] }) => ({ name: entry.name, kind: entry.type === "registry:ui" ? "component" : entry.categories?.includes("charts") ? "chart" : entry.type === "registry:block" ? "block" : "other" })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
  assert.deepEqual(RULES_CATALOG, inventory, "catalog metadata cannot silently drift")
})

test("all formats derive one bounded block while DESIGN remains separate", async () => {
  const plan = await buildAgentRulesPlan({ preset, registryVersion: "1.0.0-rc.17", formats: [...AGENT_RULE_FORMATS] })
  assert.deepEqual(plan.files.map((file) => file.path), ["AGENTS.md", "DESIGN.md", "CLAUDE.md", ".cursor/rules/logic2b.mdc", ".github/copilot-instructions.md"])
  const agents = pathOf(plan, "AGENTS.md").content
  assert.ok(Buffer.byteLength(marker(agents)) <= RULES_LIMITS.managedBytes)
  assert.equal(marker(pathOf(plan, ".cursor/rules/logic2b.mdc").content), marker(agents))
  assert.equal(marker(pathOf(plan, ".github/copilot-instructions.md").content), marker(agents))
  assert.match(pathOf(plan, ".cursor/rules/logic2b.mdc").content, /^---\n[\s\S]*alwaysApply: true\n---/)
  assert.equal(pathOf(plan, "CLAUDE.md").content, "@AGENTS.md\n")
  assert.match(pathOf(plan, "DESIGN.md").content, /logic2b:design:start v1/)
  assert.doesNotMatch(agents, /\| Token \| Light \| Dark \|/)
  assert.ok(plan.files.every((file) => file.action === "create" && file.precondition.kind === "missing"))
  for (const file of plan.files) assert.equal(file.content, await fixture(`format-${file.path === "AGENTS.md" ? "agents" : file.path === "DESIGN.md" ? "design" : file.path === "CLAUDE.md" ? "claude" : file.path.includes("cursor") ? "cursor" : "copilot"}.md`))
})

test("Claude dependencies and installed inventories do not imply the full catalog was installed", async () => {
  const plan = await buildAgentRulesPlan({ formats: ["claude"], inventory: [{ name: "customer-edit-01", kind: "block" }, { name: "button", kind: "component" }] })
  assert.deepEqual(plan.files.map((file) => file.path), ["AGENTS.md", "DESIGN.md", "CLAUDE.md"])
  const rules = pathOf(plan, "AGENTS.md").content
  assert.match(rules, /Recorded installed inventory/)
  assert.match(rules, /Components: `button`/)
  assert.match(rules, /Blocks: `customer-edit-01`/)
  assert.doesNotMatch(rules, /`accordion`/)
  assert.match(pathOf(plan, "DESIGN.md").content, /Reference defaults/)
  const unknownInstalled = pathOf(await buildAgentRulesPlan({ inventoryKind: "installed" }), "AGENTS.md").content
  assert.match(unknownInstalled, /Components: none recorded/)
  assert.doesNotMatch(unknownInstalled, /`button`|`accordion`/)
})

test("instructions mention inspection/review/composition/proposal only when the host advertises them", async () => {
  const unavailable = pathOf(await buildAgentRulesPlan({ inventory: [] }), "AGENTS.md").content
  assert.doesNotMatch(unavailable, /Run.*`review_ui`|Use.*`compose_plan`|Use.*`proposal_link`|Use.*`inspect_project`|`scaffold_plan`/)
  assert.match(unavailable, /not assumed available/)
  const tools = ["inspect_project", "review_ui", "compose_plan", "proposal_link", "install_plan", "scaffold_plan"]
  const advertised = pathOf(await buildAgentRulesPlan({ availableTools: tools }), "AGENTS.md").content
  for (const name of tools) assert.ok(advertised.includes(`\`${name}\``), name)
  const local = pathOf(await buildAgentRulesPlan({ availableTools: ["cli:inspect"] }), "AGENTS.md").content
  assert.match(local, /logic2b inspect --json/)
  assert.doesNotMatch(local, /Use `inspect_project`/)
})

test("fresh/append/update merges preserve outside bytes and are idempotent", async () => {
  const block = marker(pathOf(await buildAgentRulesPlan({ inventory: [] }), "AGENTS.md").content)
  const first = mergeManagedRules(undefined, block)
  assert.equal(first.status, "created")
  const user = "\uFEFF# Project policy\r\nKeep native controls and our copy.\r\n"
  const appended = mergeManagedRules(user, block)
  assert.equal(appended.status, "appended")
  assert.ok(appended.content.startsWith(user))
  assert.equal(mergeManagedRules(appended.content, block).status, "unchanged")
  const suffix = "\r\n# More project rules\r\nDo not change billing."
  const changedBlock = marker(pathOf(await buildAgentRulesPlan({ inventory: [{ name: "button", kind: "component" }] }), "AGENTS.md").content)
  const changed = mergeManagedRules(appended.content + suffix, changedBlock)
  assert.equal(changed.status, "updated")
  assert.ok(changed.content.startsWith(user))
  assert.ok(changed.content.endsWith(suffix))
})

test("malformed/duplicate/unsupported marker versions cannot overwrite instructions", async () => {
  const block = marker(pathOf(await buildAgentRulesPlan(), "AGENTS.md").content)
  for (const original of [block + block, block.replace("v1", "v2"), block.replace("logic2b:rules:end", "broken:end"), block.replace("logic2b:rules:start", "broken:start"), "<!-- logic2b:rules:end -->\n" + block]) {
    assert.throws(() => mergeManagedRules(original, block), /marker|version|managed/i)
  }
  for (const fence of ["```", "~~~~"]) {
    assert.throws(() => mergeManagedRules(`${fence}md\n${block}\n${fence}\n`, block), /code fence/)
    assert.throws(() => mergeManagedRules(`# Import example\n${fence}md\nSample content.\n`, block), /code fence/)
  }
  assert.throws(() => mergeManagedRules(`\ufeff\`\`\`md\n${block}\n\`\`\`\n`, block), /code fence/)
  for (const prefix of ["    ", "> ", "Example: "]) assert.throws(() => mergeManagedRules(prefix + block.replaceAll("\n", `\n${prefix}`) + "\n", block), /own unindented lines/)
  const design = pathOf(await buildAgentRulesPlan({ formats: ["design"] }), "DESIGN.md").content.trimEnd()
  assert.throws(() => mergeManagedRules(`\`\`\`md\n${design}\n\`\`\`\n`, design, "design"), /code fence/)
})

test("each editor preserves its existing frontmatter/sections and Claude import is appended once", async () => {
  const current = [
    { path: "AGENTS.md", content: "# User rules\nPreserve our public APIs.\n" },
    { path: "DESIGN.md", content: "# Custom palette\nKeep this local token override.\n" },
    { path: "CLAUDE.md", content: "# Existing instructions\r\n" },
    { path: ".cursor/rules/logic2b.mdc", content: "---\nalwaysApply: false\nglobs: client/**\n---\n\n# User instructions\n" },
    { path: ".github/copilot-instructions.md", content: "# Company instructions\nRespect our project conventions.\n" },
  ]
  const first = await buildAgentRulesPlan({ formats: [...AGENT_RULE_FORMATS], currentFiles: current })
  for (const original of current) assert.ok(pathOf(first, original.path).content.startsWith(original.content))
  const second = await buildAgentRulesPlan({ formats: [...AGENT_RULE_FORMATS], currentFiles: first.files.map(({ path, content }) => ({ path, content })) })
  assert.ok(second.files.every((file) => file.action === "unchanged"))
  assert.deepEqual(first.files.map((file) => file.content), second.files.map((file) => file.content))
  assert.equal(pathOf(second, "CLAUDE.md").content.match(/@AGENTS\.md/g)?.length, 1)
  const bomImport = "\ufeff@AGENTS.md\r\n"
  assert.equal(pathOf(await buildAgentRulesPlan({ formats: ["claude"], currentFiles: [{ path: "CLAUDE.md", content: bomImport }] }), "CLAUDE.md").content, bomImport)
  const example = "# Import example\n```md\n@AGENTS.md\n```\n"
  const withImport = await buildAgentRulesPlan({ formats: ["claude"], currentFiles: [{ path: "CLAUDE.md", content: example }] })
  assert.equal(pathOf(withImport, "CLAUDE.md").content, example + "@AGENTS.md\n")
  await assert.rejects(() => buildAgentRulesPlan({ formats: ["claude"], currentFiles: [{ path: "CLAUDE.md", content: "# Example\n```md\n@AGENTS.md\n" }] }), /unclosed code fence/)
})

test("SHA-256 preconditions match the native crypto oracle and reject stale/repeated missing writes", async () => {
  const original = "# Project instructions\nRéserver les copies.\n"
  assert.equal(await hashRuleContent(original), createHash("sha256").update(original).digest("hex"))
  const plan = await buildAgentRulesPlan({ currentFiles: [{ path: "AGENTS.md", content: original }] })
  const target = plan.files.find((file) => file.path === "AGENTS.md")!
  await validateRulePrecondition(original, target.precondition)
  await assert.rejects(() => validateRulePrecondition(original + "changed", target.precondition), /changed|planning/i)
  await assert.rejects(() => validateRulePrecondition(undefined, target.precondition), /changed|planning/i)
  await validateRulePrecondition(undefined, { kind: "missing" })
  await assert.rejects(() => validateRulePrecondition("appeared", { kind: "missing" }), /appeared|planning/i)
})

test("public inputs reject paths/injection/unknown versions/capacity before producing writes", async () => {
  for (const value of [null, [], { formats: [] }, { formats: ["agents", "agents"] }, { formats: ["other"] }, { stack: "svelte" }, { preset: "invalid" }, { currentFiles: [{ path: "../AGENTS.md", content: "private" }] }, { currentFiles: [{ path: ".logic2b/manifest.json", content: "private" }] }, { inventory: [{ name: "[injection](https://evil.example)", kind: "component" }] }, { registryVersion: "next" }, { currentFiles: [{ path: "AGENTS.md", content: "x".repeat(65537) }] }, { availableTools: ["review_ui", "review_ui"] }, { source: "private" }]) {
    assert.throws(() => validateAgentRulesOptions(value), /rule|format|stack|preset|inventory|version|tool|object|content/i)
  }
  const huge = Array.from({ length: 160 }, (_, index) => ({ name: `component-${index}-${"x".repeat(100)}`, kind: "component" as const }))
  await assert.rejects(() => buildAgentRulesPlan({ inventory: huge }), /6 KiB|budget/i)
  assert.deepEqual((await buildAgentRulesPlan({ formats: ["design"], inventory: huge })).files.map((file) => file.path), ["DESIGN.md"])
  for (const registryVersion of ["01.0.0", "1.0.0-01", "9007199254740992.0.0"]) assert.throws(() => validateAgentRulesOptions({ registryVersion }), /exact/)
  assert.throws(() => validateAgentRulesOptions({ currentFiles: [{ path: "AGENTS.md", content: "é".repeat(32769) }] }), /64 KiB/)
  assert.throws(() => validateAgentRulesOptions({ inventory: Array.from({ length: 161 }, (_, index) => ({ name: `item-${index}`, kind: "component" })) }), /160/)
  await assert.rejects(() => buildAgentRulesPlan({ preset, iconLibrary: "phosphor" }), /conflict/)
})
