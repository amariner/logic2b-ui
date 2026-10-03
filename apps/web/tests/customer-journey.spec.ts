import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const runtimeErrors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message))
})
test.afterEach(({ page }) => {
  expect(runtimeErrors.get(page) ?? [], "The customer journey must not raise browser runtime errors").toEqual([])
})

async function preview(page: Page, name = "admin-customers-01", params = "") {
  await page.goto(`/blocks/preview/${name}${params}`, { waitUntil: "domcontentloaded" })
  await page.locator(`[data-preview-ready="${name}"]`).waitFor()
  await page.locator("astro-island").evaluate((island) => new Promise<void>((resolve) => {
    if (!island.hasAttribute("ssr")) resolve()
    else island.addEventListener("astro:hydrate", () => resolve(), { once: true })
  }))
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function noBlockingAxe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // The repository audits contrast through semantic token pairs separately.
    .disableRules(["color-contrast"])
    .analyze()
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([])
}

for (const width of [1280, 390]) {
  test(`customer journey creates, edits and discards with keyboard at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await preview(page)
    const search = page.getByRole("searchbox", { name: "Search customers" })
    await search.fill("No such customer")
    await expect(page.getByRole("heading", { name: "No matching customers" })).toBeVisible()
    await page.getByRole("button", { name: "Clear search" }).click()
    await expect(search).toHaveValue("")

    const add = page.getByRole("button", { name: "Add customer", exact: true }).first()
    await add.focus()
    await page.keyboard.press("Enter")
    const dialog = page.getByRole("dialog", { name: "Add customer" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Save customer", exact: true }).click()
    await expect(dialog.getByLabel("Name", { exact: true })).toHaveAttribute("aria-invalid", "true")
    await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused()
    await dialog.getByLabel("Name", { exact: true }).fill("Marina Torres")
    await dialog.getByLabel("Email", { exact: true }).fill("marina@example.com")
    await dialog.getByLabel("Company", { exact: true }).fill("Torres Architecture")
    await noOverflow(page)
    await noBlockingAxe(page)
    await page.screenshot({ path: testInfo.outputPath(`customer-create-${width}.png`), animations: "disabled" })
    await dialog.getByRole("button", { name: "Save customer", exact: true }).click()
    await expect(dialog.getByRole("button", { name: /Saving/ })).toBeDisabled()
    await expect(dialog.getByLabel("Name", { exact: true })).toBeDisabled()
    await page.keyboard.press("Enter")
    await page.keyboard.press("Escape")
    await expect(dialog).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(add).toBeFocused()

    await search.fill("Marina Torres")
    await expect(page.getByRole("row").filter({ hasText: "marina@example.com" })).toHaveCount(1)
    const edit = page.getByRole("button", { name: "Edit Marina Torres", exact: true })
    await edit.focus()
    await page.keyboard.press("Enter")
    const editor = page.getByRole("dialog", { name: "Edit customer" })
    await expect(editor.getByLabel("Company", { exact: true })).toHaveValue("Torres Architecture")
    await editor.getByLabel("Name", { exact: true }).fill("Marina Torres García")
    await editor.getByRole("button", { name: "Save customer", exact: true }).click()
    await expect(editor).toBeHidden()
    await expect(page.getByRole("button", { name: "Edit Marina Torres García", exact: true })).toBeFocused()
    await expect(page.getByRole("row").filter({ hasText: "marina@example.com" })).toHaveCount(1)

    const updatedEdit = page.getByRole("button", { name: "Edit Marina Torres García", exact: true })
    await updatedEdit.click()
    await editor.getByLabel("Company", { exact: true }).fill("Unsaved company")
    await page.keyboard.press("Escape")
    const confirm = page.getByRole("alertdialog", { name: "Discard unsaved changes?" })
    await expect(confirm).toBeVisible()
    await noBlockingAxe(page)
    await confirm.getByRole("button", { name: "Keep editing" }).click()
    await expect(editor.getByLabel("Company", { exact: true })).toHaveValue("Unsaved company")
    await expect(editor.getByLabel("Company", { exact: true })).toBeFocused()
    const cancel = editor.getByRole("button", { name: "Cancel", exact: true })
    await cancel.click()
    await expect(confirm).toBeVisible()
    await confirm.getByRole("button", { name: "Keep editing" }).click()
    await expect(cancel).toBeFocused()
    await cancel.click()
    await expect(confirm).toBeVisible()
    await confirm.getByRole("button", { name: "Discard changes" }).click()
    await expect(editor).toBeHidden()
    await expect(updatedEdit).toBeFocused()
    await updatedEdit.click()
    await expect(editor.getByLabel("Company", { exact: true })).toHaveValue("Torres Architecture")
    await editor.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(editor).toBeHidden()
    await noOverflow(page)
  })

  test(`customer failure keeps input and retry succeeds at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await preview(page, "admin-customers-01", "?save=fail-once")
    await page.getByRole("button", { name: "Edit Olivia Martin", exact: true }).click()
    const editor = page.getByRole("dialog", { name: "Edit customer" })
    await editor.getByLabel("Company", { exact: true }).fill("Northstar Europe")
    await editor.getByRole("button", { name: "Save customer", exact: true }).click()
    await expect(editor.getByRole("alert")).toContainText("Your changes are still here")
    await expect(editor.getByLabel("Company", { exact: true })).toHaveValue("Northstar Europe")
    await noBlockingAxe(page)
    await editor.getByRole("button", { name: "Try saving again", exact: true }).click()
    await expect(editor).toBeHidden()
    await page.getByRole("button", { name: "Edit Olivia Martin", exact: true }).click()
    await expect(editor.getByLabel("Company", { exact: true })).toHaveValue("Northstar Europe")
    await noOverflow(page)
  })
}

test("list retry preserves search; permission denial offers no write action; empty can create", async ({ page }) => {
  await preview(page, "admin-customers-01", "?state=error")
  const search = page.getByRole("searchbox", { name: "Search customers" })
  await search.fill("Olivia")
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.getByText("Loading customers...", { exact: true }).last()).toBeVisible()
  await expect(search).toHaveValue("Olivia")
  await expect(page.getByRole("button", { name: "Edit Olivia Martin", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Edit Jackson Lee", exact: true })).toHaveCount(0)
  await preview(page, "admin-customers-01", "?state=permission-denied")
  await expect(page.getByText("You cannot view customers", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add customer", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0)
  await preview(page, "admin-customers-01", "?state=empty")
  await expect(page.getByRole("heading", { name: "No customers yet" })).toBeVisible()
  await page.getByRole("button", { name: "Add customer", exact: true }).last().click()
  await expect(page.getByRole("dialog", { name: "Add customer" })).toBeVisible()
})

test("standalone form confirms discard and corrects invalid input before saving", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await preview(page, "customer-edit-01", "?state=unsaved")
  const company = page.getByLabel("Company", { exact: true })
  await expect(company).toHaveValue("Northstar Studio Europe")
  const cancel = page.getByRole("button", { name: "Cancel", exact: true })
  await cancel.click()
  await expect(page.getByText("Discard unsaved changes?", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Keep editing" })).toBeFocused()
  await page.getByRole("button", { name: "Keep editing" }).click()
  await expect(cancel).toBeFocused()
  await expect(company).toHaveValue("Northstar Studio Europe")
  await cancel.click()
  await page.getByRole("button", { name: "Discard changes" }).click()
  await expect(company).toHaveValue("Northstar Studio")
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused()
  const email = page.getByLabel("Email", { exact: true })
  await email.fill("olivia@")
  await page.getByRole("button", { name: "Save customer", exact: true }).click()
  await expect(email).toHaveAttribute("aria-invalid", "true")
  await expect(email).toBeFocused()
  await email.fill("olivia@northstar.example")
  await page.getByRole("button", { name: "Save customer", exact: true }).click()
  await expect(page.getByText("Customer saved", { exact: true })).toBeVisible()
  await expect(email).toHaveValue("olivia@northstar.example")
  await noBlockingAxe(page)
  await noOverflow(page)
})

test("standalone form removes pending discard confirmation before submitting", async ({ page }) => {
  await preview(page, "customer-edit-01", "?state=unsaved")
  const company = page.getByLabel("Company", { exact: true })
  await expect(company).toHaveValue("Northstar Studio Europe")
  const now = new Date("2026-10-03T12:00:00Z")
  await page.clock.install({ time: now })
  await page.clock.pauseAt(now)
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(page.getByText("Discard unsaved changes?", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Save customer", exact: true }).click()
  await expect(page.getByRole("button", { name: "Saving customer...", exact: true })).toBeDisabled()
  await expect(company).toBeDisabled()
  await expect(page.getByText("Discard unsaved changes?", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Discard changes", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Keep editing", exact: true })).toHaveCount(0)
  await page.clock.runFor(700)
  await expect(page.getByText("Customer saved", { exact: true })).toBeVisible()
  await expect(company).toHaveValue("Northstar Studio Europe")
  await expect(page.getByText("Discard unsaved changes?", { exact: true })).toHaveCount(0)
})

const listStates = ["loading", "empty", "no-results", "error", "permission-denied", "success"] as const
const formStates = ["loading", "error", "permission-denied", "submitting", "validation-error", "unsaved", "success"] as const

for (const theme of ["light", "dark"]) {
  for (const width of [1280, 390]) {
    test(`customer state matrix accessible and responsive [${theme}] ${width}px`, async ({ page }, testInfo) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((selected) => localStorage.setItem("theme", selected), theme)
      for (const [name, states] of [["admin-customers-01", listStates], ["customer-edit-01", formStates]] as const) {
        for (const state of states) {
          await preview(page, name, `?state=${state}`)
          // Wait for the URL-controlled variant, rather than auditing the initial SSR fallback.
          if (name === "admin-customers-01") {
            if (state === "loading") await expect(page.getByText("Loading customers...", { exact: true }).last()).toBeVisible()
            if (state === "empty") await expect(page.getByRole("heading", { name: "No customers yet" })).toBeVisible()
            if (state === "no-results") await expect(page.getByRole("heading", { name: "No matching customers" })).toBeVisible()
            if (state === "error") await expect(page.getByText("Customers could not be loaded", { exact: true })).toBeVisible()
            if (state === "permission-denied") await expect(page.getByText("You cannot view customers", { exact: true })).toBeVisible()
            if (state === "success") await expect(page.getByText("Customer saved. The customer list is up to date.", { exact: true })).toBeVisible()
          } else {
            if (state === "loading") await expect(page.getByText("Loading customer details...", { exact: true }).last()).toBeVisible()
            if (state === "submitting") await expect(page.getByRole("button", { name: /Saving/ })).toBeDisabled()
            if (state === "permission-denied") await expect(page.getByText("You cannot edit this customer", { exact: true })).toBeVisible()
            if (state === "error") await expect(page.getByRole("alert")).toContainText("Your changes are still here")
            if (state === "validation-error") await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true")
            if (state === "unsaved") await expect(page.getByLabel("Company", { exact: true })).toHaveValue("Northstar Studio Europe")
            if (state === "success") await expect(page.getByText("Customer saved. You can continue editing.", { exact: true })).toBeVisible()
          }
          await noOverflow(page)
          await noBlockingAxe(page)
          await page.evaluate(() => document.fonts.ready)
          await page.screenshot({ path: testInfo.outputPath(`${name}-${state}-${theme}-${width}.png`), animations: "disabled", fullPage: true })
        }
      }
    })
  }
}

test("customer detail page exposes working States and content contract on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto("/blocks/application/admin-customers-01", { waitUntil: "domcontentloaded" })
  const selector = page.locator("#behavior-state")
  await selector.selectOption("error")
  // Select by its actual src; the other iframes are the normal preview/code surface.
  const errorFrame = page.locator('iframe[src*="state=error"]')
  await expect(errorFrame).toHaveAttribute("src", /state=error/)
  await expect(errorFrame.contentFrame().getByText("Customers could not be loaded", { exact: true })).toBeVisible()
  await selector.selectOption("empty")
  await expect(page.locator('iframe[src*="state=empty"]').contentFrame().getByRole("heading", { name: "No customers yet" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Content slots", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Actions and consumer responsibilities", exact: true })).toBeVisible()
  await noOverflow(page)
})
