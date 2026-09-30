import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join } from "node:path"
import { chromium, expect, type Browser, type Page } from "@playwright/test"
import { AxeBuilder } from "@axe-core/playwright"

// Developer acceptance gate uses explicitly installed MCP development tools.
// No Playwright dependency is added to or installed in a generated consumer.
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const sha256 = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex")

async function serve(target: string, framework: string): Promise<{ origin: string; close: () => Promise<void> }> {
  const staticRoot = join(target, "dist")
  const server = createServer(async (request, response) => {
    try {
      const route = decodeURIComponent(new URL(request.url!, "http://localhost").pathname)
      if (route.split("/").some(part => part === ".." || part.includes("\\"))) throw new Error("unsafe test route")
      const path = extname(route) ? join(staticRoot, route) : framework === "vite" ? join(staticRoot, "index.html") : join(staticRoot, route, "index.html")
      const bytes = await readFile(path)
      const type = extname(path) === ".js" ? "text/javascript" : extname(path) === ".css" ? "text/css" : extname(path) === ".woff2" ? "font/woff2" : "text/html"
      response.setHeader("Content-Type", type); response.end(bytes)
    } catch { response.writeHead(404).end("Missing generated asset") }
  })
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  const port = (server.address() as { port: number }).port
  const closeServer = () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  if (framework !== "next") return { origin: `http://127.0.0.1:${port}`, close: closeServer }
  await closeServer()
  const child = spawn("pnpm", ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: target, stdio: "pipe", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } })
  let log = ""
  child.stdout.on("data", bytes => { log = (log + String(bytes)).slice(-4096) })
  child.stderr.on("data", bytes => { log = (log + String(bytes)).slice(-4096) })
  const origin = `http://127.0.0.1:${port}`
  const close = async () => {
    child.kill("SIGTERM")
    for (let count = 0; count < 40 && child.exitCode === null; count++) await wait(100)
    if (child.exitCode === null) child.kill("SIGKILL")
  }
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Generated Next server stopped: ${log}`)
      try { if ((await fetch(`${origin}/customers`)).ok) return { origin, close } } catch { /* Bounded startup polling. */ }
      await wait(100)
    }
    throw new Error(`Generated Next server did not start: ${log}`)
  } catch (error) { await close(); throw error }
}

async function screenshot(page: Page, path: string) {
  await page.evaluate(() => document.fonts.ready)
  const image = await page.screenshot({ path, fullPage: true, animations: "disabled" })
  return { path, sha256: sha256(image) }
}

/** Real generated production apps, independent user-level assertions. Incomplete
 * axe observations are retained; screenshot capture is not human approval. */
export async function verifyCompositionBrowsers(root: string, evidence: string): Promise<void> {
  await mkdir(evidence) // New evidence directory; never overwrite earlier runs.
  const browser: Browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, timeout: 30000 })
  const runs: unknown[] = []
  let accessibilityUnknown = false
  try {
    for (const framework of ["next", "vite", "astro"]) {
      const target = join(root, "apps", `${framework}-composition`)
      const server = await serve(target, framework)
      try {
        for (const width of [390, 1280]) {
          const context = await browser.newContext({ viewport: { width, height: 900 } })
          const page = await context.newPage()
          const id = `${framework}-${width}`
          const errors: string[] = []
          page.on("pageerror", error => errors.push(error.message))
          await page.goto(`${server.origin}/customers`)
          if (width === 390) await page.evaluate(() => document.documentElement.classList.remove("dark"))
          await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible()
          await expect(page.getByText("Alex Morgan", { exact: true })).toBeVisible()
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "generated page must fit the viewport")
          const screenshots = [await screenshot(page, join(evidence, `${id}-list.png`))]
          const listAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
          assert.deepEqual(listAxe.violations, [], `${id} list accessibility defects`)
          await page.getByRole("textbox", { name: "Search customers" }).fill("missing customer")
          await expect(page.getByText("No matching customers", { exact: true })).toBeVisible()
          await page.getByRole("button", { name: "Clear search" }).click()
          await expect(page.getByText("Alex Morgan", { exact: true })).toBeVisible()
          await page.getByLabel("List state", { exact: true }).selectOption("error")
          await expect(page.getByRole("alert").filter({ hasText: "Customers could not be loaded" })).toBeVisible()
          await page.getByRole("button", { name: "Try again" }).click()
          await expect(page.getByText("Loading customers…", { exact: true })).toBeVisible()
          await expect(page.getByText("Alex Morgan", { exact: true })).toBeVisible()
          await page.getByLabel("List state", { exact: true }).selectOption("permission-denied")
          await expect(page.getByRole("alert").filter({ hasText: "You do not have permission" })).toBeVisible()
          await expect(page.getByRole("table")).toHaveCount(0)
          await page.getByLabel("List state", { exact: true }).selectOption("idle")
          await page.getByRole("button", { name: "Empty list" }).click()
          await expect(page.getByRole("heading", { name: "No customers yet" })).toBeVisible()
          await page.getByRole("button", { name: "Reset sample" }).click()
          await page.getByRole("button", { name: "Add customer", exact: true }).click()
          await expect(page.getByRole("textbox", { name: "Full name" })).toBeFocused()
          await page.getByRole("button", { name: "Save customer", exact: true }).click()
          await expect(page.getByText("Enter a name.", { exact: true })).toBeVisible()
          await page.getByRole("textbox", { name: "Full name" }).fill("Jordan Example")
          await page.getByRole("textbox", { name: "Email address" }).fill("jordan@example.test")
          await page.getByLabel("Next save", { exact: true }).selectOption("error")
          await page.getByRole("button", { name: "Save customer", exact: true }).click()
          await expect(page.getByRole("button", { name: "Saving customer…", exact: true })).toBeDisabled()
          await expect(page.getByRole("alert").filter({ hasText: "Your changes are still here" })).toBeVisible()
          await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue("Jordan Example")
          screenshots.push(await screenshot(page, join(evidence, `${id}-error.png`)))
          const formAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
          assert.deepEqual(formAxe.violations, [], `${id} form accessibility defects`)
          await page.getByRole("button", { name: "Save customer", exact: true }).click()
          await expect(page.getByText("Customer saved.", { exact: true })).toBeVisible()
          await page.getByRole("button", { name: "Cancel", exact: true }).click()
          await expect(page.getByRole("button", { name: "Add customer", exact: true })).toBeFocused()
          await expect(page.getByText("Jordan Example", { exact: true })).toBeVisible()
          await page.getByRole("button", { name: "Edit Alex Morgan", exact: true }).click()
          await page.getByRole("textbox", { name: "Full name" }).fill("Unsaved change")
          page.once("dialog", dialog => dialog.dismiss())
          await page.getByRole("link", { name: "/new", exact: true }).click()
          await expect(page).toHaveURL(`${server.origin}/customers`)
          await page.getByRole("button", { name: "Cancel", exact: true }).click()
          await expect(page.getByRole("button", { name: "Keep editing", exact: true })).toBeFocused()
          await page.getByRole("button", { name: "Keep editing", exact: true }).click()
          await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused()
          await page.getByRole("button", { name: "Cancel", exact: true }).click()
          await page.getByRole("button", { name: "Discard changes", exact: true }).click()
          await expect(page.getByRole("button", { name: "Edit Alex Morgan", exact: true })).toBeFocused()
          await expect(page.getByText("Alex Morgan", { exact: true })).toBeVisible()
          await page.getByRole("link", { name: "/new", exact: true }).click()
          await expect(page.getByRole("textbox", { name: "Full name" })).toBeVisible()
          await expect(page.getByRole("table")).toHaveCount(0)
          assert.deepEqual(errors, [], `${id} browser source errors`)
          const observations = { list: listAxe, form: formAxe }
          accessibilityUnknown ||= listAxe.incomplete.length > 0 || formAxe.incomplete.length > 0
          const axePath = join(evidence, `${id}-axe.json`)
          await writeFile(axePath, JSON.stringify(observations, null, 2))
          runs.push({ id, framework, width, functionalStatus: "pass", accessibilityStatus: listAxe.incomplete.length || formAxe.incomplete.length ? "unknown" : "pass", incomplete: [...listAxe.incomplete, ...formAxe.incomplete].map(result => ({ id: result.id, impact: result.impact, nodes: result.nodes.length })), screenshots, axe: { path: axePath, sha256: sha256(await readFile(axePath)) } })
          await context.close()
          console.log(`✓ ${id}: search/recovery/empty/permissions/create/save retry/navigation/discard/focus and direct form route; axe has no violations`)
        }
      } finally { await server.close() }
    }
  } finally {
    await browser.close()
    await writeFile(join(evidence, "report.json"), JSON.stringify({ schemaVersion: 1, status: runs.length === 6 ? accessibilityUnknown ? "unknown" : "pass" : "incomplete", browser: "chromium", runs, limitations: ["Synthetic local callbacks do not verify a backend, persistence or server authorization.", "Axe incomplete observations stay unknown. Screenshot capture needs human judgment; no accessibility certification is inferred.", "Vite direct route assertions use an explicit history fallback; deploying requires equivalent host configuration."] }, null, 2))
  }
  console.log(`Composition browser evidence: ${evidence}`)
}
