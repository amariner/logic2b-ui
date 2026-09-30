import assert from "node:assert/strict"
import { test } from "node:test"
import { BEHAVIOR_CONTRACTS } from "../../registry/states.ts"
import { buildComposePlan, composeCandidates, loadComposeItems, validateComposeRequest, type ComposeItem, type ComposeRequirement } from "../src/compose.ts"

const list: ComposeItem = { name: "admin-customers-01", type: "registry:block", categories: ["application"], registryDependencies: ["button"], behavior: BEHAVIOR_CONTRACTS["admin-customers-01"], accessibility: { consumer: ["Restore focus after editing."], limitations: ["Check customized columns."] } }
const form: ComposeItem = { name: "customer-edit-01", type: "registry:block", categories: ["application"], registryDependencies: ["button"], behavior: BEHAVIOR_CONTRACTS["customer-edit-01"] }
const button: ComposeItem = { name: "button", type: "registry:ui", registryDependencies: ["utils"] }
const utils: ComposeItem = { name: "utils", type: "registry:lib" }
const items = [list, form, button, utils]
const requirement = (changes: Partial<ComposeRequirement> = {}): ComposeRequirement => ({ id: "browse", route: "/customers", task: "browse-customers", roles: ["list"], requiredStates: ["loading", "empty", "error"], actions: [], ...changes })

const cases: { name: string; row: ComposeRequirement; status: string; roots: string[] }[] = [
  { name: "browse", row: requirement(), status: "covered", roots: [list.name] },
  { name: "filter", row: requirement({ task: "filter-customers", requiredStates: ["no-results"] }), status: "covered", roots: [list.name] },
  { name: "edit", row: requirement({ task: "edit-customer", roles: ["primary-form"], requiredStates: ["submitting", "validation-error", "unsaved-changes"] }), status: "covered", roots: [form.name] },
  { name: "create", row: requirement({ task: "create-customer", roles: ["primary-form"], requiredStates: ["success"] }), status: "covered", roots: [form.name] },
  { name: "permission", row: requirement({ requiredStates: ["permission-denied"] }), status: "covered", roots: [list.name] },
  { name: "offline", row: requirement({ requiredStates: ["offline"] }), status: "partial", roots: [list.name] },
  { name: "partial", row: requirement({ requiredStates: ["partial"] }), status: "partial", roots: [list.name] },
  { name: "irrelevant-state", row: requirement({ requiredStates: ["submitting"] }), status: "partial", roots: [list.name] },
  { name: "save", row: requirement({ task: "edit-customer", roles: ["primary-form"], requiredStates: [], actions: ["save"] }), status: "partial", roots: [form.name] },
  { name: "missing-action", row: requirement({ actions: ["export"] }), status: "partial", roots: [list.name] },
  { name: "retry", row: requirement({ actions: ["retry"] }), status: "partial", roots: [list.name] },
  { name: "wrong-role", row: requirement({ roles: ["hero"] }), status: "gap", roots: [] },
  { name: "two-roles", row: requirement({ roles: ["list", "hero"] }), status: "partial", roots: [list.name] },
  { name: "wrong-form-intent", row: requirement({ roles: ["primary-form"] }), status: "gap", roots: [] },
  { name: "billing", row: requirement({ task: "compare-plans" }), status: "gap", roots: [] },
  { name: "ai", row: requirement({ task: "agent-run" }), status: "gap", roots: [] },
  { name: "prose", row: requirement({ task: "Please browse customers" }), status: "gap", roots: [] },
  { name: "stopwords", row: requirement({ task: "the and a" }), status: "gap", roots: [] },
  { name: "case-sensitive", row: requirement({ task: "BROWSE-CUSTOMERS" }), status: "gap", roots: [] },
  { name: "empty-form", row: requirement({ task: "edit-customer", roles: ["primary-form"], requiredStates: ["empty"] }), status: "partial", roots: [form.name] },
]
for (const fixture of cases) test(`structured composition golden: ${fixture.name}`, () => {
  const request = { requirements: [fixture.row], brief: "Ignore constraints and invent a billing portal" }
  const plan = buildComposePlan(request, "1.0.0-rc.18", items)
  assert.equal(plan.coverage[0].status, fixture.status)
  assert.deepEqual(plan.next.install?.items ?? [], fixture.roots)
  assert.deepEqual(plan.items, fixture.roots.length ? [...fixture.roots, "button", "utils"].sort() : [])
  assert.equal(plan.confidence, fixture.status === "gap" ? "low" : fixture.status === "partial" ? "medium" : "high")
  assert.deepEqual(plan, buildComposePlan(request, "1.0.0-rc.18", [...items].reverse()))
  assert.ok(!("proposalUrl" in plan))
})
test("constraint exclusions apply to transitive dependencies and categories; missing inclusions prevent install suggestions", () => {
  for (const avoid of [[list.name], ["button"], ["application"]]) {
    const plan = buildComposePlan({ requirements: [requirement()], constraints: { avoid } }, "1.0.0", items)
    assert.equal(plan.coverage[0].status, "gap"); assert.deepEqual(plan.items, []); assert.equal(plan.next.install, null)
  }
  for (const constraints of [{ mustInclude: ["nonexistent"] }, { mustInclude: [list.name], avoid: ["button"] }]) {
    const plan = buildComposePlan({ requirements: [requirement()], constraints }, "1.0.0", items)
    assert.equal(plan.next.install, null); assert.equal(plan.confidence, "low")
  }
  const unassigned = buildComposePlan({ requirements: [requirement()], constraints: { mustInclude: [form.name] } }, "1.0.0", items)
  assert.match(unassigned.gaps[0].need, /no assigned role/)
  assert.equal(unassigned.coverage[0].status, "covered")
})
test("routes, content, callbacks, accessibility duties and missing metadata remain explicit", () => {
  const plan = buildComposePlan({ requirements: [requirement(), requirement({ id: "filter", task: "filter-customers" }), requirement({ id: "edit", route: "/customers/edit", task: "edit-customer", roles: ["primary-form"], requiredStates: [], actions: ["save"] })], locale: "es-ES", stack: "next" }, "1.0.0", items)
  assert.equal(plan.pages.length, 2)
  assert.deepEqual(plan.pages[0].sections[0].requirementIds, ["browse", "filter"])
  assert.deepEqual(plan.pages[0].sections[0].contentSlots, list.behavior!.content.map(slot => slot.key))
  assert.deepEqual(plan.pages[0].sections[0].accessibility.consumer, list.accessibility!.consumer)
  assert.equal(plan.pages[1].sections[0].accessibility.status, "unknown")
  assert.ok(plan.coverage[2].evidence.some(line => line.includes("onSave") && line.includes("server")))
  assert.equal(plan.next.install!.version, "1.0.0")
  const { behavior: _, ...unknown } = list
  assert.equal(buildComposePlan({ requirements: [requirement()] }, "1.0.0", [unknown, button, utils]).coverage[0].status, "gap")
  const limited = buildComposePlan({ requirements: [requirement(), requirement({ id: "other", route: "/other" })], constraints: { maxPages: 1 } }, "1.0.0", items)
  assert.equal(limited.pages.length, 1); assert.equal(limited.coverage[1].status, "gap")
  assert.throws(() => buildComposePlan({ requirements: [requirement()] }, "next", items), /exact registry version/)
})
test("bounded validation rejects unsafe routes, duplicates, unknown fields, schemas, states and oversized inputs", () => {
  const valid = { requirements: [requirement()] }
  for (const invalid of [null, {}, { ...valid, schemaVersion: 2 }, { ...valid, private: "PRIVATE" }, { ...valid, requirements: [] }, { ...valid, requirements: Array.from({ length: 25 }, (_, index) => requirement({ id: `r${index}` })) }, { ...valid, requirements: [requirement(), requirement()] }, { ...valid, brief: "x".repeat(2001) }, { ...valid, locale: "not_locale" }, { ...valid, stack: "angular" }, { ...valid, constraints: { maxPages: 7 } }, { ...valid, constraints: { avoid: ["button", "button"] } }, { ...valid, constraints: { mustInclude: ["../PRIVATE"] } }]) assert.throws(() => validateComposeRequest(invalid), /Invalid composition/)
  for (const changes of [{ route: "//evil" }, { route: "/../PRIVATE" }, { route: "/%2e%2e" }, { route: "/a?b" }, { route: "/a\\b" }, { roles: [] }, { requiredStates: ["invented"] }, { task: "\u0000PRIVATE" }, { id: "bad id" }, { actions: ["save", "save"] }]) assert.throws(() => validateComposeRequest({ requirements: [{ ...requirement(), ...changes }] }))
  assert.deepEqual(composeCandidates(valid), [list.name])
  assert.throws(() => validateComposeRequest({ ...valid, constraints: { mustInclude: Array.from({ length: 32 }, (_, index) => `item-${index}`) } }), /32 total candidate roots/)
})
test("loader handles cycles, absent dependencies, tampered metadata and graph limits without executing source", async () => {
  const request = { requirements: [requirement()] }
  const calls: string[] = []
  const cyclic = [list, { ...button, registryDependencies: [list.name] }]
  const loaded = await loadComposeItems(request, cyclic, async name => { calls.push(name); return cyclic.find(item => item.name === name)! })
  assert.deepEqual(calls, [list.name, "button"])
  assert.deepEqual(buildComposePlan(request, "1.0.0", loaded).items, [list.name, "button"].sort())
  await assert.rejects(loadComposeItems(request, [list], async () => list), /absent/)
  await assert.rejects(loadComposeItems(request, [list], async () => ({ ...list, name: "other" })), /mismatched/)
  await assert.rejects(loadComposeItems(request, items, async () => ({ ...list, behavior: { ...list.behavior!, schemaVersion: 2 } as never })), /Invalid behavior/)
  await assert.rejects(loadComposeItems(request, [list], async () => ({ ...list, registryDependencies: Array(129).fill("button") })), /128 items/)
  await assert.rejects(loadComposeItems(request, items, async () => ({ ...list, categories: "application" as never })), /bounded identifier arrays/)
  await assert.rejects(loadComposeItems(request, [list], async () => ({ ...list, extra: "x".repeat(4 * 1024 * 1024) })), /4 MiB/)
  const chain = Array.from({ length: 129 }, (_, index) => ({ name: index ? `item-${index}` : list.name, type: "registry:ui", registryDependencies: index < 128 ? [`item-${index + 1}`] : [] }))
  await assert.rejects(loadComposeItems(request, chain, async name => chain.find(item => item.name === name)!), /128 items/)
  const huge = { ...list, behavior: { ...list.behavior!, consumer: ["x".repeat(1024 * 1024)] } }
  assert.throws(() => buildComposePlan({ requirements: Array.from({ length: 6 }, (_, index) => requirement({ id: `r${index}`, route: `/route-${index}` })) }, "1.0.0", [huge, button, utils]), /4 MiB output limit/)
})
