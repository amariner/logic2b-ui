import { constants, readFileSync, statSync } from "node:fs"
import { lstat, mkdir, open, realpath } from "node:fs/promises"
import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import { basename, dirname, join, resolve } from "node:path"
import type { APIResponse, Browser, BrowserContext, Locator, Page } from "playwright"
import type { expect as playwrightExpect } from "playwright/test"
import type { AxeBuilder } from "@axe-core/playwright"
import { changePath } from "@logic2b/scaffold/change-plan"
import { validateVerificationSuite, hashVerificationSuite, projectFingerprint, validateVerificationReport, summarizeVerificationReport, VERIFICATION_LIMITS, type VerificationReportV1, type VerificationSelector, type VerificationCheck, type VerificationAction, type VerificationEvidence, type VerificationStatus } from "@logic2b/scaffold/verification"
import { PACKAGE_VERSION } from "./version.ts"

interface BrowserHost {
  chromium: typeof import("playwright").chromium
  expect: typeof playwrightExpect
  AxeBuilder: typeof AxeBuilder
  versions: { name: string; version: string }[]
}
class MissingBrowserCapability extends Error {}
export interface VerifyOptions {
  cwd: string
  suite: unknown
  url: string
  output: string
  timeoutMs?: number
  budgetMs?: number
  browserExecutable?: string
  appUnavailable?: string
}
const EVIDENCE_BYTES = 4 * 1024 * 1024
const TOTAL_EVIDENCE_BYTES = 64 * 1024 * 1024
const hash = (value: Buffer | string) => createHash("sha256").update(value).digest("hex")
const clean = (value: string, limit = 400) => value.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, limit)
const bounds = (value: number, minimum: number, maximum: number, label: string) => { if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`); return value }

/** Local explicit targets only. A remote MCP never invokes this runner. */
export function verificationOrigin(raw: string): string {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error("Verification needs an HTTP(S) loopback origin.") }
  if (!["http:", "https:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Verification needs an HTTP(S) loopback origin without credentials, route, query or fragment.")
  return url.origin
}
async function readBounded(path: string, limit: number): Promise<Buffer> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > limit) throw new Error("Verification input must be a bounded, single-link regular file.")
    const bytes = Buffer.alloc(limit + 1)
    let size = 0
    while (size < bytes.length) { const part = await handle.read(bytes, size, bytes.length - size, null); if (!part.bytesRead) break; size += part.bytesRead }
    const after = await handle.stat(), current = await lstat(path)
    if (size > limit || stat.dev !== current.dev || stat.ino !== current.ino || stat.size !== after.size || stat.mtimeMs !== after.mtimeMs || stat.ctimeMs !== after.ctimeMs) throw new Error("Verification input changed or exceeded its byte limit.")
    return bytes.subarray(0, size)
  } finally { await handle.close() }
}
export async function readVerificationArtifact(path: string): Promise<unknown> {
  const bytes = await readBounded(resolve(path), VERIFICATION_LIMITS.reportBytes)
  try { return JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(bytes)) } catch { throw new Error("Verification input must contain valid UTF-8 JSON.") }
}
async function fingerprints(cwd: string, paths: string[]) {
  const root = await realpath(resolve(cwd)), rootStat = await lstat(root)
  if (!rootStat.isDirectory()) throw new Error("Verification project must be a directory.")
  const files: { path: string; sha256: string }[] = []
  let total = 0
  for (const path of paths) {
    changePath(path)
    const parts = path.split("/")
    for (let i = 1; i < parts.length; i++) {
      const stat = await lstat(join(root, ...parts.slice(0, i)))
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Verification project files must use ordinary directories.")
    }
    const bytes = await readBounded(join(root, path), VERIFICATION_LIMITS.fileBytes)
    total += bytes.length
    if (total > VERIFICATION_LIMITS.totalFileBytes) throw new Error("Verification project files exceed the total byte budget.")
    if (await realpath(join(root, path)) !== join(root, path)) throw new Error("Verification project file changed its location.")
    files.push({ path, sha256: hash(bytes) })
  }
  const after = await lstat(root)
  if (after.ino !== rootStat.ino || after.dev !== rootStat.dev || after.isSymbolicLink()) throw new Error("Verification project root changed.")
  return { scope: "selected-files" as const, fingerprint: await projectFingerprint(files), files, servedSourceBinding: "unverified" as const }
}
function loadHost(cwd: string): BrowserHost {
  const require = createRequire(join(resolve(cwd), "package.json"))
  const version = (name: string): string => {
    let directory = dirname(require.resolve(name))
    for (let i = 0; i < 8; i++) {
      try {
        const path = join(directory, "package.json")
        if (statSync(path).size > 128 * 1024) throw new Error("Tool metadata exceeds its limit.")
        const manifest = JSON.parse(readFileSync(path, "utf8"))
        if (manifest.name === name && typeof manifest.version === "string" && manifest.version.length <= 128) return manifest.version
      } catch { /* Some tools hide package.json behind their exports map. */ }
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
    throw new Error("Browser tool version metadata is unavailable.")
  }
  const playwright = require("playwright") as typeof import("playwright")
  const test = require("playwright/test") as typeof import("playwright/test")
  const axe = require("@axe-core/playwright") as { default: typeof AxeBuilder }
  if (!playwright.chromium || !test.expect || typeof axe.default !== "function") throw new Error("Missing compatible browser tools.")
  return { chromium: playwright.chromium, expect: test.expect, AxeBuilder: axe.default, versions: [
    { name: "playwright", version: version("playwright") },
    { name: "@axe-core/playwright", version: version("@axe-core/playwright") },
  ] }
}
function locator(page: Page, selector: VerificationSelector): Locator {
  if (selector.by === "role") return page.getByRole(selector.role as Parameters<Page["getByRole"]>[0], { ...(selector.name === undefined ? {} : { name: selector.name }), exact: true })
  if (selector.by === "label") return page.getByLabel(selector.value, { exact: true })
  if (selector.by === "text") return page.getByText(selector.value, { exact: true })
  return page.getByTestId(selector.value)
}
async function action(page: Page, step: VerificationAction, originalFont: number) {
  if (step.action === "text-scale") {
    await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px` }, originalFont * step.value / 100)
    return
  }
  const target = locator(page, step.target)
  if (step.action === "click") await target.click()
  else if (step.action === "fill") await target.fill(step.value)
  else if (step.action === "select") await target.selectOption(step.value)
  else await target.press(step.value)
}
async function assertion(page: Page, step: VerificationCheck, host: BrowserHost, timeout: number): Promise<{ status: VerificationStatus; reason: string; observed: unknown; kind: VerificationEvidence["kind"]; image?: Buffer }> {
  const expect = host.expect.configure({ timeout })
  if (step.assertion === "screenshot") return { status: "pass", reason: "Viewport screenshot captured; visual judgment remains unreviewed.", observed: {}, kind: "screenshot", image: await page.screenshot({ animations: "disabled", timeout }) }
  if (step.assertion === "axe") {
    const result = await new host.AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).disableRules(step.disabledRules ?? []).analyze()
    const status = result.violations.length ? "fail" : result.incomplete.length ? "unknown" : "pass"
    return { status, reason: `${result.violations.length} axe violations; ${result.incomplete.length} incomplete rules require review.`, observed: { disabledRules: step.disabledRules ?? [], testEngine: result.testEngine, violations: result.violations, incomplete: result.incomplete, passes: result.passes.map(rule => rule.id) }, kind: "axe" }
  }
  if (step.assertion === "overflow") {
    const measure = () => page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }))
    await expect.poll(async () => { const value = await measure(); return value.scrollWidth - value.width }).toBeLessThanOrEqual(0)
    return { status: "pass", reason: "No horizontal page overflow at the measured viewport.", observed: await measure(), kind: "log" }
  }
  if (!("target" in step)) throw new Error("Unsupported browser assertion.")
  const target = locator(page, step.target)
  if (step.assertion === "visible") await expect(target).toBeVisible()
  else if (step.assertion === "hidden") await expect(target).toBeHidden()
  else if (step.assertion === "enabled") await expect(target).toBeEnabled()
  else if (step.assertion === "disabled") await expect(target).toBeDisabled()
  else if (step.assertion === "focused") await expect(target).toBeFocused()
  else if (step.assertion === "text" || step.assertion === "order") await expect(target).toHaveText(step.expected)
  else if (step.assertion === "value") await expect(target).toHaveValue(step.expected)
  else if (step.assertion === "accessible-description") await expect(target).toHaveAccessibleDescription(step.expected)
  else if (step.assertion === "count") await expect(target).toHaveCount(step.expected)
  else if (step.assertion === "attribute") {
    if (step.expected === null) await expect(target).not.toHaveAttribute(step.name)
    else await expect(target).toHaveAttribute(step.name, step.expected)
  }
  return { status: "pass", reason: `Browser assertion ${step.assertion} matched.`, observed: { assertion: step.assertion, ...(step.assertion === "count" ? { count: await target.count() } : {}) }, kind: "log" }
}

/** Run a bounded declarative suite against an explicitly started local app. */
export async function verifyLocal(options: VerifyOptions) {
  const suite = validateVerificationSuite(options.suite), origin = verificationOrigin(options.url)
  if (options.appUnavailable !== undefined && (!options.appUnavailable.trim() || options.appUnavailable.length > 400 || /[\x00-\x1f\x7f]/.test(options.appUnavailable))) throw new Error("App unavailability needs a nonempty, single-line reason of at most 400 characters.")
  const timeout = bounds(options.timeoutMs ?? 5000, 50, 30_000, "Step timeout"), budget = bounds(options.budgetMs ?? 120_000, 1000, 300_000, "Suite budget")
  const project = await fingerprints(options.cwd, suite.projectFiles)
  const requestedOutput = resolve(options.output)
  const output = join(await realpath(dirname(requestedOutput)), basename(requestedOutput))
  await mkdir(output, { mode: 0o700 }) // Never replace or mix an existing evidence directory.
  await mkdir(join(output, "evidence"), { mode: 0o700 })
  const outputStat = await lstat(output), evidenceStat = await lstat(join(output, "evidence"))
  const report: VerificationReportV1 = {
    schemaVersion: 1, origin, suite, suiteSha256: await hashVerificationSuite(suite), project,
    tools: [{ name: "logic2b", version: PACKAGE_VERSION }, { name: "node", version: process.versions.node }], runs: [], checks: [], evidence: [],
    notes: ["Only selected local files contribute to the fingerprint; their relationship to the served application is unverified.", "The host started the app separately. No dependencies, app scripts or build commands were run by verification.", "Screenshots are evidence, not a human visual approval. Automated checks do not certify WCAG conformance.", "External-origin HTTP requests, all HTTP redirects, WebSockets, popups and service workers are blocked; a stable, isolated synthetic-data app is required."],
  }
  let evidenceBytes = 0
  async function file(path: string, bytes: Buffer | string) {
    const buffer = typeof bytes === "string" ? Buffer.from(bytes) : bytes
    if (buffer.length > EVIDENCE_BYTES || evidenceBytes + buffer.length > TOTAL_EVIDENCE_BYTES - (path.startsWith("evidence/") ? 2 * EVIDENCE_BYTES : 0)) throw new Error("Local verification evidence exceeded its byte budget.")
    for (const [directory, original] of [[output, outputStat], [join(output, "evidence"), evidenceStat]] as const) {
      const current = await lstat(directory)
      if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== original.dev || current.ino !== original.ino || await realpath(directory) !== directory) throw new Error("Verification output directory changed during the run.")
    }
    const handle = await open(join(output, path), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    try { await handle.writeFile(buffer); await handle.sync(); evidenceBytes += buffer.length } finally { await handle.close() }
    return hash(buffer)
  }
  async function evidence(kind: VerificationEvidence["kind"], payload: unknown, tool = "playwright", image?: Buffer) {
    if (report.evidence.length >= VERIFICATION_LIMITS.evidence) throw new Error("Local verification evidence count exceeded its limit.")
    const id = `evidence-${report.evidence.length + 1}`
    const reference = `evidence/${id}.${image ? "png" : "json"}`
    const digest = await file(reference, image ?? JSON.stringify(payload, null, 2) + "\n")
    report.evidence.push({ id, kind, reference, sha256: digest, tool })
    return id
  }
  function skipped(scenarioId: string, viewportId: string, checks: VerificationCheck[], reason: string) {
    for (const step of checks) report.checks.push({ scenarioId, viewportId, checkId: step.id, kind: "browser-measured", status: "skipped", reason, evidenceIds: [] })
  }
  let browser: Browser | undefined, host: BrowserHost | undefined
  let missing = options.appUnavailable === undefined ? undefined : `Host reported the app unavailable: ${options.appUnavailable}`
  if (!missing) {
    try { host = loadHost(options.cwd); report.tools.push(...host.versions) }
    catch { missing = "Browser capability unavailable: explicitly install compatible playwright and @axe-core/playwright in the selected application." }
  } else report.notes.push("The app-unavailable reason is a host assertion; verification did not execute or independently attest the build.")
  if (host) {
    try {
      browser = await host.chromium.launch({ headless: true, ...(options.browserExecutable ? { executablePath: options.browserExecutable } : {}), timeout: 30_000 })
      report.tools.push({ name: "chromium", version: browser.version() })
    } catch { missing = "Chromium capability unavailable: explicitly install a Playwright browser or select an existing compatible executable." }
  }
  const deadline = Date.now() + budget
  try {
    for (const scenario of suite.scenarios) for (const viewport of suite.viewports) {
      const checks = scenario.steps.filter((step): step is VerificationCheck => step.type === "check")
      if (missing || Date.now() >= deadline) {
        const reason = missing ?? "The total suite time budget was exhausted before this scenario."
        report.runs.push({ scenarioId: scenario.id, viewportId: viewport.id, status: missing ? "skipped" : "fail", reason })
        skipped(scenario.id, viewport.id, checks, reason)
        continue
      }
      let context: BrowserContext | undefined, page: Page | undefined, stepIndex = -1
      let contextDeadline: ReturnType<typeof setTimeout> | undefined
      let blocked = 0, unexpectedNavigation = false, enteredApplication = false, closing = false
      const complete = new Set<string>()
      const run = { scenarioId: scenario.id, viewportId: viewport.id, status: "pass" as VerificationStatus, reason: "Every declared action and check completed." }
      try {
        let contextExpired = false
        const contextTimeout = new Promise<never>((_, reject) => {
          contextDeadline = setTimeout(() => {
            contextExpired = true
            // A stalled newContext has no context to cancel yet. Closing its
            // browser cancels the pending creation and releases its process.
            void (context ? context.close() : browser!.close()).catch(() => {})
            reject(new Error("Suite deadline exceeded during browser initialization or execution."))
          }, Math.max(1, deadline - Date.now()))
        })
        const creating = browser!.newContext({ viewport: { width: viewport.width, height: viewport.height }, serviceWorkers: "block", acceptDownloads: false }).then(async created => {
          if (contextExpired || Date.now() >= deadline) {
            await created.close().catch(() => {})
            throw new Error("Suite deadline exceeded during browser initialization.")
          }
          return created
        })
        context = await Promise.race([creating, contextTimeout])
        if (Date.now() >= deadline) throw new Error("Suite deadline exceeded during browser initialization.")
        if (typeof context.routeWebSocket !== "function") throw new MissingBrowserCapability("The installed browser tools do not support WebSocket isolation.")
        await context.route("**/*", async route => {
          const url = new URL(route.request().url())
          if (url.origin !== origin) { blocked++; return route.abort() }
          // Playwright does not re-route redirect destinations after continue().
          // Inspect one response without following redirects, then fulfill it.
          // Every HTTP 3xx is unsupported, including same-origin redirects.
          let response: APIResponse | undefined
          try {
            const remaining = deadline - Date.now()
            if (remaining <= 0) throw new Error("Suite deadline exceeded during a request.")
            response = await route.fetch({ maxRedirects: 0, maxRetries: 0, timeout: Math.min(timeout, remaining) })
            if (response.status() >= 300 && response.status() < 400) { blocked++; await route.abort(); return }
            await route.fulfill({ response })
          } catch {
            if (!closing) blocked++
            await route.abort().catch(() => {})
          } finally { await response?.dispose().catch(() => {}) }
        })
        await context.routeWebSocket("**/*", socket => { blocked++; socket.close() })
        page = await context.newPage()
        page.on("popup", popup => { blocked++; void popup.close() })
        page.on("framenavigated", frame => {
          if (enteredApplication && frame === page!.mainFrame()) {
            try { if (new URL(frame.url()).origin !== origin) unexpectedNavigation = true }
            catch { unexpectedNavigation = true }
          }
        })
        page.setDefaultTimeout(timeout)
        const response = await page.goto(origin + scenario.route, { waitUntil: "domcontentloaded", timeout: Math.min(timeout, deadline - Date.now()) })
        if (!response?.ok() || new URL(page.url()).origin !== origin) throw new Error("The declared app route did not return a successful same-origin page.")
        enteredApplication = true
        const originalFont = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize))
        for (stepIndex = 0; stepIndex < scenario.steps.length; stepIndex++) {
          const step = scenario.steps[stepIndex], remaining = Math.min(timeout, deadline - Date.now())
          if (remaining <= 0) throw new Error("Suite deadline exceeded.")
          page.setDefaultTimeout(remaining)
          let timer: ReturnType<typeof setTimeout> | undefined
          // Only browser work participates in the race. Timed-out operations can
          // settle later, but cannot append artifacts or mutate the final report.
          let observation: Awaited<ReturnType<typeof assertion>> | undefined
          try {
            observation = await Promise.race([
              step.type === "action" ? action(page, step, originalFont).then(() => undefined) : assertion(page, step, host!, remaining),
              new Promise<never>((_, reject) => { timer = setTimeout(() => { void context?.close().catch(() => {}); reject(new Error("Browser step timed out.")) }, remaining + 250) }),
            ])
          } finally { if (timer) clearTimeout(timer) }
          if (observation && step.type === "check") {
            const id = await evidence(observation.kind, { assertion: step, status: observation.status, reason: observation.reason, observed: observation.observed }, observation.kind === "axe" ? "@axe-core/playwright" : "playwright", observation.image)
            if (Date.now() >= deadline) throw new Error("Suite deadline exceeded while storing browser evidence.")
            report.checks.push({ scenarioId: scenario.id, viewportId: viewport.id, checkId: step.id, kind: "browser-measured", status: observation.status, reason: observation.reason, evidenceIds: [id] })
            complete.add(step.id)
            if (observation.status === "fail") throw new Error("A browser check failed; inspect its local evidence.")
            if (observation.status === "unknown") { run.status = "unknown"; run.reason = "One or more browser measurements require human review." }
          }
          if (unexpectedNavigation || page.isClosed() || new URL(page.url()).origin !== origin) throw new Error("Navigation left the authorized origin.")
        }
      } catch (error) {
        if (error instanceof MissingBrowserCapability) {
          missing = `Browser capability unavailable: ${error.message}`
          run.status = "skipped"; run.reason = missing
          skipped(scenario.id, viewport.id, checks, missing)
        } else {
          run.status = "fail"; run.reason = stepIndex < 0 ? "App route unavailable or browser initialization failed." : `Browser step ${stepIndex + 1} failed or timed out; inspect local evidence.`
          const failed = scenario.steps[stepIndex]
          let id: string | undefined, imageId: string | undefined
          if (page && !page.isClosed() && Date.now() < deadline) {
            try { imageId = await evidence("screenshot", {}, "playwright", await page.screenshot({ animations: "disabled", timeout: Math.min(1500, deadline - Date.now()) })) } catch { /* Preserve the actual failure even if visual capture is unavailable. */ }
          }
          try { id = await evidence("log", { scenarioId: scenario.id, viewportId: viewport.id, phase: stepIndex < 0 ? "navigation" : "step", stepIndex, ...(imageId ? { screenshotEvidenceId: imageId } : {}), error: clean(error instanceof Error ? error.message : "Browser operation failed.", 3000) }) } catch {
            const note = "Failure evidence could not be stored within the local artifact budget."
            if (!report.notes.includes(note)) report.notes.push(note)
          }
          if (failed?.type === "check" && !complete.has(failed.id)) {
            report.checks.push({ scenarioId: scenario.id, viewportId: viewport.id, checkId: failed.id, kind: "browser-measured", status: id && !["axe", "screenshot"].includes(failed.assertion) ? "fail" : "unknown", reason: run.reason, evidenceIds: [id, imageId].filter((value): value is string => value !== undefined) })
            complete.add(failed.id)
          }
          skipped(scenario.id, viewport.id, checks.filter(check => !complete.has(check.id)), "An earlier action, route or check prevented this assertion from running.")
          Object.assign(run, stepIndex >= 0 ? { failedStep: stepIndex } : {})
        }
      } finally {
        if (contextDeadline) clearTimeout(contextDeadline)
        closing = true; await context?.close().catch(() => {})
      }
      if (blocked && run.status !== "fail") { run.status = "unknown"; run.reason = `${blocked} requests, redirects, WebSockets or popups were blocked or unavailable; this run does not prove the unrestricted app behavior.` }
      report.runs.push(run)
    }
  } finally { await browser?.close().catch(() => {}) }
  try {
    const after = await fingerprints(options.cwd, suite.projectFiles)
    if (after.fingerprint !== project.fingerprint) throw new Error("changed")
  } catch {
    for (const run of report.runs) { run.status = "fail"; run.reason = "Selected project files changed during verification; rerun against a stable application." }
    report.notes.push("The initial project fingerprint is retained; the source changed or became unreadable during verification.")
  }
  const validated = await validateVerificationReport(report)
  const summary = await summarizeVerificationReport(validated)
  await file("report.json", JSON.stringify(validated, null, 2) + "\n")
  await file("summary.json", JSON.stringify(summary, null, 2) + "\n")
  return { report: validated, summary }
}
