import { expect, test } from "@playwright/test"
import { CLI_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"

for (const locale of ["en", "es"] as const) {
  for (const width of [1280, 390]) {
    test(`theme gallery ${locale} handoff and copy at ${width}px`, async ({ page, context, request }, testInfo) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"])
      await page.setViewportSize({ width, height: 900 })
      const response = await page.goto(locale === "es" ? "/es/themes" : "/themes")
      expect(response?.ok()).toBe(true)
      await expect(page.locator("html")).toHaveAttribute("lang", locale)
      const catalogResponse = await request.get("/themes/index.json")
      expect(catalogResponse.ok()).toBe(true)
      const catalog = await catalogResponse.json()
      expect(catalog.count).toBe(8)
      await expect(page.locator("main article")).toHaveCount(catalog.count)
      for (const preset of catalog.presets) {
        const card = page.locator(`article#${preset.slug}`)
        await expect(card.getByRole("heading", { name: preset.name, exact: true })).toBeVisible()
        await expect(card.locator('a[href^="/create?preset="]')).toHaveAttribute("href", preset.links.studio)
        expect(preset.command).toBe(`npx ${CLI_PACKAGE_SELECTOR} init --preset ${preset.preset}`)
      }
      const first = page.locator("main article").first()
      const copy = first.locator("[data-copy-preset]")
      await copy.click()
      await expect(copy).toHaveText(locale === "es" ? "Copiado" : "Copied")
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(catalog.presets[0].preset)
      await first.locator("summary").click()
      await expect(first.locator("details")).toHaveAttribute("open", "")
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.evaluate(async () => { await document.fonts.ready })
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: testInfo.outputPath(`themes-${locale}-${width}.png`), fullPage: true })
      const selected = catalog.presets[1]
      await page.locator(`article#${selected.slug} a[href^="/create?preset="]`).click()
      await expect(page.getByRole("heading", { name: "Customize", exact: true })).toBeVisible()
      await expect(page.locator("aside")).toContainText(`--preset ${selected.preset}`)
      await expect(page).toHaveURL(new RegExp(`/create\\?preset=${selected.preset}$`))
    })
  }
}
