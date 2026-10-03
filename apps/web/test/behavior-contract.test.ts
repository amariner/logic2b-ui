import assert from "node:assert/strict"
import test from "node:test"
import { BEHAVIOR_CONTRACTS } from "@logic2b/registry/behavior"
import { CLI_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"
import { DEFAULT_CONFIG } from "@logic2b/tokens"
import { buildAddPrompt, behaviorPromptSections } from "../src/lib/prompts.ts"
import { buildAgentsMd } from "../src/lib/agents-md.ts"

test("customer prompts carry the shared contract's applicable states and integration duties", () => {
  assert.deepEqual(Object.keys(BEHAVIOR_CONTRACTS).sort(), ["admin-customers-01", "customer-edit-01"])
  for (const [name, behavior] of Object.entries(BEHAVIOR_CONTRACTS)) {
    const prompt = buildAddPrompt(name, "astro")
    const contractSection = behaviorPromptSections(name)
    assert.ok(prompt.includes(`npx ${CLI_PACKAGE_SELECTOR} add ${name}`))
    assert.ok(prompt.includes("client:load"), "framework installation notes remain present")
    assert.ok(contractSection.includes(`schema version ${behavior.schemaVersion}`))
    for (const [state, contract] of Object.entries(behavior.states)) {
      if (contract.support === "not-applicable") {
        assert.ok(!contractSection.includes(`- \`${state}\``), `${name}: inapplicable ${state} is not an integration requirement`)
      } else {
        assert.ok(contractSection.includes(`- \`${state}\` (${contract.support}): ${contract.how}`))
      }
    }
    for (const duty of [...behavior.consumer, ...behavior.actions.flatMap((action) => action.consumer)]) {
      assert.ok(contractSection.includes(duty), `${name}: missing consumer duty ${duty}`)
    }
    for (const slot of behavior.content) assert.ok(contractSection.includes(`\`${slot.path}\``))
    assert.doesNotMatch(prompt, /review_ui|compose_plan|verify_ui/)
  }
})

test("uncovered catalog items do not imply a behavior contract", () => {
  for (const name of ["button", "login-01", "dashboard-01", "unknown"]) {
    assert.equal(behaviorPromptSections(name), "")
    assert.doesNotMatch(buildAddPrompt(name), /behavior contract|Consumer responsibilities/)
  }
})

test("generated agent rules identify covered blocks and their consumer-owned behavior", () => {
  const rules = buildAgentsMd(DEFAULT_CONFIG)
  for (const [name, behavior] of Object.entries(BEHAVIOR_CONTRACTS)) {
    assert.ok(rules.includes(`### \`${name}\``))
    for (const [state, contract] of Object.entries(behavior.states)) {
      if (contract.support === "consumer") {
        assert.ok(rules.includes(`Consumer state \`${state}\`: ${contract.how}`))
      }
    }
    for (const duty of [...behavior.consumer, ...behavior.actions.flatMap((action) => action.consumer)]) {
      assert.ok(rules.includes(duty))
    }
  }
  assert.ok(rules.includes("Only these blocks have this declared state coverage."))
  assert.ok(rules.includes("preserve controlled inputs and local content customizations"))
  assert.doesNotMatch(rules, /review_ui|compose_plan|verify_ui/)
})
