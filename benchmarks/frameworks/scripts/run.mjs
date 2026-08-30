import { spawn } from "node:child_process"
import { gzipSync } from "node:zlib"
import { cpus, platform, release } from "node:os"
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "@playwright/test"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const runs = Number(process.env.BENCHMARK_RUNS ?? 5)
const targets = [
  { name: "Next.js", dir: "next", port: 4401, output: ".next/static" },
  { name: "Vite", dir: "vite", port: 4402, output: "dist" },
  { name: "Astro", dir: "astro", port: 4403, output: "dist" },
  { name: "TanStack Start", dir: "tanstack", port: 4404, output: "dist/client" },
]

function command(args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(args[0], args.slice(1), {
      cwd: root,
      env: { ...process.env, ...options.env },
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    })
    let output = ""
    child.stdout?.on("data", (chunk) => (output += chunk))
    child.stderr?.on("data", (chunk) => (output += chunk))
    child.on("error", reject)
    child.on("exit", (code) =>
      code === 0
        ? resolvePromise({ child, output })
        : reject(new Error(`${args.join(" ")} exited ${code}\n${output}`))
    )
    if (options.returnChild) resolvePromise(child)
  })
}

async function filesIn(dir) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await filesIn(path)))
    else files.push(path)
  }
  return files
}

async function assetSizes(dir) {
  const files = (await filesIn(dir)).filter((path) => /\.(js|css)$/.test(path))
  let raw = 0
  let gzip = 0
  for (const path of files) {
    const bytes = await readFile(path)
    raw += bytes.byteLength
    gzip += gzipSync(bytes).byteLength
  }
  return { files: files.length, raw, gzip }
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
const round = (value) => Math.round(value * 10) / 10
const kib = (bytes) => round(bytes / 1024)

async function waitForServer(url) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150))
  }
  throw new Error(`Server did not become ready: ${url}`)
}

async function measure(browser, target) {
  const url = `http://127.0.0.1:${target.port}/`
  const samples = []
  for (let index = 0; index < runs; index++) {
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 1280, height: 720 },
    })
    await context.addInitScript(() => {
      window.__logic2bLcp = 0
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        if (last) window.__logic2bLcp = last.startTime
      }).observe({ type: "largest-contentful-paint", buffered: true })
    })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send("Network.enable")
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true })
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200_000,
      uploadThroughput: 93_750,
      connectionType: "cellular3g",
    })
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
    await page.goto(url, { waitUntil: "networkidle" })
    await page.waitForFunction(() => typeof window.__logic2bHydrated === "number")
    await page.waitForTimeout(1_500)
    samples.push(
      await page.evaluate(() => {
        const resources = performance.getEntriesByType("resource")
        // TanStack Start's module loader reports its JS requests as `other`,
        // while the other fixtures report `script`. Classify by URL so the
        // same bytes are counted regardless of loader implementation.
        const scripts = resources.filter((entry) =>
          new URL(entry.name).pathname.endsWith(".js")
        )
        const nav = performance.getEntriesByType("navigation")[0]
        return {
          hydrationReady: window.__logic2bHydrated,
          lcp: window.__logic2bLcp,
          transferredJs: scripts.reduce((sum, entry) => sum + entry.transferSize, 0),
          ttfb: nav.responseStart,
        }
      })
    )
    await context.close()
  }
  return {
    hydrationReadyMs: round(median(samples.map((sample) => sample.hydrationReady))),
    lcpMs: round(median(samples.map((sample) => sample.lcp))),
    transferredJsKiB: kib(median(samples.map((sample) => sample.transferredJs))),
    ttfbMs: round(median(samples.map((sample) => sample.ttfb))),
  }
}

await command([process.execPath, "scripts/prepare-scenario.mjs"])
const browser = await chromium.launch()
const results = []

try {
  for (const target of targets) {
    const appDir = resolve(root, "apps", target.dir)
    for (const output of ["dist", ".next", ".output"]) {
      await rm(resolve(appDir, output), { recursive: true, force: true })
    }
    const started = performance.now()
    await command(["pnpm", "--dir", `apps/${target.dir}`, "build"])
    const buildMs = performance.now() - started
    const assets = await assetSizes(resolve(appDir, target.output))
    const server = await command(
      ["pnpm", "--dir", `apps/${target.dir}`, "start", "--port", String(target.port)],
      { returnChild: true, capture: true }
    )
    try {
      await waitForServer(`http://127.0.0.1:${target.port}/`)
      results.push({
        framework: target.name,
        buildMs: round(buildMs),
        clientFiles: assets.files,
        clientRawKiB: kib(assets.raw),
        clientGzipKiB: kib(assets.gzip),
        ...(await measure(browser, target)),
      })
    } finally {
      server.kill("SIGTERM")
    }
  }
} finally {
  await browser.close()
}

const versions = {}
for (const target of targets) {
  const pkg = JSON.parse(await readFile(resolve(root, "apps", target.dir, "package.json")))
  versions[target.name] =
    pkg.dependencies.next ?? pkg.dependencies.astro ?? pkg.dependencies["@tanstack/react-start"] ?? pkg.devDependencies.vite
}

const payload = {
  generatedAt: new Date().toISOString(),
  scenario: "stats-01-animated",
  runs,
  profile: { cpuSlowdown: 4, latencyMs: 150, downloadKiBps: round(200_000 / 1024) },
  host: { platform: `${platform()} ${release()}`, cpu: cpus()[0]?.model, cores: cpus().length },
  versions,
  results,
}

await mkdir(resolve(root, "results"), { recursive: true })
await writeFile(resolve(root, "results/latest.json"), `${JSON.stringify(payload, null, 2)}\n`)

const rows = results.map((result) =>
  `| ${result.framework} | ${result.buildMs} | ${result.clientGzipKiB} | ${result.transferredJsKiB} | ${result.hydrationReadyMs} | ${result.lcpMs} | ${result.ttfbMs} |`
)
const markdown = `# Framework benchmark results

Same interactive \`stats-01-animated\` registry block, React 19.2.7 and Tailwind
4.3.2. Median of ${runs} cold browser contexts with 4× CPU slowdown, 150 ms
latency and ${round(200_000 / 1024)} KiB/s download throughput. Build size counts
production client JS + CSS; transferred JS comes from the browser Resource
Timing API. Lower is better in every numeric column.

| Framework | Build ms | Client gzip KiB | JS transferred KiB | Hydration ready ms | LCP ms | TTFB ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows.join("\n")}

Generated ${payload.generatedAt} on ${payload.host.platform}, ${payload.host.cpu}
(${payload.host.cores} logical cores). Framework versions: ${Object.entries(versions).map(([name, version]) => `${name} ${version}`).join(", ")}.

These are comparative lab results, not universal framework rankings. Re-run
\`pnpm benchmark\` on the same host before comparing changes over time; raw
data and the exact profile live in [results/latest.json](./results/latest.json).
`
await writeFile(resolve(root, "RESULTS.md"), markdown)
console.log(markdown)
