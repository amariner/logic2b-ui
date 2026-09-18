import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { BEHAVIOR_CONTRACTS } from "../../../packages/registry/states"

for (const width of [390, 768, 1280]) {
  test(`customer journey recovers and preserves drafts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/blocks/preview/admin-customers-01")
    await page.locator('[data-preview-ready="admin-customers-01"]').waitFor()
    const search = page.getByRole("textbox", { name: "Search customers" })
    await search.fill("missing")
    await expect(page.getByText("No matching customers", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Clear search" }).click()
    await search.fill("olivia")
    await page.getByLabel("List preview").selectOption("error")
    await page.getByRole("button", { name: "Try again" }).click()
    await expect(search).toHaveValue("olivia")
    const edit = page.getByRole("button", { name: "Edit Olivia Martin", exact: true })
    await edit.focus(); await page.keyboard.press("Enter")
    const name = page.getByRole("textbox", { name: "Full name" })
    await expect(name).toBeFocused()
    await name.fill("")
    await page.getByRole("button", { name: "Save customer", exact: true }).click()
    await expect(name).toHaveAttribute("aria-invalid", "true")
    await expect(name).toBeFocused()
    await name.fill("Olivia Martin Ruiz — Customer with a deliberately long display name")
    await page.getByRole("textbox", { name: "Email address" }).fill("broken")
    await page.getByRole("button", { name: "Save customer", exact: true }).click()
    await expect(page.getByRole("textbox", { name: "Email address" })).toBeFocused()
    await page.getByRole("textbox", { name: "Email address" }).fill("olivia@example.com")
    await page.getByLabel("Next save").selectOption("error")
    await page.getByRole("button", { name: "Save customer", exact: true }).click()
    await expect(name).toBeDisabled()
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled()
    await expect(page.getByRole("alert")).toContainText("Your changes are still here")
    await expect(name).toHaveValue(/deliberately long/)
    await page.getByRole("button", { name: "Save customer", exact: true }).click()
    await expect(page.getByText("Customer saved.", { exact: true })).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: "Olivia Martin Ruiz" })).toHaveCount(1)
    await name.fill("Unsaved replacement")
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(page.getByRole("button", { name: "Keep editing" })).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused()
    await expect(name).toHaveValue("Unsaved replacement")
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
    await page.getByRole("button", { name: "Discard changes", exact: true }).click()
    await expect(page.getByRole("form")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /Edit Olivia Martin Ruiz/ })).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test("empty list creates a customer and permission denial does not save", async ({ page }) => {
  await page.goto("/blocks/preview/admin-customers-01?state=empty")
  await expect(page.getByText("No customers yet", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Add customer" }).click()
  await page.getByRole("textbox", { name: "Full name" }).fill("Ada Lovelace")
  await page.getByRole("textbox", { name: "Email address" }).fill("ada@example.com")
  await page.getByRole("button", { name: "Save customer", exact: true }).click()
  await expect(page.getByText("Customer saved.", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await page.getByRole("button", { name: "Edit Ada Lovelace" }).click()
  await page.getByRole("textbox", { name: "Full name" }).fill("Denied change")
  await page.getByLabel("Next save").selectOption("permission-denied")
  await page.getByRole("button", { name: "Save customer", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("do not have permission")
  await expect(page.getByRole("textbox", { name: "Full name" })).toBeDisabled()
  await expect(page.getByRole("row").filter({ hasText: "Ada Lovelace" })).toHaveCount(1)
  await expect(page.getByRole("row").filter({ hasText: "Denied change" })).toHaveCount(0)
})

test("state tabs are keyboard navigable and expose consumer duties", async ({ page }) => {
  await page.goto("/blocks/application/customer-edit-01")
  await page.getByRole("tab", { name: "Preview", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("tab", { name: "States", exact: true })).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("heading", { name: "Consumer responsibilities" })).toBeVisible()
  await expect(page.getByRole("tabpanel")).toContainText("Set submitting synchronously")
  await expect(page.getByRole("tabpanel")).toContainText("content.discard")
  await page.getByRole("tab", { name: "States", exact: true }).focus()
  await page.keyboard.press("Home")
  await expect(page.getByRole("tab", { name: "Preview", exact: true })).toHaveAttribute("aria-selected", "true")
})

for (const [block, contract] of Object.entries(BEHAVIOR_CONTRACTS)) {
  for (const [state, definition] of Object.entries(contract.states)) {
    if (definition.support !== "built-in") continue
    for (const mode of ["light", "dark"]) {
      test(`${block} ${state} ${mode} state evidence`, async ({ page }) => {
        // At 390px one populated-table summary is within 0.55px of wrapping;
        // host font metrics can legitimately change its height by one line.
        // Give these two visual captures room while the functional journey and
        // generated-consumer suites continue exercising the actual 390px layout.
        const width = block === "admin-customers-01" && state === "success" ? 414 : 390
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`/blocks/preview/${block}?state=${state}`)
        await expect(page.locator(`[data-preview-ready="${block}"]`)).toHaveAttribute("data-preview-state", state)
        // Wait for query-controlled demos to remount after hydration.
        await expect(page.locator("input").first()).toBeAttached()
        await page.evaluate(async mode => { document.documentElement.classList.toggle("dark", mode === "dark"); await document.fonts.ready }, mode)
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).disableRules(["color-contrast"]).analyze()
        expect(violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        // The dense populated table exceeds the shared baseline's tolerance
        // because Linux and macOS rasterize its text and native controls
        // differently. Keep reviewed Linux references for these two captures.
        const host = block === "admin-customers-01" && state === "success" && process.platform === "linux" ? "-linux" : ""
        await expect(page).toHaveScreenshot(`${block}-${state}-${mode}${host}.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.015 })
      })
    }
  }
}
