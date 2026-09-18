import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

for (const width of [1280, 390]) {
  test(`incremental change instructions remain usable at ${width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height: 800 })
    for (const locale of ["", "/es"]) {
      const route = `${locale}/docs/changes`
      await page.goto(route)
      const article = page.locator("article")
      for (const command of ["change plan", "change apply", "change recover", "change status", "--dry-run", "TRANSACTION_UUID", "change_plan"]) await expect(article).toContainText(command)
      const markdown = await request.get(`${route}.md`)
      expect(markdown.ok()).toBe(true)
      const source = await markdown.text()
      for (const code of await article.locator("pre code").allTextContents()) expect(source).toContain(code.trim())
      const requests = await article.locator("pre code").allTextContents()
      const example = JSON.parse(requests.find(code => code.includes('"snapshot"'))!)
      expect(example.missingFiles).toEqual([example.candidates[0].path])
      expect(example.snapshot.files).toEqual([])
      await expect(article.getByRole("link", { name: locale ? "revisión estática" : "static review" })).toHaveAttribute("href", `${locale}/docs/review`)
      if (width === 390) {
        const commands = article.locator("pre").filter({ hasText: "change plan request.json" })
        await commands.focus()
        await expect(commands).toBeFocused()
        await commands.press("ArrowRight")
        await expect.poll(() => commands.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
      }
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).disableRules(["color-contrast"]).analyze()
      expect(violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await article.locator("pre").filter({ hasText: "change plan request.json" }).scrollIntoViewIfNeeded()
      await page.evaluate(async () => { await document.fonts.ready })
      await page.screenshot({ path: testInfo.outputPath(`changes-${locale ? "es" : "en"}-${width}.png`), animations: "disabled" })
    }
  })
}
