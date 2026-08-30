import { expect, test, type Page } from "@playwright/test"

async function waitForHydratedDemo(page: Page, name: string) {
  await page.locator(`[data-preview-ready="${name}"]`).waitFor()
  await page.locator("astro-island").evaluate(
    (island) =>
      new Promise<void>((resolve) => {
        if (!island.hasAttribute("ssr")) resolve()
        else island.addEventListener("astro:hydrate", () => resolve(), { once: true })
      })
  )
}

test.describe("interactive registry charts", () => {
  test("real-time chart starts, pauses and resets its rolling feed", async ({ page }) => {
    await page.goto("/demos/preview/chart-realtime-01", {
      waitUntil: "domcontentloaded",
    })
    await waitForHydratedDemo(page, "chart-realtime-01")

    const header = page.locator('[data-slot="card-header"]')
    await expect(header).toHaveCSS("display", "flex")
    const titleBox = await header.locator(":scope > div").nth(0).boundingBox()
    const controlsBox = await header.locator(":scope > div").nth(1).boundingBox()
    expect(Math.abs((titleBox?.y ?? 0) - (controlsBox?.y ?? 0))).toBeLessThan(12)

    await expect(page.getByRole("status")).toHaveText("Stream paused")
    await expect(page.getByText(/114\s*req\/min/)).toBeVisible()

    await page.getByRole("button", { name: "Start stream" }).click()
    await expect(page.getByRole("button", { name: "Pause stream" })).toBeVisible()
    await expect(page.getByRole("status")).toContainText("Streaming")
    await expect(page.getByText(/121\s*req\/min/)).toBeVisible({ timeout: 2_000 })

    await page.getByRole("button", { name: "Pause stream" }).click()
    await expect(page.getByRole("status")).toHaveText("Stream paused")
    await page.waitForTimeout(700)
    await expect(page.getByText(/121\s*req\/min/)).toBeVisible()

    await page.getByRole("button", { name: "Reset" }).click()
    await expect(page.getByText(/114\s*req\/min/)).toBeVisible()
  })

  test("real-time chart stays within a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/demos/preview/chart-realtime-01", {
      waitUntil: "domcontentloaded",
    })
    await waitForHydratedDemo(page, "chart-realtime-01")

    await expect(page.getByText("Live API traffic", { exact: true })).toBeVisible()
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasPageOverflow).toBe(false)
  })
})
