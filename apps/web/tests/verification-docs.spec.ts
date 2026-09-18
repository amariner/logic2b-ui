import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { validateVerificationSuite } from "@logic2b/scaffold/verification"

for (const width of [1280, 390]) {
  test(`consumer verification instructions remain usable at ${width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height: 800 })
    for (const locale of ["", "/es"]) {
      const route = `${locale}/docs/verification`
      const response = await page.goto(route)
      expect(response?.ok()).toBe(true)
      const article = page.locator("article")
      for (const term of ["verify verification-suite.json", "verify_report", "--app-unavailable", "--browser-executable", "playwright@1.61.1", "@axe-core/playwright@4.12.1", "projectFiles", "disabledRules", "consumer:prepare", "test:consumer"])
        await expect(article).toContainText(term)
      await expect(article).toContainText(locale ? "CLI mantiene el código 2" : "CLI retains exit 2")
      await expect(article).toContainText(locale ? "también al mismo origen" : "including same-origin redirects")

      const markdown = await request.get(`${route}.md`)
      expect(markdown.ok()).toBe(true)
      const source = await markdown.text()
      const codeBlocks = await article.locator("pre code").allTextContents()
      for (const code of codeBlocks) expect(source).toContain(code.trim())
      const rawSuite = JSON.parse(codeBlocks.find(code => code.includes('"schemaVersion"'))!)
      const suite = validateVerificationSuite(rawSuite)
      expect(suite.viewports.map(viewport => viewport.width)).toEqual([1280, 390])
      expect(suite.scenarios).toHaveLength(1)
      expect(suite.scenarios[0].route).toBe("/customers")
      expect(suite.scenarios[0].steps.map(step => step.type === "check" ? step.assertion : step.action)).toEqual(["visible", "overflow", "screenshot", "axe"])
      const action = JSON.parse(codeBlocks.find(code => code.includes('"type": "action"'))!)
      expect(validateVerificationSuite({ ...suite, scenarios: [{ ...suite.scenarios[0], steps: [action, ...suite.scenarios[0].steps] }] }).scenarios[0].steps[0]).toEqual(action)

      await expect(article.getByRole("link", { name: locale ? "revisión estática" : "static review", exact: true })).toHaveAttribute("href", `${locale}/docs/review`)
      await expect(article.getByRole("link", { name: locale ? "cambio incremental" : "incremental change", exact: true })).toHaveAttribute("href", `${locale}/docs/changes`)
      const commands = article.locator("pre").filter({ hasText: "index.js verify verification-suite.json" }).first()
      if (width === 390) {
        await commands.focus()
        await expect(commands).toBeFocused()
        await commands.press("ArrowRight")
        await expect.poll(() => commands.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
      }
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).disableRules(["color-contrast"]).analyze()
      expect(violations.filter(violation => violation.impact === "serious" || violation.impact === "critical")).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await commands.scrollIntoViewIfNeeded()
      await page.evaluate(async () => { await document.fonts.ready })
      await page.screenshot({ path: testInfo.outputPath(`verification-${locale ? "es" : "en"}-${width}.png`), animations: "disabled" })
    }
  })
}
