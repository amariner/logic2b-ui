import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { after, before, describe, test } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import type { Attempt, Protocol } from "../scripts/evaluation-v2.mts"

const benchmarkRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const cliPath = join(benchmarkRoot, "scripts/report-v2.mts")
const execute = promisify(execFile)
const protocol = JSON.parse(await readFile(join(benchmarkRoot, "v2/protocol.json"), "utf8")) as Protocol
const digest = (content: string) => `sha256-${createHash("sha256").update(content).digest("hex")}`
const evidence = JSON.stringify({ source: "CLI regression evaluator fixture" })
let temporaryRoot: string

before(async () => {
  temporaryRoot = await mkdtemp(join(await realpath(tmpdir()), "logic2b-report-v2-cli-"))
})

after(async () => {
  await rm(temporaryRoot, { recursive: true, force: true })
})

async function command(args: string[], script = cliPath) {
  try {
    const result = await execute(process.execPath, ["--import", "tsx", script, ...args], {
      cwd: benchmarkRoot,
      timeout: 15_000,
      maxBuffer: 1_000_000,
    })
    return { success: true, ...result }
  } catch (error) {
    const result = error as Error & { stdout: string; stderr: string; killed?: boolean }
    assert.notEqual(result.killed, true, "Evidence CLI must terminate without reaching its timeout")
    return { success: false, stdout: result.stdout, stderr: result.stderr }
  }
}

async function directory(label: string) {
  return mkdtemp(join(temporaryRoot, `${label}-`))
}

function attempt(attemptId = "accepted-attempt"): Attempt {
  const task = protocol.tasks.find((candidate) => candidate.id === "customer-journey")!
  return {
    schemaVersion: 2,
    protocolVersion: protocol.version,
    attemptId,
    classification: "real",
    conditionId: "baseline",
    taskId: task.id,
    repetition: 1,
    order: 1,
    cohortId: "cli-fixture-cohort",
    workspace: { id: `workspace-${attemptId}`, fresh: true },
    fixture: { id: task.fixtureId, sha256: digest("initial CLI consumer fixture") },
    versions: { registry: "1.0.0", cli: "1.0.0-rc.3", mcp: "1.0.0-rc.3", toolSchema: "cli-fixture-schema" },
    host: { name: "fixture-host", version: "1" },
    model: { name: "fixture-model", version: "fixture-alias", versionKind: "alias" },
    environment: { os: "fixture-os", node: "24.7.0" },
    capabilities: { network: false, shell: true, mcp: true, tools: [] },
    budget: { elapsedMs: 900_000, toolCalls: 120, inputBytes: 2_097_152, outputBytes: 2_097_152, tokens: "unavailable" },
    status: "completed",
    assistance: "autonomous",
    metrics: { elapsedMs: 1_000, toolCalls: 3, inputBytes: 100, outputBytes: 200, tokens: "unavailable" },
    humanCorrections: { count: 0 },
    checks: task.checks.map((check) => ({ id: check.id, status: "passed", artifactIds: ["acceptance"], observer: "independent" })),
    artifacts: [{ id: "acceptance", path: "artifacts/acceptance.json", sha256: digest(evidence), bytes: Buffer.byteLength(evidence) }],
  }
}

async function writeAttempt(runsDir: string, name: string, metadata: Attempt) {
  const path = join(runsDir, name)
  await mkdir(join(path, "artifacts"), { recursive: true })
  await writeFile(join(path, "attempt.json"), JSON.stringify(metadata))
  await writeFile(join(path, "artifacts/acceptance.json"), evidence)
  return path
}

describe("outcome v2 report CLI", () => {
  test("generates a complete deterministic plan without writing evidence or results", async () => {
    const first = await command(["--plan"])
    assert.equal(first.success, true, first.stderr)
    const schedule = JSON.parse(first.stdout)
    assert.equal(schedule.schemaVersion, 2)
    assert.equal(schedule.protocolVersion, protocol.version)
    assert.equal(schedule.seed, 20261003)
    assert.equal(schedule.entries.length, 100)
    assert.equal(schedule.entries.filter((entry: { availability: string }) => entry.availability === "planned").length, 50)
    assert.equal(new Set(schedule.entries.map((entry: { conditionId: string; taskId: string; repetition: number }) => `${entry.conditionId}/${entry.taskId}/${entry.repetition}`)).size, 100)
    assert.deepEqual(schedule.entries.map((entry: { order: number }) => entry.order), Array.from({ length: 100 }, (_, index) => index + 1))
    const replay = await command(["--plan", "20261003", "5"])
    assert.equal(replay.success, true, replay.stderr)
    assert.deepEqual(JSON.parse(replay.stdout), schedule)
  })

  test("rejects invalid pilot plan parameters before producing a schedule", async () => {
    for (const args of [["--plan", "42", "4"], ["--plan", "invalid", "5"], ["--plan", "42", "5", "extra"]]) {
      const result = await command(args)
      assert.equal(result.success, false)
      assert.equal(result.stdout, "")
    }
  })

  test("uses pending defaults when no evidence root exists, in an isolated CLI installation", async () => {
    const isolated = await directory("default-installation")
    await mkdir(join(isolated, "scripts"))
    await mkdir(join(isolated, "v2"))
    for (const name of ["report-v2.mts", "evaluation-v2.mts"]) {
      await copyFile(join(benchmarkRoot, "scripts", name), join(isolated, "scripts", name))
    }
    await copyFile(join(benchmarkRoot, "v2/protocol.json"), join(isolated, "v2/protocol.json"))
    const result = await command([], join(isolated, "scripts/report-v2.mts"))
    assert.equal(result.success, true, result.stderr)
    const report = JSON.parse(await readFile(join(isolated, "v2/results/report.json"), "utf8"))
    assert.equal(report.status, "pending")
    assert.equal(report.assignmentCoverage, "unverified")
    assert.deepEqual(report.attempts, [])
    assert.deepEqual(report.groups, [])
    assert.match(await readFile(join(isolated, "v2/results/report.md"), "utf8"), /No real v2 attempts/)
    assert.deepEqual((await readdir(join(isolated, "v2"))).sort(), ["protocol.json", "results"])
  })

  test("writes pending JSON and Markdown for an explicit empty evidence root", async () => {
    const runsDir = await directory("empty-runs")
    const outputDir = join(await directory("empty-output"), "new-results")
    const result = await command([runsDir, outputDir])
    assert.equal(result.success, true, result.stderr)
    assert.match(result.stdout, /pending; 0 real attempts; 0 synthetic attempts excluded/)
    const report = JSON.parse(await readFile(join(outputDir, "report.json"), "utf8"))
    assert.equal(report.status, "pending")
    assert.equal(report.assignmentCoverage, "unverified")
    assert.equal(report.excludedSynthetic, 0)
    assert.deepEqual(report.attempts, [])
    assert.match(await readFile(join(outputDir, "report.md"), "utf8"), /Comparative measurements are pending/)
    assert.deepEqual((await readdir(outputDir)).sort(), ["report.json", "report.md"])
  })

  test("preserves historical bytes and rejects direct or descendant v1 output directories", async () => {
    const runsDir = await directory("protected-output-runs")
    const historical = [join(benchmarkRoot, "results/leaderboard.json"), join(benchmarkRoot, "runs/README.md")]
    const before = await Promise.all(historical.map((path) => readFile(path)))
    for (const path of [join(benchmarkRoot, "results"), join(benchmarkRoot, "runs"), join(benchmarkRoot, "results/never-created-cli-test")]) {
      const result = await command([runsDir, path])
      assert.equal(result.success, false)
      assert.match(result.stderr, /archived v1/)
    }
    const after = await Promise.all(historical.map((path) => readFile(path)))
    assert.deepEqual(after, before)
    assert.equal((await readdir(join(benchmarkRoot, "results"))).includes("never-created-cli-test"), false)
  })

  test("does not omit malformed records or overwrite an existing report after evaluating valid evidence", async () => {
    const runsDir = await directory("malformed-runs")
    const outputDir = await directory("preserved-report")
    await writeAttempt(runsDir, "a-valid", attempt())
    const invalid = attempt("invalid-attempt")
    const privatePath = "/Users/private-person/private-repository/secret-source.tsx"
    invalid.artifacts[0]!.path = privatePath
    await writeAttempt(runsDir, "z-invalid", invalid)
    await writeFile(join(outputDir, "report.json"), "original JSON report")
    await writeFile(join(outputDir, "report.md"), "original Markdown report")
    const result = await command([runsDir, outputDir])
    assert.equal(result.success, false)
    assert.match(result.stderr, /Attempt z-invalid has invalid metadata/)
    assert.equal(`${result.stdout}${result.stderr}`.includes(privatePath), false)
    assert.equal(await readFile(join(outputDir, "report.json"), "utf8"), "original JSON report")
    assert.equal(await readFile(join(outputDir, "report.md"), "utf8"), "original Markdown report")
    assert.deepEqual((await readdir(outputDir)).sort(), ["report.json", "report.md"])
  })

  test("sanitizes malformed attempt JSON without exposing source excerpts", async () => {
    const runsDir = await directory("invalid-json-runs")
    const outputDir = join(temporaryRoot, "invalid-json-output")
    const path = join(runsDir, "invalid-json")
    await mkdir(path)
    const privatePath = "/Users/private-person/secret-source.tsx"
    await writeFile(join(path, "attempt.json"), `{"privatePath":"${privatePath}" broken`)
    const result = await command([runsDir, outputDir])
    assert.equal(result.success, false)
    assert.match(result.stderr, /invalid metadata/)
    assert.equal(`${result.stdout}${result.stderr}`.includes(privatePath), false)
    assert.equal((await readdir(temporaryRoot)).includes("invalid-json-output"), false)
  })

  test("retains real observations without a cohort as unverified and never pilot-ready", async () => {
    const runsDir = await directory("unverified-runs")
    const outputDir = await directory("unverified-output")
    await writeAttempt(runsDir, "accepted", attempt())
    const result = await command([runsDir, outputDir])
    assert.equal(result.success, true, result.stderr)
    const report = JSON.parse(await readFile(join(outputDir, "report.json"), "utf8"))
    assert.equal(report.assignmentCoverage, "unverified")
    assert.equal(report.status, "insufficient-evidence")
    assert.equal(report.attempts.length, 1)
    assert.equal(report.attempts[0].success, true)
    assert.deepEqual(report.coverage, [])
    assert.match(await readFile(join(outputDir, "report.md"), "utf8"), /Without a frozen cohort manifest/)
  })

  test("excludes synthetic observations from published measurements", async () => {
    const runsDir = await directory("synthetic-runs")
    const outputDir = await directory("synthetic-output")
    await writeAttempt(runsDir, "synthetic", { ...attempt(), classification: "synthetic" })
    const result = await command([runsDir, outputDir])
    assert.equal(result.success, true, result.stderr)
    const report = JSON.parse(await readFile(join(outputDir, "report.json"), "utf8"))
    assert.equal(report.status, "pending")
    assert.equal(report.excludedSynthetic, 1)
    assert.deepEqual(report.attempts, [])
    assert.deepEqual(report.groups, [])
  })

  test("rejects symlinked output ancestors before creating redirected directories", async () => {
    if (process.platform === "win32") return
    const runsDir = await directory("symlink-output-runs")
    const container = await directory("symlink-output-container")
    const outside = await directory("symlink-output-target")
    await symlink(outside, join(container, "alias"), "dir")
    const result = await command([runsDir, join(container, "alias/new-results")])
    assert.equal(result.success, false)
    assert.match(result.stderr, /symlink/)
    assert.deepEqual(await readdir(outside), [])
  })

  test("sanitizes malformed cohort JSON before writing output", async () => {
    const runsDir = await directory("invalid-cohort-runs")
    const outputDir = join(temporaryRoot, "invalid-cohort-output")
    const privatePath = "/Users/private-person/private-evaluator.ts"
    await writeFile(join(runsDir, "cohorts.json"), `[{"privatePath":"${privatePath}" broken`)
    const result = await command([runsDir, outputDir])
    assert.equal(result.success, false)
    assert.equal(`${result.stdout}${result.stderr}`.includes(privatePath), false)
    assert.equal((await readdir(temporaryRoot)).includes("invalid-cohort-output"), false)
  })
})
