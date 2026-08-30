import { readdirSync } from "node:fs"
import { join } from "node:path"

import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { LAUNCH_DEMOS } from "../src/data/launch-demos"
import { PLAYGROUND_NAMES } from "../src/data/playground-recipes"

// The shipped blocks are the product surface: every block renders in its own
// preview page (`/blocks/preview/<name>`), the same markup the CLI installs.
// Gate that surface on structural/semantic accessibility, light + dark.
const PREVIEW_DIR = join(process.cwd(), "dist/client/blocks/preview")
const DEMO_PREVIEW_DIR = join(process.cwd(), "dist/client/demos/preview")
const previewNames = (dir: string) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
const blocks = previewNames(PREVIEW_DIR)
const allDemos = previewNames(DEMO_PREVIEW_DIR)
const demoFilter = process.env.A11Y_DEMO
const demos = demoFilter
  ? allDemos.filter((demo) => demo === demoFilter)
  : allDemos

if (demoFilter && demos.length === 0) {
  throw new Error(`Unknown A11Y_DEMO: ${demoFilter}`)
}

const THEMES = ["dark", "light"] as const

// color-contrast is owned by the studio's dedicated WCAG 2.2 + APCA contrast
// audit (per token pair, light + dark, surfaced in the rail and the
// `contrast_audit` MCP tool). This gate covers the rest: accessible names,
// roles, labels and valid ARIA on the rendered components.
const IGNORED_RULES = ["color-contrast"]

async function expectNoBlockingViolations(page: Page, label?: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(IGNORED_RULES)
    .analyze()

  const blocking = violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical"
  )
  const summary = blocking
    .map(
      (violation) =>
        `  ${violation.id} (${violation.impact}) ×${violation.nodes.length} — ${violation.help}\n    ${violation.nodes[0]?.html?.slice(0, 160)}`
    )
    .join("\n")

  expect(blocking, `\n${label ? `${label}\n` : ""}${summary}`).toEqual([])
}

test.describe("block previews — accessibility", () => {
  for (const block of blocks) {
    for (const theme of THEMES) {
      test(`${block} [${theme}]`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme)
        await page.goto(`/blocks/preview/${block}`, {
          waitUntil: "domcontentloaded",
        })
        await page.waitForTimeout(400) // let islands hydrate

        await expectNoBlockingViolations(page)
      })
    }
  }
})

// Component and chart demos are copyable product examples, not decorative
// screenshots. Gate their actual rendered markup so downstream projects don't
// inherit a serious/critical semantic defect from the documentation.
test.describe("component and chart demos — accessibility", () => {
  const batchSize = 16
  const batches = Array.from(
    { length: Math.ceil(demos.length / batchSize) },
    (_, index) => demos.slice(index * batchSize, (index + 1) * batchSize)
  )

  for (const [batchIndex, batch] of batches.entries()) {
    for (const theme of THEMES) {
      test(`batch ${batchIndex + 1}/${batches.length} [${theme}]`, async ({ context }) => {
        await context.addInitScript((t) => localStorage.setItem("theme", t), theme)
        for (const demo of batch) {
          const page = await context.newPage()
          try {
            await page.goto(`/demos/preview/${demo}`, {
              waitUntil: "domcontentloaded",
            })
            await page.waitForTimeout(400)

            await expectNoBlockingViolations(page, `${demo} [${theme}]`)
          } finally {
            await page.close()
          }
        }
      })
    }
  }
})

test.describe("guide and benchmark docs — accessibility", () => {
  const routes = [
    ["3d-extras", "/docs/3d-extras"],
    ["integration-paths", "/docs/integration-paths"],
    ["benchmarks", "/docs/benchmarks"],
    ["agent-benchmarks", "/docs/agent-benchmarks"],
    ["es/index", "/es/docs"],
    ["es/3d-extras", "/es/docs/3d-extras"],
    ["es/agent-benchmarks", "/es/docs/agent-benchmarks"],
    ["es/backend", "/es/docs/backend"],
    ["es/benchmarks", "/es/docs/benchmarks"],
    ["es/cross-platform-tokens", "/es/docs/cross-platform-tokens"],
    ["es/installation", "/es/docs/installation"],
    ["es/integration-paths", "/es/docs/integration-paths"],
    ["es/llms", "/es/docs/llms"],
    ["es/theming", "/es/docs/theming"],
    ["es/components/button", "/es/docs/components/button"],
    ["es/components/card", "/es/docs/components/card"],
    ["es/components/chart", "/es/docs/components/chart"],
    ["es/components/dialog", "/es/docs/components/dialog"],
    ["es/components/form", "/es/docs/components/form"],
    ["es/components/input", "/es/docs/components/input"],
    ["es/components/textarea", "/es/docs/components/textarea"],
    ["es/components/checkbox", "/es/docs/components/checkbox"],
    ["es/components/select", "/es/docs/components/select"],
    ["es/components/switch", "/es/docs/components/switch"],
  ] as const

  for (const [label, href] of routes) {
    for (const theme of THEMES) {
      test(`${label} [${theme}]`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme)
        await page.goto(href, { waitUntil: "domcontentloaded" })

        await expectNoBlockingViolations(page)
      })
    }
  }
})

test.describe("starter launch demos — accessibility", () => {
  const routes = ["/demos", ...LAUNCH_DEMOS.map((demo) => demo.previewHref)]

  for (const route of routes) {
    for (const theme of THEMES) {
      test(`${route} [${theme}]`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme)
        await page.goto(route, { waitUntil: "domcontentloaded" })
        await page.waitForTimeout(1_800)

        await expectNoBlockingViolations(page)
      })
    }
  }
})

test.describe("component prop playgrounds — accessibility", () => {
  for (const name of PLAYGROUND_NAMES) {
    for (const theme of THEMES) {
      test(`${name} [${theme}]`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme)
        await page.goto(`/playgrounds/preview/${name}`, {
          waitUntil: "domcontentloaded",
        })
        await page.locator(`[data-playground-ready="${name}"]`).waitFor()

        await expectNoBlockingViolations(page)
      })
    }
  }
})

// The API reference is generated from source and shared by every component
// page. Exercise the main output shapes: owned props, hooks/aliases, exported
// types and the largest multi-part contract.
test.describe("generated API reference — accessibility", () => {
  for (const component of ["button", "form", "chart", "sidebar"]) {
    for (const theme of THEMES) {
      test(`${component} [${theme}]`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme)
        await page.goto(`/docs/components/${component}`, {
          waitUntil: "domcontentloaded",
        })

        await expectNoBlockingViolations(page)
      })
    }
  }
})
