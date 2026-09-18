import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

for (const width of [1280, 390]) {
  test(`static review instructions remain usable at ${width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height: 800 })
    for (const locale of ["", "/es"]) {
      const route = `${locale}/docs/review`
      await page.goto(route)
      await expect(page.locator("article")).toContainText("--complete-label-context")
      await expect(page.locator("article")).toContainText("semanticColors")
      const markdown = await request.get(`${route}.md`)
      expect(markdown.ok()).toBe(true)
      const source = await markdown.text()
      expect(source).not.toContain("<ReviewRules")
      for (const rule of ["L2B-TOK-001", "L2B-A11Y-001", "L2B-A11Y-002", "L2B-A11Y-003"]) {
        const section = page.locator(`section[aria-labelledby="${rule.toLowerCase()}"]`)
        await expect(section.getByRole("heading", { name: rule, exact: true })).toBeVisible()
        await expect(section.locator("pre")).toHaveCount(2)
        expect(source).toContain(rule)
        for (const code of await section.locator("pre code").allTextContents()) expect(source).toContain(code)
      }
      if (width === 390) {
        const example = page.locator('section[aria-labelledby="l2b-a11y-003"] pre').last()
        await example.focus()
        await expect(example).toBeFocused()
        await example.press("ArrowRight")
        await expect.poll(() => example.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
      }
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).disableRules(["color-contrast"]).analyze()
      expect(violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.locator("#l2b-tok-001").scrollIntoViewIfNeeded()
      await page.evaluate(async () => { await document.fonts.ready })
      await page.screenshot({ path: testInfo.outputPath(`review-${locale ? "es" : "en"}-${width}.png`), animations: "disabled" })
    }
  })
}
