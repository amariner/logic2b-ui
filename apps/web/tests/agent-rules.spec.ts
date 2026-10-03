import { readFile } from "node:fs/promises"
import { expect, test } from "@playwright/test"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"

// The expected downloads were captured before moving the studio generator.
test("studio downloads retain their pre-move AGENTS and DESIGN bytes", async ({ page }, testInfo) => {
  await page.goto(`/create?preset=${encodePreset(DEFAULT_CONFIG)}`)
  await expect(page.locator("aside")).toContainText("--preset")
  await page.locator("aside").getByRole("button", { name: "Get Code", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("tab", { name: "Theme", exact: true }).click()
  for (const name of ["AGENTS", "DESIGN"] as const) {
    await dialog.getByRole("button", { name: `${name}.md`, exact: true }).click()
    const downloading = page.waitForEvent("download")
    await dialog.getByRole("button", { name: `Download ${name}.md`, exact: true }).click()
    const download = await downloading
    expect(download.suggestedFilename()).toBe(`${name}.md`)
    const path = await download.path()
    expect(path).not.toBeNull()
    const expected = await readFile(new URL(`../../../packages/scaffold/test/fixtures/rules/studio-default-${name.toLowerCase()}.md`, import.meta.url), "utf8")
    expect(await readFile(path!, "utf8")).toBe(expected)
  }
  await page.screenshot({ path: testInfo.outputPath("studio-rule-downloads.png"), animations: "disabled" })
})
