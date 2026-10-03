import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { REVIEW_RULES } from "@logic2b/review"

for (const locale of ["", "/es"]) for (const width of [390, 1280]) {
  test(`static review docs ${locale || "en"} at ${width}px`, async ({ page, request }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on("pageerror", error => errors.push(error.message))
    await page.goto(`${locale}/docs/review`)
    const article = page.locator("article")
    await expect(article).toContainText("schemaVersion")
    await expect(article).toContainText("unknowns")
    const response = await request.get(`${locale}/docs/review.md`)
    expect(response.ok()).toBe(true)
    const markdown = await response.text()
    expect(markdown).not.toContain("<ReviewRules")
    for (const rule of REVIEW_RULES) {
      await expect(article).toContainText(rule.description)
      expect(markdown).toContain(rule.description)
      const id = new URL(rule.docs).hash.slice(1)
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).disableRules(["color-contrast"]).analyze()
    expect(audit.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
    await page.locator('[id="reference-L2B-A11Y-001"]').scrollIntoViewIfNeeded()
    await page.screenshot({ path: info.outputPath(`review-rules-${locale ? "es" : "en"}-${width}.png`), animations: "disabled" })
    const link = article.getByRole("link", { name: "L2B-A11Y-001", exact: true }).first()
    await link.focus()
    await expect(link).toBeFocused()
    expect(errors).toEqual([])
  })
}
