import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { createElement as h, Fragment, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { reviewUi, type ReviewRule } from "@logic2b/review"

interface NameFixture {
  title: string
  source: string
  markup: ReactElement
  role: "button" | "textbox" | "dialog"
  accessibleName: string
  defects: ReviewRule[]
  axeViolations: string[]
  unresolved?: boolean
}

// Each inert source string is paired by hand with trusted React markup. Never
// transpile, import or evaluate a reviewed source string to construct the page.
// This is an independent naming oracle for these fixtures, not an accessibility
// certificate or coverage of focus, keyboard behavior, contrast or every rule.
const fixtures: NameFixture[] = [
  {
    title: "a case-insensitive submit type retains its native default name",
    source: 'const App = () => <input type="SUBMIT" />',
    markup: h("input", { type: "SUBMIT" }),
    role: "button", accessibleName: "Submit", defects: [], axeViolations: [],
  },
  {
    title: "a descendant tooltip can contribute the button name",
    source: 'const App = () => <button><span title="Save customer" /></button>',
    markup: h("button", null, h("span", { title: "Save customer" })),
    role: "button", accessibleName: "Save customer", defects: [], axeViolations: [],
  },
  {
    title: "a placeholder supplies a browser name without proving a durable label",
    source: 'const App = () => <input placeholder="Customer email" />',
    markup: h("input", { placeholder: "Customer email" }),
    role: "textbox", accessibleName: "Customer email", defects: [], axeViolations: [],
  },
  {
    title: "a surrounding native label names a button",
    source: 'const App = () => <label>Save customer<button /></label>',
    markup: h("label", null, "Save customer", h("button")),
    role: "button", accessibleName: "Save customer", defects: [], axeViolations: [],
  },
  {
    title: "an associated native label names an empty button",
    source: 'const App = () => <><label htmlFor="save">Save customer</label><button id="save" /></>',
    markup: h(Fragment, null, h("label", { htmlFor: "save" }, "Save customer"), h("button", { id: "save" })),
    role: "button", accessibleName: "Save customer", defects: [], axeViolations: [],
  },
  {
    title: "an empty native button has a demonstrated missing name",
    source: "const App = () => <button />",
    markup: h("button"),
    role: "button", accessibleName: "", defects: ["L2B-A11Y-003"], axeViolations: ["button-name"],
  },
  {
    title: "aria-label names an empty native button",
    source: 'const App = () => <button aria-label="Save customer" />',
    markup: h("button", { "aria-label": "Save customer" }),
    role: "button", accessibleName: "Save customer", defects: [], axeViolations: [],
  },
  {
    title: "a referenced title names an open dialog",
    source: 'const App = () => <dialog open role="dialog" aria-labelledby="title"><h2 id="title">Edit customer</h2></dialog>',
    markup: h("dialog", { open: true, role: "dialog", "aria-labelledby": "title" }, h("h2", { id: "title" }, "Edit customer")),
    role: "dialog", accessibleName: "Edit customer", defects: [], axeViolations: [],
  },
  {
    title: "a React children prop renders a valid button name",
    source: 'const App = () => <button children="Save customer" />',
    markup: h("button", { children: "Save customer" }),
    role: "button", accessibleName: "Save customer", defects: [], axeViolations: [],
  },
  {
    title: "a custom component stays unknown despite a valid rendered example",
    source: "const App = () => <NamedAction />",
    // One possible implementation; the reviewer cannot infer it from the source.
    markup: h("button", { "aria-label": "Save customer" }),
    role: "button", accessibleName: "Save customer", defects: [], axeViolations: [], unresolved: true,
  },
  {
    title: "an empty native input has a demonstrated missing name",
    source: "const App = () => <input />",
    markup: h("input"),
    role: "textbox", accessibleName: "", defects: ["L2B-A11Y-002"], axeViolations: ["label"],
  },
  {
    title: "an open dialog needs an explicitly associated name",
    source: 'const App = () => <dialog open role="dialog"><h2>Edit customer</h2></dialog>',
    markup: h("dialog", { open: true, role: "dialog" }, h("h2", null, "Edit customer")),
    role: "dialog", accessibleName: "", defects: ["L2B-A11Y-001"], axeViolations: ["aria-dialog-name"],
  },
]

for (const fixture of fixtures) {
  test(`static review browser oracle: ${fixture.title}`, async ({ page }) => {
    await page.setContent(`<!doctype html><html lang="en"><head><title>Naming fixture</title></head><body><main>${renderToStaticMarkup(fixture.markup)}</main></body></html>`)
    const control = page.getByRole(fixture.role)
    await expect(control).toHaveCount(1)
    await expect(control).toBeVisible()
    await expect(control).toHaveAccessibleName(fixture.accessibleName)
    const audit = await new AxeBuilder({ page }).withRules(["button-name", "input-button-name", "label", "aria-dialog-name"]).analyze()
    expect(audit.violations.map(violation => violation.id).sort()).toEqual([...fixture.axeViolations].sort())
    expect(audit.incomplete).toEqual([])

    const result = reviewUi({ schemaVersion: 1, files: [{ path: "fixture.tsx", content: fixture.source }] })
    expect(result.findings.filter(finding => finding.category === "defect").map(finding => finding.rule).sort()).toEqual([...fixture.defects].sort())
    expect(result.summary.errors).toBe(fixture.defects.length)
    if (fixture.unresolved) expect(result.unknowns.length).toBeGreaterThan(0)
  })
}

for (const fixture of [
  { title: "template descendants are inert", source: "const App = () => <template><button /></template>", markup: h("template", null, h("button")) },
  { title: "a native data attribute does not render a JSX element prop", source: "const App = () => <div data-template={<button />} />", markup: h("div", { "data-template": h("button") }) },
]) {
  test(`static review browser oracle: ${fixture.title}`, async ({ page }) => {
    await page.setContent(`<!doctype html><html lang="en"><head><title>Inert fixture</title></head><body><main>${renderToStaticMarkup(fixture.markup)}</main></body></html>`)
    await expect(page.getByRole("button")).toHaveCount(0)
    const audit = await new AxeBuilder({ page }).withRules(["button-name"]).analyze()
    expect(audit.violations).toEqual([])
    const result = reviewUi({ schemaVersion: 1, files: [{ path: "fixture.tsx", content: fixture.source }] })
    expect(result.summary.errors).toBe(0)
  })
}
