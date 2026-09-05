import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { CLI_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"

for (const width of [1280, 390]) {
  test(`beta onboarding links and commands at ${width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto("/")
    const mcp = page.getByRole("link", { name: "Introducing the remote MCP endpoint" })
    await expect(mcp).toHaveAttribute("href", "/docs/llms#mcp-server")
    for (const href of await page.locator("main section").first().locator("a[href]").evaluateAll(
      (links) => links.map((link) => link.getAttribute("href")!),
    )) {
      expect((await request.get(href)).ok(), href).toBe(true)
    }
    await mcp.click()
    await expect(page.getByRole("heading", { name: "MCP server", exact: true })).toBeVisible()
    await expect(page.locator("main")).toContainText("Applying a plan requires a host")
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).disableRules(["color-contrast"]).analyze()
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.evaluate(async () => {
      await document.fonts.ready
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
    const heading = page.getByRole("heading", { name: "MCP server", exact: true })
    await heading.scrollIntoViewIfNeeded()
    await expect(heading).toBeInViewport()
    await page.screenshot({ path: testInfo.outputPath(`mcp-onboarding-${width}.png`), animations: "disabled" })
    await page.locator("article table").first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`mcp-endpoints-${width}.png`), animations: "disabled" })
    for (const locale of ["", "/es"]) {
      await page.goto(`${locale}/docs/installation`)
      await expect(page.locator("main")).toContainText(`npx ${CLI_PACKAGE_SELECTOR} add button`)
      const markdown = await request.get(`${locale}/docs/installation.md`)
      expect(markdown.ok()).toBe(true)
      expect(await markdown.text()).toContain(`npx ${CLI_PACKAGE_SELECTOR} add button`)
      await page.goto(`${locale}/docs/components/button`)
      const install = page.locator('[data-uid="install-button"]')
      await expect(install.locator(".ipanel-cli")).toContainText(`npx ${CLI_PACKAGE_SELECTOR} add button`)
      await install.locator('[data-tab="agent"]').click()
      await expect(install.locator(".prompt-body")).toBeVisible()
      await expect(install.locator(".prompt-body")).toContainText(`npx ${CLI_PACKAGE_SELECTOR} add button`)
      const componentMarkdown = await request.get(`${locale}/docs/components/button.md`)
      expect(await componentMarkdown.text()).toContain(`npx ${CLI_PACKAGE_SELECTOR} add button`)
    }
  })
}
