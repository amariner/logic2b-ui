import { expect, test } from "@playwright/test"

import { PLAYGROUND_NAMES } from "../src/data/playground-recipes"

test.describe("component prop playgrounds", () => {
  for (const name of PLAYGROUND_NAMES) {
    test(`${name} loads its real registry export`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(`/playgrounds/preview/${name}`, {
        waitUntil: "domcontentloaded",
      })

      await expect(page.locator(`[data-playground-ready="${name}"]`)).toBeVisible()
      await expect(page.getByRole("button", { name: "Reset props" })).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test("button props update both preview and generated JSX", async ({ page }) => {
    await page.goto("/playgrounds/preview/button")
    await page.getByLabel("Variant").selectOption("outline")
    await page.getByLabel("Size").selectOption("lg")

    const preview = page.locator('[data-playground-ready="button"]')
    await expect(preview.getByRole("button", { name: "Continue" })).toHaveClass(
      /border/,
    )
    const source = page.getByRole("region", { name: "Button generated JSX" })
    await expect(source).toContainText('variant="outline"')
    await expect(source).toContainText('size="lg"')
  })

  test("direct alert recipe keeps its content column usable", async ({ page }) => {
    await page.goto("/playgrounds/preview/alert")

    await expect(page.getByRole("alert")).toHaveClass(/grid-cols-1/)
    await expect(
      page.getByRole("region", { name: "Alert generated JSX" }),
    ).toContainText('className="grid-cols-1"')
  })

  test("numeric and array props stay executable", async ({ page }) => {
    await page.goto("/playgrounds/preview/slider")
    await page.getByLabel("Value").fill("75")

    await expect(page.getByRole("slider", { name: "Volume" })).toHaveAttribute(
      "aria-valuenow",
      "75",
    )
    await expect(
      page.getByRole("region", { name: "Slider generated JSX" }),
    ).toContainText("defaultValue={[75]}")
  })

  test("native select options and copy action work", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:4318",
    })
    await page.goto("/playgrounds/preview/native-select")
    await page.getByLabel("Value").selectOption("enterprise")
    await expect(page.getByLabel("Workspace plan")).toHaveValue("enterprise")

    const copy = page.getByRole("button", {
      name: "Copy NativeSelect generated JSX",
    })
    await copy.click()
    await expect(copy).toHaveText("Copied")
  })

  test("multiline code edits reach the rendered component", async ({ page }) => {
    await page.goto("/playgrounds/preview/code-block")
    await page.getByRole("textbox", { name: "Code", exact: true }).fill(
      "let answer = 42",
    )

    await expect(page.locator('[data-playground-ready="code-block"]')).toContainText(
      "let answer = 42",
    )
    await expect(
      page.getByRole("region", { name: "CodeBlock generated JSX" }),
    ).toContainText('code="let answer = 42"')
  })

  test("accordion control remounts the composed root and updates nested JSX", async ({
    page,
  }) => {
    await page.goto("/playgrounds/preview/accordion")
    await page.getByLabel("Open item").selectOption("item-2")

    await expect(
      page.locator('[data-slot="accordion-content"][data-state="open"]'),
    ).toContainText("Yes. Components are copied")
    await expect(
      page.getByRole("region", { name: "Accordion generated JSX" }),
    ).toContainText("<AccordionTrigger>Can I own the source?</AccordionTrigger>")
  })

  test("tabs bind root state while preserving the complete composition", async ({
    page,
  }) => {
    await page.goto("/playgrounds/preview/tabs")
    await page.getByLabel("Active tab").selectOption("activity")

    await expect(
      page.getByRole("tabpanel", { name: "Activity" }),
    ).toContainText("The latest quality gates are green.")
    const source = page.getByRole("region", { name: "Tabs generated JSX" })
    await expect(source).toContainText('defaultValue="activity"')
    await expect(source).toContainText("<TabsContent")
  })

  test("descendant bindings update input-group props without leaking to the root", async ({
    page,
  }) => {
    await page.goto("/playgrounds/preview/input-group")
    await page.getByLabel("Placeholder").fill("Annual budget")
    await page.getByLabel("Disabled").check()

    const input = page.getByRole("textbox", { name: "Amount" })
    await expect(input).toHaveAttribute("placeholder", "Annual budget")
    await expect(input).toBeDisabled()
    await expect(page.locator('[data-slot="input-group"]')).not.toHaveAttribute(
      "placeholder",
    )
  })

  test("radio-group selection stays executable through a composed label tree", async ({
    page,
  }) => {
    await page.goto("/playgrounds/preview/radio-group")
    await page.getByLabel("Selected plan").selectOption("enterprise")

    await expect(page.getByRole("radio", { name: "Enterprise" })).toBeChecked()
    await expect(
      page.getByRole("region", { name: "RadioGroup generated JSX" }),
    ).toContainText('defaultValue="enterprise"')
  })

  test("input-otp remounts its slot composition from the edited code", async ({
    page,
  }) => {
    await page.goto("/playgrounds/preview/input-otp")
    await page.getByLabel("Code", { exact: true }).fill("135790")

    await expect(page.locator('[data-slot="input-otp-group"]').first()).toContainText(
      "135",
    )
    await expect(
      page.getByRole("region", { name: "InputOTP generated JSX" }),
    ).toContainText('defaultValue="135790"')
  })

  test("native descendants can share a state binding with their composed root", async ({
    page,
  }) => {
    await page.goto("/playgrounds/preview/label")
    await page.getByLabel("Target id").fill("project-name")

    await expect(page.locator('[data-slot="label"]')).toHaveAttribute(
      "for",
      "project-name",
    )
    await expect(page.getByRole("textbox", { name: "Workspace" })).toHaveAttribute(
      "id",
      "project-name",
    )
  })

  test("structured array props render and generate executable JSX", async ({ page }) => {
    await page.goto("/playgrounds/preview/autocomplete")

    const input = page.getByRole("combobox", { name: "Component search" })
    await input.fill("tab")
    await expect(page.getByRole("option", { name: "Tabs" })).toBeVisible()
    await expect(
      page.getByRole("region", { name: "Autocomplete generated JSX" }),
    ).toContainText('options={["Accordion", "Button", "Dialog", "Tabs", "Tooltip"]}')
  })

  test("compound navigation and stepper recipes remain interactive", async ({ page }) => {
    await page.goto("/playgrounds/preview/navigation-menu")
    const navigationTrigger = page.getByRole("button", { name: "Platform" })
    await navigationTrigger.hover()
    await navigationTrigger.click()
    await expect(navigationTrigger).toHaveAttribute("data-state", "open")
    await expect(page.getByRole("link", { name: "Registry" })).toBeVisible()

    await page.goto("/playgrounds/preview/stepper")
    await page.getByRole("button", { name: "3 Release" }).click()
    await expect(page.locator('[data-slot="stepper-item"][aria-current="step"]')).toContainText(
      "Release",
    )
  })

  for (const overlay of [
    { name: "alert-dialog", trigger: "Delete release" },
    { name: "dialog", trigger: "Edit project" },
    { name: "drawer", trigger: "Open release drawer" },
    { name: "sheet", trigger: "Open settings" },
    { name: "popover", trigger: "Release details" },
  ] as const) {
    test(`${overlay.name} opens its portal from the real trigger`, async ({ page }) => {
      await page.goto(`/playgrounds/preview/${overlay.name}`)
      await page.getByRole("button", { name: overlay.trigger }).click()
      await expect(page.locator(`[data-slot="${overlay.name}-content"]`)).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(page.locator(`[data-slot="${overlay.name}-content"]`)).toBeHidden()
    })
  }

  test("hover-card and tooltip expose their delayed portal content", async ({ page }) => {
    await page.goto("/playgrounds/preview/hover-card")
    await page.getByRole("link", { name: "@logic2b" }).hover()
    await expect(page.locator('[data-slot="hover-card-content"]')).toBeVisible()

    await page.goto("/playgrounds/preview/tooltip")
    await page.getByRole("button", { name: "Registry status" }).hover()
    await expect(page.getByRole("tooltip")).toContainText("All quality gates pass")
  })

  test("select opens its portal and commits a new value", async ({ page }) => {
    await page.goto("/playgrounds/preview/select")
    const select = page.getByRole("combobox", { name: "Workspace plan" })
    await select.click()
    await page.getByRole("option", { name: "Enterprise" }).click()
    await expect(select).toContainText("Enterprise")
  })

  test("command filters its composed item collection", async ({ page }) => {
    await page.goto("/playgrounds/preview/command")
    const search = page.getByRole("combobox", { name: "Search commands" })
    await search.click()
    await search.pressSequentially("tooltip")
    const visibleItems = page.locator('[data-slot="command-item"]:visible')
    await expect(visibleItems).toHaveCount(1)
    await expect(visibleItems).toContainText("Tooltip")
  })

  test("context and dropdown menus open their real portal content", async ({ page }) => {
    await page.goto("/playgrounds/preview/context-menu")
    await page.locator('[data-slot="context-menu-trigger"]').click({ button: "right" })
    await expect(page.locator('[data-slot="context-menu-content"]')).toBeVisible()
    await page.keyboard.press("Escape")

    await page.goto("/playgrounds/preview/dropdown-menu")
    await page.getByRole("button", { name: "Project actions" }).click()
    await expect(page.locator('[data-slot="dropdown-menu-content"]')).toBeVisible()
  })

  test("menubar, carousel and sidebar preserve compound behavior", async ({ page }) => {
    await page.goto("/playgrounds/preview/menubar")
    await page.getByRole("menuitem", { name: "Project" }).click()
    await expect(page.getByRole("menuitem", { name: "New project" })).toBeVisible()

    await page.goto("/playgrounds/preview/carousel")
    await page.getByRole("button", { name: "Next slide" }).click()
    await expect(page.getByRole("button", { name: "Previous slide" })).toBeEnabled()

    await page.goto("/playgrounds/preview/sidebar")
    await expect(page.getByRole("button", { name: "Registry" })).toHaveAttribute(
      "data-active",
      "true",
    )
    await page.getByRole("button", { name: "Toggle Sidebar" }).click()
    await expect(page.locator('[data-slot="sidebar-wrapper"]')).toBeVisible()
  })

  test("file dropzone forwards its native file constraints", async ({ page }) => {
    await page.goto("/playgrounds/preview/file-dropzone")
    const input = page.getByLabel("Upload project images")
    await expect(input).toHaveAttribute("accept", "image/*")
    await expect(input).toHaveAttribute("multiple", "")
    await page.getByLabel("Disabled").check()
    await expect(input).toBeDisabled()
  })

  test("calendar materializes stable local dates and emits executable JSX", async ({ page }) => {
    await page.goto("/playgrounds/preview/calendar")
    await expect(page.getByText("August 2026", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /Saturday, August 15th, 2026/ })).toHaveAttribute(
      "data-selected-single",
      "true",
    )
    await expect(
      page.getByRole("region", { name: "Calendar generated JSX" }),
    ).toContainText("selected={new Date(2026, 7, 15)}")
  })

  test("chart resolves its lazy Recharts composition and structured data", async ({ page }) => {
    await page.goto("/playgrounds/preview/chart")

    await expect(page.locator('[data-slot="chart"] svg')).toBeVisible()
    await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(6)
    await page.getByLabel("Chart size").selectOption("h-72 w-full max-w-xl")
    await expect(page.locator('[data-slot="chart"]')).toHaveClass(/h-72/)
    await expect(
      page.getByRole("region", { name: "ChartContainer generated JSX" }),
    ).toContainText('dataKey="visitors"')
  })

  test("sonner action emits a real toast and keeps generated JSX synchronized", async ({ page }) => {
    await page.goto("/playgrounds/preview/sonner")
    await page.getByLabel("Position").selectOption("bottom-right")
    await page.getByRole("button", { name: "Publish release" }).click()

    await expect(
      page.locator("[data-sonner-toast]").getByText("Release published successfully", {
        exact: true,
      }),
    ).toBeVisible()
    const source = page.getByRole("region", { name: "Toaster generated JSX" })
    await expect(source).toContainText('position="bottom-right"')
    await expect(source).toContainText('onClick={() => toast("Release published successfully")}')
  })

  test("form adapter validates, submits and updates generated JSX", async ({ page }) => {
    await page.goto("/playgrounds/preview/form")
    await page.getByLabel("Placeholder").fill("team-handle")

    const username = page.getByRole("textbox", { name: "Username" })
    await expect(username).toHaveAttribute("placeholder", "team-handle")
    await page.getByRole("button", { name: "Save profile" }).click()
    await expect(page.getByText("Username is required.", { exact: true })).toBeVisible()

    await username.fill("andreu")
    await page.getByRole("button", { name: "Save profile" }).click()
    await expect(page.getByRole("status")).toHaveText("Saved andreu.")
    await expect(
      page.getByRole("region", { name: "Form generated JSX" }),
    ).toContainText('placeholder={"team-handle"}')
  })

  test("compatible docs mount the playground lazily and expose its TOC entry", async ({
    page,
  }) => {
    await page.goto("/docs/components/button")

    const tocLink = page.getByRole("link", { name: "Live playground" })
    await expect(tocLink).toBeVisible()
    await tocLink.click()
    await expect(page.locator('[data-playground-ready="button"]')).toBeVisible()
  })

  test("docs without a recipe do not advertise an unavailable playground", async ({
    page,
  }) => {
    await page.goto("/docs/components/typography")

    await expect(
      page.getByRole("heading", { name: "Live playground" }),
    ).toHaveCount(0)
    await expect(page.locator("[data-playground-ready]")).toHaveCount(0)
  })
})
