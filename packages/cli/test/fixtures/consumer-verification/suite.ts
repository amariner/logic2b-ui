import type { VerificationCheck, VerificationSelector as Selector, VerificationStep as Step, VerificationSuiteV1 } from "@logic2b/scaffold/verification"

const role = (role: string, name?: string): Selector => ({ by: "role", role, ...(name === undefined ? {} : { name }) })
const text = (value: string): Selector => ({ by: "text", value })
const label = (value: string): Selector => ({ by: "label", value })
const check = (id: string, assertion: VerificationCheck["assertion"], rest: Record<string, unknown> = {}): Step => ({ type: "check", id, assertion, ...rest }) as Step
const see = (id: string, target: Selector): Step => check(id, "visible", { target })
const action = (action: "click" | "fill" | "select" | "press", target: Selector, value?: string): Step => ({ type: "action", action, target, ...(value === undefined ? {} : { value }) }) as Step
const click = (target: Selector): Step => action("click", target)
const fill = (target: Selector, value: string): Step => action("fill", target, value)
const press = (target: Selector, value = "Enter"): Step => action("press", target, value)
const selected = (target: Selector, value: string): Step => action("select", target, value)
const evidence = (prefix: string): Step[] => [check(`${prefix}-axe`, "axe"), check(`${prefix}-overflow`, "overflow"), check(`${prefix}-screenshot`, "screenshot")]
const search = role("textbox", "Search customers")
const name = role("textbox", "Full name")
const email = role("textbox", "Email address")
const save = role("button", "Save customer")
const cancel = role("button", "Cancel")
const form = role("form", "Customer details")
const row = role("row")

// Literal oracle deliberately independent of the installed implementation and host data.
// DOM text includes the narrow-screen summary as well as CSS-hidden table cells.
const header = "CustomerOrdersSpentLast orderSegmentActions"
const zoe = "Zoe Chenzoe@example.testOrders: 8 · Spent: $808$802026-08-08ActiveEdit"
const alex = "Alex Morganalex@example.testOrders: 8 · Spent: $408$402026-08-07NewEdit"
const mina = "Mina Patelmina@example.testOrders: 2 · Spent: $202$202026-08-06ChurnedEdit"
const longDraft = "Zoe Chen — Customer relations manager for international partner organizations"
const longSpanish = "Alejandra Fernández de la Vega — Responsable de relaciones internacionales y atención a clientes"

export function consumerSuite(projectFiles: string[]): VerificationSuiteV1 {
  return {
    schemaVersion: 1,
    projectFiles,
    viewports: [{ id: "mobile", width: 390, height: 900 }, { id: "desktop", width: 1280, height: 900 }],
    scenarios: [
      { id: "filter-and-stable-sort", route: "/customers", steps: [
        see("populated-heading", role("heading", "Customers")),
        check("original-row-order", "order", { target: row, expected: [header, zoe, alex, mina] }),
        check("results-announced", "attribute", { target: text("Showing 3 of 3"), name: "role", expected: "status" }),
        fill(search, "alex"), check("filter-changes-rows", "order", { target: row, expected: [header, alex] }),
        see("filtered-count", text("Showing 1 of 3")), fill(search, "no-match-fixture"),
        see("no-match", text("No matching customers")), check("no-match-is-not-empty", "hidden", { target: role("heading", "No customers yet") }),
        ...evidence("no-match"), click(role("button", "Clear search")),
        check("clear-restores-rows", "order", { target: row, expected: [header, zoe, alex, mina] }),
        selected(label("Sort customers"), "orders"),
        check("stable-equal-order-keys", "order", { target: row, expected: [header, mina, zoe, alex] }),
        check("sort-announced", "attribute", { target: text("Sorted by order count, ascending."), name: "role", expected: "status" }),
        fill(search, "alex"), fill(search, ""),
        check("filter-preserves-sort", "order", { target: row, expected: [header, mina, zoe, alex] }),
        selected(label("Sort customers"), "name"),
        check("name-sort", "order", { target: row, expected: [header, alex, mina, zoe] }),
        ...evidence("populated"),
      ] },
      { id: "empty-and-create", route: "/customers?state=empty", steps: [
        see("empty-guidance", role("heading", "No customers yet")), check("empty-has-no-rows", "count", { target: row, expected: 0 }),
        ...evidence("empty"), press(role("button", "Add customer")), check("create-name-focus", "focused", { target: name }),
        fill(name, "Ada Lovelace"), fill(email, "ada@example.test"), click(save),
        check("create-pending", "attribute", { target: form, name: "aria-busy", expected: "true" }),
        see("create-succeeded", text("Customer saved.")), check("created-row", "count", { target: row, expected: 2 }),
        see("new-customer-visible", text("Ada Lovelace")), ...evidence("saved"), press(cancel),
        check("create-closed", "hidden", { target: form }), check("create-focus-restored", "focused", { target: role("button", "Add customer") }),
      ] },
      { id: "loading", route: "/customers?state=loading", steps: [
        see("loading-announced", text("Loading customers…")), check("loading-search-disabled", "disabled", { target: search }),
        check("loading-create-disabled", "disabled", { target: role("button", "Add customer") }), check("loading-no-rows", "count", { target: row, expected: 0 }),
        ...evidence("loading"),
      ] },
      { id: "load-error-and-retry", route: "/customers?state=error", steps: [
        see("load-failed", role("alert")), check("error-search-disabled", "disabled", { target: search }), ...evidence("load-error"),
        click(role("button", "Try again")), see("retry-loading", text("Loading customers…")),
        check("retry-restores-data", "count", { target: row, expected: 4 }), fill(search, "alex"), selected(label("List state"), "error"),
        check("error-retains-query", "value", { target: search, expected: "alex" }), click(role("button", "Try again")),
        check("retry-retains-filtered-data", "order", { target: row, expected: [header, alex] }),
      ] },
      { id: "edit-errors-and-keyboard", route: "/customers", steps: [
        press(role("button", "Edit Zoe Chen")), check("edit-open-focus", "focused", { target: name }),
        press(name, "Tab"), check("keyboard-reaches-email", "focused", { target: email }),
        press(email, "Shift+Tab"), check("keyboard-returns-to-name", "focused", { target: name }),
        fill(name, ""), click(save), check("name-invalid", "attribute", { target: name, name: "aria-invalid", expected: "true" }),
        check("name-error-linked", "accessible-description", { target: name, expected: "Enter a name." }), check("name-error-focus", "focused", { target: name }),
        fill(name, longDraft), fill(email, "invalid"), click(save),
        check("email-error-linked", "accessible-description", { target: email, expected: "Enter a valid email address." }), check("email-error-focus", "focused", { target: email }),
        ...evidence("validation"), fill(email, "zoe@example.test"), selected(label("Next save"), "error"), press(save),
        check("saving-locks-input", "disabled", { target: name }), check("saving-locks-cancel", "disabled", { target: cancel }),
        see("failed-save-announced", text("The customer could not be saved. Your changes are still here. Try again.")),
        check("failure-keeps-draft", "value", { target: name, expected: longDraft }), check("failure-can-retry", "enabled", { target: save }),
        ...evidence("save-error"), press(save), see("edit-succeeded", text("Customer saved.")), see("saved-name-in-table", text(longDraft)),
        fill(name, "Unsaved replacement"), press(cancel), check("discard-choice-focus", "focused", { target: role("button", "Keep editing") }),
        press(role("button", "Keep editing")), check("keep-editing-focus", "focused", { target: cancel }),
        check("keep-editing-preserves-draft", "value", { target: name, expected: "Unsaved replacement" }),
        press(cancel), press(role("button", "Discard changes")), check("discard-closes-form", "hidden", { target: form }),
        check("edit-opener-focus-restored", "focused", { target: role("button", `Edit ${longDraft}`) }),
      ] },
      { id: "save-permission-denied", route: "/customers", steps: [
        click(role("button", "Edit Zoe Chen")), fill(name, "Unauthorized replacement"), selected(label("Next save"), "permission-denied"), click(save),
        see("save-denial-announced", text("You do not have permission to save this customer.")),
        check("denial-preserves-draft", "value", { target: name, expected: "Unauthorized replacement" }),
        check("denial-disables-input", "disabled", { target: name }), check("denial-disables-save", "disabled", { target: save }),
        check("denial-does-not-change-rows", "order", { target: row, expected: [header, zoe, alex, mina] }), ...evidence("save-denied"),
      ] },
      { id: "list-permission-denied", route: "/customers?state=permission-denied", steps: [
        see("list-denial-announced", text("You do not have permission to manage customers.")), check("denial-hides-data", "count", { target: row, expected: 0 }),
        check("denial-prevents-create", "disabled", { target: role("button", "Add customer") }), ...evidence("list-denied"),
      ] },
      { id: "translated-large-text", route: "/customers?locale=es&long=true&theme=dark", steps: [
        see("translated-title", role("heading", "Clientes")), { type: "action", action: "text-scale", value: 200 },
        see("long-name-visible", text(longSpanish)), check("translated-label", "enabled", { target: role("textbox", "Buscar clientes") }),
        press(role("region", "Todos los clientes"), "ArrowRight"), check("table-scroll-keyboard-focus", "focused", { target: role("region", "Todos los clientes") }),
        press(role("region", "Todos los clientes"), "ArrowLeft"),
        ...evidence("large-list"), press(role("button", `Editar ${longSpanish}`)),
        check("translated-edit-focus", "focused", { target: role("textbox", "Nombre completo") }),
        check("long-name-retained", "value", { target: role("textbox", "Nombre completo"), expected: longSpanish }), ...evidence("large-edit"),
      ] },
      { id: "form-loading", route: "/customers?state=form-loading", steps: [
        see("form-loading-announced", text("Loading customer…")), check("form-loading-busy", "attribute", { target: form, name: "aria-busy", expected: "true" }),
        check("form-loading-input-disabled", "disabled", { target: name }), ...evidence("form-loading"),
      ] },
      { id: "form-submitting", route: "/customers?state=form-submitting", steps: [
        check("form-submitting-busy", "attribute", { target: form, name: "aria-busy", expected: "true" }), check("form-submitting-input-disabled", "disabled", { target: name }),
        check("form-submitting-cancel-disabled", "disabled", { target: cancel }), check("form-submitting-save-disabled", "disabled", { target: role("button", "Saving customer…") }),
        ...evidence("form-submitting"),
      ] },
    ],
  }
}
