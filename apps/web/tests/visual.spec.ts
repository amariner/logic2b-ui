import { readdirSync } from "node:fs"
import { join } from "node:path"

import { expect, test } from "@playwright/test"

type Surface = { kind: "blocks" | "demos" | "playgrounds"; name: string }

function previewNames(kind: Surface["kind"]): Surface[] {
  const dir = join(process.cwd(), "dist/client", kind, "preview")
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ kind, name: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const surfaces = [
  ...previewNames("demos"),
  ...previewNames("blocks"),
  ...previewNames("playgrounds"),
]
const themes = ["dark", "light"] as const
const launchSurfaces = [
  { name: "gallery", route: "/demos" },
  { name: "marketing", route: "/demos/launch/marketing" },
  { name: "dashboard", route: "/demos/launch/dashboard" },
  { name: "auth", route: "/demos/launch/auth" },
] as const

test.describe("visual regression", () => {
  for (const surface of surfaces) {
    for (const theme of themes) {
      test(`${surface.kind}/${surface.name} [${theme}]`, async ({ page }) => {
        await page.addInitScript((value) => {
          localStorage.setItem("theme", value)
        }, theme)
        await page.goto(`/${surface.kind}/preview/${surface.name}`, {
          waitUntil: "domcontentloaded",
        })
        const readyAttribute =
          surface.kind === "playgrounds"
            ? "data-playground-ready"
            : "data-preview-ready"
        await page
          .locator(`[${readyAttribute}="${surface.name}"]`)
          .waitFor()
        await page.evaluate(async () => {
          await document.fonts.ready
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
        })
        // Recharts uses a JS-driven 1.5s entrance animation that Playwright's
        // CSS/Web Animations switch cannot fast-forward. Blocks may embed the
        // same charts or count-up recipes, so capture both families only after
        // their longest shipped animation has settled.
        if (
          surface.kind === "blocks" ||
          surface.name === "chart" ||
          surface.name.startsWith("chart-")
        ) {
          await page.waitForTimeout(1_800)
        }

        await expect(page).toHaveScreenshot(
          [surface.kind, `${surface.name}-${theme}.png`],
          {
            animations: "disabled",
            caret: "hide",
            fullPage: false,
            maxDiffPixelRatio: 0.03,
            scale: "css",
            threshold: 0.25,
          }
        )
      })
    }
  }
})

test.describe("launch demos — visual regression", () => {
  for (const surface of launchSurfaces) {
    for (const theme of themes) {
      test(`${surface.name} [${theme}]`, async ({ page }) => {
        await page.addInitScript((value) => {
          localStorage.setItem("theme", value)
        }, theme)
        await page.goto(surface.route, { waitUntil: "domcontentloaded" })
        await page.evaluate(async () => {
          await document.fonts.ready
        })
        await page.waitForTimeout(1_800)

        await expect(page).toHaveScreenshot(
          ["launch", `${surface.name}-${theme}.png`],
          {
            animations: "disabled",
            caret: "hide",
            fullPage: false,
            maxDiffPixelRatio: 0.03,
            scale: "css",
            threshold: 0.25,
          },
        )
      })
    }
  }
})
