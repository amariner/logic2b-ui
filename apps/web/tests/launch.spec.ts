import { expect, test } from "@playwright/test";

import {
  INTEGRATION_CAPABILITIES,
  INTEGRATION_PATHS,
} from "../src/data/integration-paths";
import { LAUNCH_DEMOS } from "../src/data/launch-demos";

test.describe("integration path launch page", () => {
  test("renders the complete typed comparison", async ({ page }) => {
    await page.goto("/docs/integration-paths", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: "Compare Integration Paths" }),
    ).toBeVisible();
    await expect(page.getByRole("columnheader")).toHaveCount(
      INTEGRATION_PATHS.length + 1,
    );
    await expect(page.getByRole("rowheader")).toHaveCount(
      INTEGRATION_CAPABILITIES.length,
    );

    const matrix = page.getByRole("region", {
      name: "Integration capability comparison",
    });
    await matrix.focus();
    await expect(matrix).toBeFocused();
  });

  test("serves the same matrix to agents as Markdown", async ({ request }) => {
    const response = await request.get("/docs/integration-paths.md");
    expect(response.ok()).toBe(true);
    const markdown = await response.text();

    for (const path of INTEGRATION_PATHS) expect(markdown).toContain(path.name);
    for (const capability of INTEGRATION_CAPABILITIES) {
      expect(markdown).toContain(capability.label);
    }
    expect(markdown).not.toContain("<IntegrationPaths");
  });

  test("links every integration path to a shipped surface", async ({ request }) => {
    const targets = [...new Set(INTEGRATION_PATHS.map((path) => path.href))];
    for (const target of targets) {
      const response = await request.get(target);
      expect(response.ok(), `${target} returned ${response.status()}`).toBe(true);
    }
  });
});

test.describe("starter launch demos", () => {
  test("renders every canonical starter with a live preview and command", async ({
    page,
  }) => {
    await page.goto("/demos", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Start from a real product surface",
      }),
    ).toBeVisible();
    await expect(page.locator("article")).toHaveCount(LAUNCH_DEMOS.length);
    await expect(page.locator("iframe")).toHaveCount(LAUNCH_DEMOS.length);

    for (const demo of LAUNCH_DEMOS) {
      await expect(
        page.getByRole("link", {
          name: `Open ${demo.title} live demo`,
        }),
      ).toHaveAttribute("href", demo.previewHref);
      await expect(page.getByText(demo.command, { exact: true })).toBeVisible();
    }

    const copy = page.getByRole("button", {
      name: `Copy ${LAUNCH_DEMOS[0].title} creation command`,
    });
    await copy.click();
    await expect(copy).toHaveText("Copied");
  });

  test("keeps the gallery inside a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demos", { waitUntil: "domcontentloaded" });

    await expect(page.locator("article")).toHaveCount(LAUNCH_DEMOS.length);
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasPageOverflow).toBe(false);

    const commandRegion = page.getByRole("region", {
      name: `${LAUNCH_DEMOS[1].title} creation command`,
    });
    await commandRegion.focus();
    await expect(commandRegion).toBeFocused();
  });

  test("serves the typed catalog as machine-readable JSON", async ({ request }) => {
    const response = await request.get("/demos/index.json");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/json");

    const payload = await response.json();
    expect(payload.schemaVersion).toBe(1);
    expect(payload.demos).toHaveLength(LAUNCH_DEMOS.length);
    expect(payload.demos.map((demo: { name: string }) => demo.name)).toEqual(
      LAUNCH_DEMOS.map((demo) => demo.name),
    );
    expect(JSON.stringify(payload)).not.toContain("accent");
  });

  for (const demo of LAUNCH_DEMOS) {
    test(`${demo.name} renders its hydrated starter`, async ({ page }) => {
      await page.goto(demo.previewHref, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(`^${demo.title}`));
      // Astro removes `ssr` only after the client:load island has hydrated.
      // This keeps the gate from passing on server-rendered markup alone.
      await expect(page.locator("astro-island")).not.toHaveAttribute("ssr", "");
    });
  }
});
