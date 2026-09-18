import type { VerificationCheck, VerificationSelector as Selector, VerificationStep as Step, VerificationSuiteV1 } from "@logic2b/scaffold/verification"
import { consumerSuite } from "../consumer-verification/suite.ts"

export type CustomerJourneyStage = "customized" | "changed" | "updated"

const role = (role: string, name?: string): Selector => ({ by: "role", role, ...(name === undefined ? {} : { name }) })
const text = (value: string): Selector => ({ by: "text", value })
const label = (value: string): Selector => ({ by: "label", value })
const check = (id: string, assertion: VerificationCheck["assertion"], rest: Record<string, unknown> = {}): Step => ({ type: "check", id, assertion, ...rest }) as Step
const action = (action: "click" | "fill" | "select", target: Selector, value?: string): Step => ({ type: "action", action, target, ...(value === undefined ? {} : { value }) }) as Step

// Literal consumer expectations, independent of component source, change plans,
// host records and registry behavior metadata. Mobile summaries and hidden cells
// both belong to row text; the runner separately measures responsive visibility.
const header = "CustomerAccount ownerOrdersSpentLast orderSegmentActions"
const zoe = "Zoe Chenzoe@example.testOrders: 8 · Spent: $80Account owner: Lin ParkLin Park8$802026-08-08ActiveEdit"
const alex = "Alex Morganalex@example.testOrders: 8 · Spent: $40Account owner: Zara RuizZara Ruiz8$402026-08-07NewEdit"
const mina = "Mina Patelmina@example.testOrders: 2 · Spent: $20Account owner: Noah ReedNoah Reed2$202026-08-06ChurnedEdit"
const ada = "Ada Lovelaceada@example.testOrders: 0 · Spent: $0Account owner: Avery StoneAvery Stone0$0—NewEdit"
const editedZoe = "Zoe Chen — Customer relations manager for international partner organizationszoe@example.testOrders: 8 · Spent: $80Account owner: Lin ParkLin Park8$802026-08-08ActiveEdit"
const originalRows = new Map([
  ["CustomerOrdersSpentLast orderSegmentActions", header],
  ["Zoe Chenzoe@example.testOrders: 8 · Spent: $808$802026-08-08ActiveEdit", zoe],
  ["Alex Morganalex@example.testOrders: 8 · Spent: $408$402026-08-07NewEdit", alex],
  ["Mina Patelmina@example.testOrders: 2 · Spent: $202$202026-08-06ChurnedEdit", mina],
])
const row = role("row")
const search = role("textbox", "Search customers")
const segment = label("Customer segment")

/** Full customer behavior replay after local customization and each maintenance step. */
export function customerJourneySuite(stage: CustomerJourneyStage, projectFiles: string[], planId?: string): VerificationSuiteV1 {
  const suite = consumerSuite(projectFiles)
  if (planId !== undefined) suite.planId = planId
  // rc.17's increased-text defect is the actual upstream fix being exercised.
  // Do not assert its correction until the rc.18 update has been installed.
  if (stage !== "updated") suite.scenarios = suite.scenarios.filter(scenario => scenario.id !== "translated-large-text")
  for (const scenario of suite.scenarios) {
    scenario.steps = scenario.steps.map(step => {
      if (step.type !== "check") return step
      if (step.id === "populated-heading") return check(step.id, "visible", { target: role("heading", "Customer workspace") })
      if (step.assertion === "order") return { ...step, expected: step.expected.map(value => originalRows.get(value) ?? value) }
      if (step.id === "new-customer-visible") return check("created-customer-keeps-owner", "order", { target: row, expected: [header, ada] })
      if (step.id === "saved-name-in-table") return check("edited-customer-keeps-owner", "order", { target: row, expected: [header, editedZoe, alex, mina] })
      return step
    })
  }
  suite.scenarios.push({ id: "read-only", route: "/customers?state=read-only", steps: [
    check("read-only-announced", "visible", { target: text("Customer details are read-only.") }),
    check("read-only-prevents-create", "disabled", { target: role("button", "Add customer") }),
    check("read-only-prevents-edit", "disabled", { target: role("button", "Edit Zoe Chen") }),
    check("read-only-axe", "axe"),
  ] })
  if (stage !== "customized") suite.scenarios.push({ id: "segment-preserves-search-and-sort", route: "/customers", steps: [
    check("segment-default", "value", { target: segment, expected: "all" }),
    action("select", segment, "active"), check("active-customers", "order", { target: row, expected: [header, zoe] }),
    action("select", segment, "new"), check("new-customers", "order", { target: row, expected: [header, alex] }),
    action("select", segment, "churned"), check("churned-customers", "order", { target: row, expected: [header, mina] }),
    action("select", segment, "all"), action("select", label("Sort customers"), "orders"), action("fill", search, "alex"),
    action("select", segment, "active"), check("combined-filter-no-match", "visible", { target: text("No matching customers") }),
    check("segment-keeps-query", "value", { target: search, expected: "alex" }),
    action("select", segment, "new"), check("combined-filter-matches", "order", { target: row, expected: [header, alex] }),
    action("fill", search, "no-match-fixture"), action("click", role("button", "Clear search")),
    check("clear-query-keeps-segment", "order", { target: row, expected: [header, alex] }),
    action("select", segment, "all"), check("segment-reset-keeps-stable-sort", "order", { target: row, expected: [header, mina, zoe, alex] }),
    check("segment-axe", "axe"),
  ] })
  return suite
}
