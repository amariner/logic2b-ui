import { readdirSync } from "node:fs"
import { join } from "node:path"

import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

// The shipped blocks are the product surface: every block renders in its own
// preview page (`/blocks/preview/<name>`), the same markup the CLI installs.
// Gate that surface on structural/semantic accessibility, light + dark.
const PREVIEW_DIR = join(process.cwd(), "dist/client/blocks/preview")
const blocks = readdirSync(PREVIEW_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const THEMES = ["dark", "light"] as const

// color-contrast is owned by the studio's dedicated WCAG 2.2 + APCA contrast
// audit (per token pair, light + dark, surfaced in the rail and the
// `contrast_audit` MCP tool). This gate covers the rest: accessible names,
// roles, labels and valid ARIA on the rendered components.
const IGNORED_RULES = ["color-contrast"]

test.describe("block previews — accessibility", () => {
  for (const block of blocks) {
    for (const theme of THEMES) {
      test(`${block} [${theme}]`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme)
        await page.goto(`/blocks/preview/${block}`, {
          waitUntil: "domcontentloaded",
        })
        await page.waitForTimeout(400) // let islands hydrate

        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .disableRules(IGNORED_RULES)
          .analyze()

        const blocking = violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        )
        const summary = blocking
          .map(
            (v) =>
              `  ${v.id} (${v.impact}) ×${v.nodes.length} — ${v.help}\n    ${v.nodes[0]?.html?.slice(0, 160)}`
          )
          .join("\n")

        expect(blocking, `\n${summary}`).toEqual([])
      })
    }
  }
})
