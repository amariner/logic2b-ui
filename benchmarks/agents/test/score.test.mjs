import assert from "node:assert/strict"
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { after, before, describe, test } from "node:test"
import { RULES } from "../../../packages/review/src/rules.ts"

import {
  leaderboard,
  scoreRun,
  validateProtocol,
  validateRun,
} from "../scripts/scorer.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const protocolPath = resolve(root, "protocol.json")
const preset =
  "bmV1dHJhbHxibHVlfHZpb2xldHx4bHxpbnRlcnxncm90ZXNrfG1vbm98ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8ZGVmYXVsdA"

let temporaryRoot
let runDir

async function file(path, content = "") {
  const target = join(runDir, "artifacts", path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content)
}

before(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), "logic2b-agent-score-"))
  runDir = join(temporaryRoot, "perfect-run")
  await mkdir(runDir, { recursive: true })
  await writeFile(
    join(runDir, "run.json"),
    JSON.stringify({
      schemaVersion: 1,
      classification: "synthetic",
      runId: "perfect-run",
      model: { name: "fixture-model", version: "1" },
      agent: { name: "fixture-agent", version: "1" },
      tasks: {
        "install-and-theme": {
          durationMs: 1000,
          toolCalls: 3,
          verification: { buildExitCode: 0 },
        },
        "compose-settings": {
          durationMs: 2000,
          toolCalls: 4,
          verification: { buildExitCode: 0 },
        },
        "scaffold-dashboard": {
          durationMs: 3000,
          toolCalls: 2,
          verification: { buildExitCode: 0 },
        },
      },
    })
  )

  const one = "01-install-and-theme"
  await file(`${one}/src/components/ui/button.tsx`, '<button data-slot="button" />')
  await file(`${one}/src/components/ui/card.tsx`, '<div data-slot="card" />')
  await file(`${one}/src/components/ui/dialog.tsx`, 'import { Dialog } from "radix-ui"')
  await file(`${one}/src/lib/utils.ts`, "export function cn() {}")
  await file(`${one}/src/styles/theme.css`, ":root {}")
  await file(
    `${one}/components.json`,
    JSON.stringify({ logic2b: { registry: "https://ui.logic2b.com", preset } })
  )
  await file(`${one}/package.json`, JSON.stringify({ dependencies: { "radix-ui": "1.6.1" } }))

  const two = "02-compose-settings"
  await file(
    `${two}/src/App.tsx`,
    [
      'import "@/components/ui/card"',
      'import "@/components/ui/tabs"',
      'import "@/components/ui/label"',
      'import "@/components/ui/input"',
      'import "@/components/ui/switch"',
      'import "@/components/ui/button"',
      'export default () => <main className="bg-background text-foreground"><label htmlFor="name" /></main>',
    ].join("\n")
  )
  await file(
    `${two}/src/styles/theme.css`,
    ":root {\n  --primary: oklch(0.546 0.245 262.881);\n  --radius: 1rem;\n}"
  )

  const three = "03-scaffold-dashboard"
  for (const path of [
    "vite.config.ts",
    "src/main.tsx",
    "src/components/starter-page.tsx",
    "src/components/dashboard-02/analytics-dashboard.tsx",
    "src/components/ui/chart.tsx",
    "src/styles/theme.css",
  ]) {
    await file(`${three}/${path}`, "// generated")
  }
  await file(
    `${three}/package.json`,
    JSON.stringify({ dependencies: { react: "19.2.7" }, devDependencies: { vite: "8.2.2" } })
  )
  await file(`${three}/components.json`, JSON.stringify({ logic2b: { preset } }))
})

after(async () => {
  await rm(temporaryRoot, { recursive: true, force: true })
})

describe("benchmark protocol", () => {
  test("is internally consistent and every task totals 100 points", async () => {
    const protocol = validateProtocol(JSON.parse(await readFile(protocolPath, "utf8")))
    assert.equal(protocol.tasks.length, 3)
    assert.deepEqual(protocol.tasks.map((task) => task.maxPoints), [100, 100, 100])
  })

  test("rejects malformed run metadata", () => {
    assert.throws(
      () => validateRun({ schemaVersion: 1, runId: "../escape", model: { name: "x" }, tasks: {} }),
      /runId/
    )
  })
})

describe("scoreRun", () => {
  test("awards a perfect score only when every artifact and observed build passes", async () => {
    const result = await scoreRun(runDir, { protocolPath })
    assert.equal(result.score, 300)
    assert.equal(result.percent, 100)
    assert.equal(result.durationMs, 6000)
    assert.ok(result.tasks.every((task) => task.rules.every((rule) => rule.passed)))
    const report = result.tasks[1].sharedReview
    assert.equal(report.affectsScore, false)
    assert.equal(report.status, "reported")
    assert.deepEqual(report.ruleIds, Object.keys(RULES))
    assert.deepEqual(report.policy, { semanticColors: true })
    assert.equal(report.labelContext, "partial")
    assert.equal(result.tasks[0].sharedReview, undefined)
    assert.equal(result.tasks[2].sharedReview, undefined)
  })

  test("reports shared findings and unknowns without changing the independent score", async () => {
    const path = join(runDir, "artifacts/02-compose-settings/src/App.tsx")
    const original = await readFile(path, "utf8")
    await writeFile(path, `${original}\nconst extra = <input style={{ color: '#ff0000' }} />\n`)
    try {
      const result = await scoreRun(runDir, { protocolPath })
      assert.equal(result.score, 300)
      assert.equal(result.tasks[1].score, 100)
      const report = result.tasks[1].sharedReview.result
      assert.ok(report.findings.some(finding => finding.rule === "L2B-TOK-001"))
      assert.ok(report.unknowns.some(unknown => unknown.rule === "L2B-A11Y-002"))
      assert.equal(report.findings.some(finding => finding.rule === "L2B-A11Y-002"), false)
      assert.equal(report.truncated, false)
    } finally {
      await writeFile(path, original)
    }
  })

  test("retains parse uncertainty without awarding or deducting points", async () => {
    const path = join(runDir, "artifacts/02-compose-settings/src/App.tsx")
    const original = await readFile(path, "utf8")
    await writeFile(path, `${original}\nconst broken = <input`)
    try {
      const result = await scoreRun(runDir, { protocolPath })
      assert.equal(result.score, 300)
      const report = result.tasks[1].sharedReview
      assert.equal(report.status, "reported")
      assert.ok(report.result.unknowns.some(unknown => unknown.rule === "parse"))
      assert.deepEqual(report.result.evaluatedRules, [])
    } finally {
      await writeFile(path, original)
    }
  })

  test("reports oversized review artifacts as unavailable while preserving protocol checks", async () => {
    const path = join(runDir, "artifacts/02-compose-settings/src/App.tsx")
    const original = await readFile(path, "utf8")
    await writeFile(path, `${original}\n/*${"x".repeat(256 * 1024)}*/`)
    try {
      const result = await scoreRun(runDir, { protocolPath })
      assert.equal(result.score, 300)
      const report = result.tasks[1].sharedReview
      assert.equal(report.status, "unavailable")
      assert.match(report.reason, /256 KiB/)
      assert.equal(report.result, undefined)
    } finally {
      await writeFile(path, original)
    }
  })

  test("does not read a symlinked composition for shared review", async () => {
    if (process.platform === "win32") return
    const path = join(runDir, "artifacts/02-compose-settings/src/App.tsx")
    const outside = join(temporaryRoot, "outside-app.tsx")
    await rename(path, outside)
    await symlink(outside, path)
    try {
      const result = await scoreRun(runDir, { protocolPath })
      const report = result.tasks[1].sharedReview
      assert.equal(report.status, "unavailable")
      assert.match(report.reason, /Symlinks are not scored/)
      assert.equal(report.result, undefined)
      assert.equal(result.tasks[1].rules.find(rule => rule.id === "app").passed, false)
    } finally {
      await rm(path, { force: true })
      await rename(outside, path)
    }
  })

  test("deducts the declared points for a failed evaluator-observed build", async () => {
    const path = join(runDir, "run.json")
    const original = await readFile(path, "utf8")
    const run = JSON.parse(original)
    run.tasks["scaffold-dashboard"].verification.buildExitCode = 1
    await writeFile(path, JSON.stringify(run))
    try {
      const result = await scoreRun(runDir, { protocolPath })
      assert.equal(result.score, 292)
      assert.equal(result.tasks[2].score, 92)
    } finally {
      await writeFile(path, original)
    }
  })

  test("rejects symlinks in intermediate artifact directories", async () => {
    if (process.platform === "win32") return
    const components = join(
      runDir,
      "artifacts/01-install-and-theme/src/components",
    )
    const outside = join(temporaryRoot, "outside-components")
    await rename(components, outside)
    await symlink(outside, components, "dir")
    try {
      const result = await scoreRun(runDir, { protocolPath })
      const button = result.tasks[0].rules.find((rule) => rule.id === "button-file")
      assert.equal(button.passed, false)
      assert.match(button.evidence, /Symlinks are not scored/)
    } finally {
      await rm(components, { force: true })
      await rename(outside, components)
    }
  })

  test("leaderboard ranks score first and duration second", async () => {
    const perfect = await scoreRun(runDir, { protocolPath })
    const realPerfect = { ...perfect, classification: "real" }
    const slower = { ...realPerfect, runId: "slow", durationMs: 9000 }
    const lower = { ...realPerfect, runId: "lower", score: 270, percent: 90, durationMs: 1000 }
    const board = leaderboard([slower, lower, realPerfect, perfect])
    assert.deepEqual(board.entries.map((entry) => entry.runId), ["perfect-run", "slow", "lower"])
  })

  test("never publishes synthetic results in the leaderboard", async () => {
    const synthetic = await scoreRun(runDir, { protocolPath })
    assert.equal(synthetic.classification, "synthetic")
    assert.deepEqual(leaderboard([synthetic]).entries, [])
  })
})
