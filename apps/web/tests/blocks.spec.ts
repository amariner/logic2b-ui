import { expect, test, type Page } from "@playwright/test"

async function waitForHydratedPreview(page: Page, name: string) {
  await page.locator(`[data-preview-ready="${name}"]`).waitFor()
  await page.locator("astro-island").evaluate(
    (island) =>
      new Promise<void>((resolve) => {
        if (!island.hasAttribute("ssr")) resolve()
        else island.addEventListener("astro:hydrate", () => resolve(), { once: true })
      })
  )
}

test.describe("interactive registry blocks", () => {
  test("mail client filters, selects and updates starred messages", async ({ page }) => {
    await page.goto("/blocks/preview/mail-client-01", {
      waitUntil: "domcontentloaded",
    })
    await waitForHydratedPreview(page, "mail-client-01")

    await page.getByRole("button", { name: /Noah Williams/ }).click()
    await expect(
      page.getByRole("heading", { level: 2, name: "Weekly engineering notes" })
    ).toBeVisible()

    await page.getByRole("textbox", { name: "Search mail" }).fill("Research")
    await expect(page.getByText("1 messages", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /Ava Patel/ })).toBeVisible()

    await page.getByRole("textbox", { name: "Search mail" }).fill("")
    await page.getByRole("button", { name: /Starred/ }).click()
    await expect(page.getByRole("heading", { level: 1, name: "starred" })).toBeVisible()
    await page.getByRole("button", { name: "Remove from starred" }).click()
    await expect(page.getByText("No messages found.")).toBeVisible()
  })

  test("mail client stays within a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/blocks/preview/mail-client-01", {
      waitUntil: "domcontentloaded",
    })
    await waitForHydratedPreview(page, "mail-client-01")

    await expect(page.getByRole("textbox", { name: "Search mail" })).toBeVisible()
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasPageOverflow).toBe(false)
  })

  test("calendar app navigates, filters and selects events", async ({ page }) => {
    await page.goto("/blocks/preview/calendar-app-01", {
      waitUntil: "domcontentloaded",
    })
    await waitForHydratedPreview(page, "calendar-app-01")

    await expect(
      page.getByRole("heading", { level: 1, name: "September 2026" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Next month" }).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "October 2026" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Today" }).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "September 2026" })
    ).toBeVisible()

    await page.getByRole("button", { name: /^Design critique,/ }).click()
    await expect(
      page.getByRole("heading", { level: 3, name: "Design critique" })
    ).toBeVisible()
    await expect(page.getByText("Noah Williams", { exact: true })).toBeVisible()

    const designFilter = page.getByRole("button", { name: /^Design\s+2$/ })
    await designFilter.click()
    await expect(designFilter).toHaveAttribute("aria-pressed", "false")
    await expect(page.getByRole("button", { name: /^Design critique,/ })).toHaveCount(0)
    await expect(
      page.getByText("Select a visible event to inspect its schedule and owner.")
    ).toBeVisible()
  })

  test("calendar app stays within a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/blocks/preview/calendar-app-01", {
      waitUntil: "domcontentloaded",
    })
    await waitForHydratedPreview(page, "calendar-app-01")

    await expect(
      page.getByRole("heading", { level: 1, name: "September 2026" })
    ).toBeVisible()
    await expect(
      page.getByRole("region", { name: "September 2026 month grid" })
    ).toBeVisible()
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasPageOverflow).toBe(false)
  })

  test("AI chat streams, stops and continues a response", async ({ page }) => {
    await page.goto("/blocks/preview/ai-chat-01", {
      waitUntil: "domcontentloaded",
    })
    await waitForHydratedPreview(page, "ai-chat-01")

    await page.getByRole("textbox", { name: "Prompt" }).fill("Audit the loading state")
    await page.getByRole("button", { name: "Send" }).click()
    await expect(page.getByText("Audit the loading state", { exact: true })).toBeVisible()
    await expect(page.getByRole("status")).toHaveText("Generating response…")
    await page.getByRole("button", { name: "Stop generating" }).click()
    await expect(page.getByRole("status")).toHaveText("Generation stopped")

    await page.getByRole("button", { name: "Continue response" }).click()
    await expect(page.getByRole("status")).toHaveText("Generating response…")
    await expect(page.getByRole("status")).toHaveText("Ready", { timeout: 5_000 })
    await expect(
      page.getByText(/Start with a stable message list and expose generation progress/)
    ).toBeVisible()
  })

  test("AI chat stays within a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/blocks/preview/ai-chat-01", {
      waitUntil: "domcontentloaded",
    })
    await waitForHydratedPreview(page, "ai-chat-01")

    await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible()
    await expect(page.getByRole("log", { name: "Conversation messages" })).toBeVisible()
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasPageOverflow).toBe(false)
  })
})
