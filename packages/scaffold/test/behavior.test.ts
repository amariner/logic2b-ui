import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { BEHAVIOR_STATES, validateBehavior, type RegistryBehavior } from "../src/behavior.ts"

function fixture(): RegistryBehavior {
  return {
    schemaVersion: 1,
    states: Object.fromEntries(BEHAVIOR_STATES.map((name) => [name, {
      support: name === "idle" ? "built-in" : "not-applicable",
      how: name === "idle" ? "Supply controlled values." : "This state does not apply.",
    }])) as RegistryBehavior["states"],
    content: [{ key: "title", type: "text", path: "content.title", sample: "Customers" }],
    actions: [{ name: "save", props: ["onSubmit"], consumer: ["Persist and authorize the submitted value."] }],
    intents: ["edit-customer"],
    journey: { after: ["admin-customers-01"] },
    responsive: { viewports: ["mobile", "desktop"], strategy: "Single column with wrapping messages.", touchTargets: "44px" },
    consumer: ["Preserve the draft on request failure."],
  }
}

describe("bounded behavior contract", () => {
  test("accepts honest coverage, controlled actions, nested copy and recovery evidence", () => {
    const behavior = fixture()
    behavior.states.error = { support: "built-in", how: "Supply status=error and onRetry.", transitions: ["loading", "success"], preserves: ["query"] }
    behavior.states.offline = { support: "consumer", how: "Detect connectivity in the application." }
    behavior.content.push({ key: "errors.retry", type: "text", path: "content.errors.retry", sample: "Try again", maxLength: 24, guidance: "Name the recovery action." })
    assert.equal(validateBehavior(behavior), behavior)
  })

  test("rejects unsupported versions and incomplete state matrices", () => {
    assert.throws(() => validateBehavior({ ...fixture(), schemaVersion: 2 }), /schema version|schemaVersion/)
    const missingState = fixture() as unknown as { states: Record<string, unknown> }
    delete missingState.states.offline
    assert.throws(() => validateBehavior(missingState), /states: required property/)
    assert.throws(() => validateBehavior({ ...fixture(), states: { ...fixture().states, pending: { support: "built-in", how: "Pending" } } }), /states: unsupported property/)
  })

  test("rejects invented support, transitions and intents", () => {
    const unsupported = fixture()
    assert.throws(() => validateBehavior({ ...unsupported, states: { ...unsupported.states, idle: { support: "slot", how: "Supply a slot." } } }), /idle.support/)
    assert.throws(() => validateBehavior({ ...unsupported, states: { ...unsupported.states, idle: { support: "built-in", how: "Edit.", transitions: ["imaginary"] } } }), /transitions\[0\]/)
    assert.throws(() => validateBehavior({ ...unsupported, intents: ["manage-everything"] }), /intents\[0\]/)
  })

  test("rejects missing consumer duties, blank evidence and unknown fields", () => {
    assert.throws(() => validateBehavior({ ...fixture(), consumer: [] }), /consumer: list count/)
    assert.throws(() => validateBehavior({ ...fixture(), actions: [{ name: "save", props: ["onSubmit"], consumer: [] }] }), /actions\[0\].consumer/)
    assert.throws(() => validateBehavior({ ...fixture(), consumer: [" \n "] }), /consumer\[0\]/)
    assert.throws(() => validateBehavior({ ...fixture(), telemetry: true }), /unsupported property/)
    const inherited = Object.create(fixture())
    assert.throws(() => validateBehavior(inherited), /required property/)
  })

  test("rejects unsafe copy paths and duplicate slot/action identities", () => {
    for (const path of ["../content.title", "content.title()", "content[title]", "content.__proto__.title"]) {
      assert.throws(() => validateBehavior({ ...fixture(), content: [{ key: "title", type: "text", path, sample: "Customers" }] }), /content\[0\].path/)
    }
    const repeatedKey = fixture()
    repeatedKey.content.push({ key: "title", type: "text", path: "content.heading", sample: "Heading" })
    assert.throws(() => validateBehavior(repeatedKey), /duplicate content key/)
    const repeatedPath = fixture()
    repeatedPath.content.push({ key: "heading", type: "text", path: "content.title", sample: "Heading" })
    assert.throws(() => validateBehavior(repeatedPath), /duplicate content path/)
    const repeatedAction = fixture()
    repeatedAction.actions.push({ name: "save", props: ["status"], consumer: ["Provide the save outcome."] })
    assert.throws(() => validateBehavior(repeatedAction), /duplicate action name/)
    assert.throws(() => validateBehavior({ ...fixture(), actions: [{ name: "save", props: ["onSubmit", "onSubmit"], consumer: ["Persist."] }] }), /duplicate list/)
  })

  test("enforces size/count limits before accepting a public contract", () => {
    assert.throws(() => validateBehavior({ ...fixture(), consumer: ["x".repeat(2049)] }), /oversized/)
    assert.throws(() => validateBehavior({ ...fixture(), consumer: Array.from({ length: 33 }, (_, i) => `Duty ${i}`) }), /list count/)
    assert.throws(() => validateBehavior({ ...fixture(), content: Array.from({ length: 65 }, (_, i) => ({ key: `copy${i}`, type: "text", path: `content.copy${i}`, sample: `Copy ${i}` })) }), /content: list count/)
    assert.throws(() => validateBehavior({ ...fixture(), responsive: { ...fixture().responsive, viewports: ["mobile", "mobile"] } }), /duplicate list/)
    for (const maxLength of [0, 10001, 1.5, NaN, Infinity]) {
      assert.throws(() => validateBehavior({ ...fixture(), content: [{ ...fixture().content[0], maxLength }] }), /integer is out of bounds/)
    }
    assert.throws(() => validateBehavior(null), /expected an object/)
    assert.throws(() => validateBehavior([]), /expected an object/)
  })
})
