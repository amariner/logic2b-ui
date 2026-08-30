import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4318)

// Locally we run against the container's pre-installed Chromium (its build may
// differ from the one @playwright/test bundles); in CI the matching browser is
// installed by `playwright install`, so no override is needed there.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  // Keep one baseline set across macOS development and Linux CI. The visual
  // matcher below owns the small host antialiasing tolerance.
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: executablePath ? { executablePath } : {},
    viewport: { width: 1280, height: 720 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    // A stale static server can return valid HTML while 404ing the current
    // hashed JS/CSS assets, which silently turns hydration-aware checks into
    // SSR-only checks. This port is dedicated to Playwright, so always own it.
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
