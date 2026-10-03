import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { after, before, describe, test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  createSchedule,
  evaluateAttempt,
  generateReport,
  LIMITS,
  protocolDigest,
  validateAttempt,
  validateCohort,
  validateProtocol,
  type Attempt,
  type Cohort,
  type EvaluatedAttempt,
  type Protocol,
} from "../scripts/evaluation-v2.mts"

const benchmarkRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const rawProtocol: unknown = JSON.parse(
  await readFile(join(benchmarkRoot, "v2/protocol.json"), "utf8"),
)
const protocol = validateProtocol(rawProtocol)
const content = JSON.stringify({ fixture: "synthetic evaluator evidence" })
const digest = (value: string) => `sha256-${createHash("sha256").update(value).digest("hex")}`
let temporaryRoot: string
let sequence = 0

before(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), "logic2b-outcome-v2-tests-"))
})

after(async () => {
  await rm(temporaryRoot, { recursive: true, force: true })
})

function cloneProtocol(): Protocol {
  return structuredClone(protocol)
}

function makeCohort(selectedProtocol = protocol, repetitions = 5): Cohort {
  const example = makeAttempt()
  return {
    schemaVersion: 2,
    cohortId: "fixture-cohort",
    protocolSha256: protocolDigest(selectedProtocol),
    pins: {
      commit: "a".repeat(40),
      documentationSha256: digest("frozen public documentation"),
      registrySha256: digest("frozen registry manifest"),
      rubricSha256: digest("frozen acceptance rubric"),
      browser: { name: "fixture-browser", version: "1" },
    },
    controls: {
      host: example.host,
      model: example.model,
      environment: example.environment,
      versions: example.versions,
      budget: example.budget,
      capabilities: {
        network: example.capabilities.network,
        shell: example.capabilities.shell,
        mcp: example.capabilities.mcp,
      },
      fixtures: selectedProtocol.tasks.map((task) => ({ id: task.fixtureId, sha256: digest("frozen initial fixture") })),
    },
    schedule: createSchedule(selectedProtocol, { seed: 42, repetitions }),
  }
}

function makeAttempt(overrides: Partial<Attempt> = {}): Attempt {
  const attemptId = `fixture-attempt-${++sequence}`
  const taskId = overrides.taskId ?? "customer-journey"
  const conditionId = overrides.conditionId ?? "baseline"
  const task = protocol.tasks.find((candidate) => candidate.id === taskId)!
  const condition = protocol.conditions.find((candidate) => candidate.id === conditionId)!
  return {
    schemaVersion: 2,
    protocolVersion: protocol.version,
    attemptId,
    classification: "synthetic",
    conditionId,
    taskId,
    repetition: 1,
    order: sequence,
    cohortId: "fixture-cohort",
    workspace: { id: `workspace-${attemptId}`, fresh: true },
    fixture: { id: task.fixtureId, sha256: digest("frozen initial fixture") },
    versions: { registry: "1.0.0", cli: "1.0.0-rc.3", mcp: "1.0.0-rc.3", toolSchema: "fixture-schema-1" },
    host: { name: "fixture-host", version: "1" },
    model: { name: "fixture-model", version: "fixture-alias", versionKind: "alias" },
    environment: { os: "fixture-os", node: "24.7.0" },
    capabilities: { network: false, shell: true, mcp: true, tools: [...condition.tools] },
    budget: { elapsedMs: 900_000, toolCalls: 120, inputBytes: 2_097_152, outputBytes: 2_097_152, tokens: "unavailable" },
    status: "completed",
    assistance: "autonomous",
    metrics: { elapsedMs: 1_000, toolCalls: 3, inputBytes: 100, outputBytes: 200, tokens: "unavailable" },
    humanCorrections: { count: 0 },
    checks: task.checks.map((check) => ({ id: check.id, status: "passed", artifactIds: ["acceptance"], observer: "independent" })),
    artifacts: [{ id: "acceptance", path: "artifacts/acceptance.json", sha256: digest(content), bytes: Buffer.byteLength(content) }],
    ...overrides,
  }
}

async function writeAttempt(attempt: Attempt, includeArtifact = true): Promise<string> {
  const attemptDir = join(temporaryRoot, attempt.attemptId)
  await mkdir(join(attemptDir, "artifacts"), { recursive: true })
  await writeFile(join(attemptDir, "attempt.json"), JSON.stringify(attempt))
  if (includeArtifact) await writeFile(join(attemptDir, "artifacts/acceptance.json"), content)
  return attemptDir
}

async function evaluated(overrides: Partial<Attempt> = {}, selectedProtocol = protocol): Promise<EvaluatedAttempt> {
  const attempt = makeAttempt(overrides)
  return evaluateAttempt(await writeAttempt(attempt), selectedProtocol)
}

function conditionCell(report: ReturnType<typeof generateReport>, conditionId = "baseline") {
  assert.equal(report.groups.length, 1)
  const cell = report.groups[0]!.conditions.find((condition) => condition.conditionId === conditionId)
  assert.ok(cell)
  return cell
}

describe("outcome protocol v2", () => {
  test("keeps the historical benchmark separate and declares repeated independent outcomes", () => {
    assert.equal(protocol.schemaVersion, 2)
    assert.equal(protocol.id, "logic2b-outcome-v2")
    assert.equal(protocol.minimumAttempts, 5)
    assert.deepEqual(protocol.conditions.map((condition) => condition.id), ["baseline", "existing-cli-mcp", "new-workflow", "ablation-no-review"])
    assert.equal(protocol.tasks.length, 5)
    assert.equal(protocol.tasks.find((task) => task.id === "held-out-transfer")?.heldOut, true)
    for (const task of protocol.tasks) {
      assert.ok(task.checks.some((check) => check.required && check.independent && check.kind === "build"))
      assert.ok(task.checks.some((check) => check.required && check.independent && check.kind === "browser"))
      assert.ok(task.checks.some((check) => check.required && check.independent && check.kind === "human"))
    }
  })

  test("rejects unsupported versions, unknown keys and undersized pilots", () => {
    assert.throws(() => validateProtocol({ ...protocol, schemaVersion: 1 }), /schemaVersion/)
    assert.throws(() => validateProtocol({ ...protocol, hiddenEvaluator: "source" }), /unsupported|unknown|keys/i)
    assert.throws(() => validateProtocol({ ...protocol, minimumAttempts: 4 }), /minimumAttempts/)
  })

  test("rejects duplicate conditions, tasks and acceptance check identifiers", () => {
    const conditions = cloneProtocol()
    conditions.conditions.push(structuredClone(conditions.conditions[0]!))
    assert.throws(() => validateProtocol(conditions), /duplicate|unique/i)
    const tasks = cloneProtocol()
    tasks.tasks.push(structuredClone(tasks.tasks[0]!))
    assert.throws(() => validateProtocol(tasks), /duplicate|unique/i)
    const checks = cloneProtocol()
    checks.tasks[0]!.checks.push(structuredClone(checks.tasks[0]!.checks[0]!))
    assert.throws(() => validateProtocol(checks), /duplicate|unique/i)
  })
})

describe("bounded attempt metadata", () => {
  test("preserves explicit unavailable metrics and alias identity", () => {
    const attempt = makeAttempt()
    assert.deepEqual(validateAttempt(attempt, protocol), attempt)
    assert.equal(validateAttempt(attempt, protocol).metrics.tokens, "unavailable")
    assert.equal(validateAttempt(attempt, protocol).model.versionKind, "alias")
  })

  test("rejects stale protocols, unknown fields and unsafe artifact paths", () => {
    const attempt = makeAttempt()
    assert.throws(() => validateAttempt({ ...attempt, protocolVersion: "1.1.0" }, protocol), /protocolVersion|version/i)
    assert.throws(() => validateAttempt({ ...attempt, apiKey: "fixture-value" }, protocol), /unsupported|unknown|keys/i)
    assert.throws(() => validateAttempt({ ...attempt, metrics: { ...attempt.metrics, secret: "fixture-value" } }, protocol), /unsupported|unknown|keys/i)
    for (const path of ["../escape", "/tmp/private-source", "artifacts/../../escape", "artifacts\\escape", "artifacts//acceptance.json"]) {
      assert.throws(() => validateAttempt({ ...attempt, artifacts: [{ ...attempt.artifacts[0]!, path }] }, protocol), /path|relative|safe/i)
    }
  })

  test("rejects unknown task/check references, duplicate artifacts and malformed digests", () => {
    const attempt = makeAttempt()
    assert.throws(() => validateAttempt({ ...attempt, taskId: "missing-task" }, protocol), /taskId|task/i)
    assert.throws(() => validateAttempt({ ...attempt, conditionId: "missing-condition" }, protocol), /conditionId|condition/i)
    assert.throws(() => validateAttempt({ ...attempt, checks: [{ ...attempt.checks[0]!, id: "missing-check" }] }, protocol), /check/i)
    assert.throws(() => validateAttempt({ ...attempt, artifacts: [attempt.artifacts[0]!, attempt.artifacts[0]!] }, protocol), /duplicate|unique/i)
    assert.throws(() => validateAttempt({ ...attempt, artifacts: [{ ...attempt.artifacts[0]!, sha256: "sha256-abcd" }] }, protocol), /sha256|digest/i)
    assert.throws(() => validateAttempt({ ...attempt, checks: [attempt.checks[0]!, attempt.checks[0]!] }, protocol), /duplicate|unique/i)
    assert.throws(() => validateAttempt({ ...attempt, checks: [{ ...attempt.checks[0]!, artifactIds: ["unrecorded"] }] }, protocol), /artifact/i)
  })

  test("bounds artifact counts and declared source sizes before filesystem access", () => {
    const attempt = makeAttempt()
    assert.throws(() => validateAttempt({ ...attempt, artifacts: Array.from({ length: LIMITS.artifacts + 1 }, (_, index) => ({ ...attempt.artifacts[0]!, id: `evidence-${index}`, path: `artifacts/evidence-${index}.json` })) }, protocol), /array|entries|limit/i)
    assert.throws(() => validateAttempt({ ...attempt, artifacts: [{ ...attempt.artifacts[0]!, bytes: LIMITS.artifactBytes + 1 }] }, protocol), /bytes|integer|limit/i)
  })

  test("rejects negative, non-finite and missing instrumentation instead of treating it as zero", () => {
    const attempt = makeAttempt()
    for (const elapsedMs of [-1, Infinity, NaN, null]) {
      assert.throws(() => validateAttempt({ ...attempt, metrics: { ...attempt.metrics, elapsedMs } }, protocol), /elapsedMs|finite|number/i)
    }
    const { tokens: omittedTokens, ...missingMetric } = attempt.metrics
    void omittedTokens
    assert.throws(() => validateAttempt({ ...attempt, metrics: missingMetric }, protocol), /tokens|metrics|missing|required/i)
  })

  test("requires fresh workspaces and the frozen fixture identity", () => {
    const attempt = makeAttempt()
    assert.throws(() => validateAttempt({ ...attempt, workspace: { ...attempt.workspace, fresh: false } }, protocol), /fresh|workspace/i)
    assert.throws(() => validateAttempt({ ...attempt, fixture: { ...attempt.fixture, id: "different-fixture" } }, protocol), /fixture/i)
  })

  test("does not substitute shipped tools for a planned treatment", () => {
    const planned = makeAttempt({ conditionId: "new-workflow", classification: "real" })
    assert.throws(() => validateAttempt(planned, protocol), /planned|available/i)
    const existing = makeAttempt({ conditionId: "existing-cli-mcp" })
    existing.capabilities.tools = ["review_ui"]
    assert.throws(() => validateAttempt(existing, protocol), /tools|condition/i)
  })

  test("records human corrections with referenced reason evidence", () => {
    const corrected = makeAttempt({ assistance: "human-assisted", humanCorrections: { count: 1, reasonArtifactIds: ["acceptance"] } })
    assert.deepEqual(validateAttempt(corrected, protocol), corrected)
    assert.throws(() => validateAttempt({ ...corrected, humanCorrections: { count: 1 } }, protocol), /reason|artifact|correction/i)
    assert.throws(() => validateAttempt({ ...corrected, assistance: "autonomous" }, protocol), /human|assisted|correction/i)
    assert.throws(() => validateAttempt({ ...corrected, humanCorrections: { count: 1, reasonArtifactIds: ["missing"] } }, protocol), /artifact|reason/i)
  })
})

describe("independent acceptance and evidence integrity", () => {
  test("accepts complete checks backed by intact evidence", async () => {
    const result = await evaluated()
    assert.equal(result.integrity.status, "passed")
    assert.equal(result.success, true)
    assert.ok(result.checks.every((check) => check.status === "passed"))
  })

  test("hashes submitted JavaScript as inert evidence without executing it", async () => {
    const attempt = makeAttempt()
    const marker = join(temporaryRoot, "submitted-source-executed")
    const source = `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "executed"); throw new Error("submitted code ran")`
    attempt.artifacts = [{ id: "acceptance", path: "artifacts/evidence.mjs", sha256: digest(source), bytes: Buffer.byteLength(source) }]
    const attemptDir = await writeAttempt(attempt, false)
    await writeFile(join(attemptDir, "artifacts/evidence.mjs"), source)
    const result = await evaluateAttempt(attemptDir, protocol)
    assert.equal(result.integrity.status, "passed")
    await assert.rejects(() => readFile(marker), /ENOENT/)
  })

  test("rejects oversized attempt manifests before parsing", async () => {
    const attemptDir = await writeAttempt(makeAttempt())
    await writeFile(join(attemptDir, "attempt.json"), " ".repeat(LIMITS.manifestBytes + 1))
    await assert.rejects(() => evaluateAttempt(attemptDir, protocol), /byte|limit|bounded/i)
  })

  test("keeps missing required checks as not-run and cannot award a success", async () => {
    const attempt = makeAttempt()
    const missing = attempt.checks.pop()!
    const result = await evaluateAttempt(await writeAttempt(attempt), protocol)
    assert.equal(result.success, false)
    assert.equal(result.checks.find((check) => check.id === missing.id)?.status, "not-run")
    assert.equal(result.checks.length, protocol.tasks[0]!.checks.length)
  })

  test("keeps failed and unknown required observations outside the success count", async () => {
    for (const status of ["failed", "unknown", "not-run"] as const) {
      const attempt = makeAttempt()
      attempt.checks[0]!.status = status
      const result = await evaluateAttempt(await writeAttempt(attempt), protocol)
      assert.equal(result.success, false)
      assert.equal(result.checks.find((check) => check.id === attempt.checks[0]!.id)?.status, status)
    }
  })

  test("cannot use agent self-reports or unreferenced pass assertions as acceptance", async () => {
    const agentObserved = makeAttempt()
    agentObserved.checks[0]!.observer = "agent"
    const result = await evaluateAttempt(await writeAttempt(agentObserved), protocol)
    assert.equal(result.success, false)
    assert.equal(result.checks.find((check) => check.id === agentObserved.checks[0]!.id)?.status, "unknown")
    const unreferenced = makeAttempt()
    unreferenced.checks[0]!.artifactIds = []
    const missingEvidence = await evaluateAttempt(await writeAttempt(unreferenced), protocol)
    assert.equal(missingEvidence.success, false)
    assert.equal(missingEvidence.checks.find((check) => check.id === unreferenced.checks[0]!.id)?.status, "unknown")
  })

  test("retains failed, timed-out and interrupted attempts even when partial checks passed", async () => {
    for (const status of ["failed", "timed-out", "interrupted"] as const) {
      const result = await evaluated({ status })
      assert.equal(result.attempt.status, status)
      assert.equal(result.success, false)
    }
  })

  test("requires observed absence of human corrections for autonomous success", async () => {
    const result = await evaluated({ humanCorrections: { count: "unavailable" } })
    assert.equal(result.success, false)
  })

  test("cannot count completed evidence above the declared time, call, byte or token budget as success", async () => {
    const metrics = makeAttempt().metrics
    for (const overrun of [{ elapsedMs: 900_001 }, { toolCalls: 121 }, { inputBytes: 2_097_153 }, { outputBytes: 2_097_153 }, { tokens: 101 }]) {
      const result = await evaluated({ budget: { ...makeAttempt().budget, tokens: 100 }, metrics: { ...metrics, ...overrun } })
      assert.equal(result.success, false)
      assert.equal(result.budgetStatus, "failed")
    }
  })

  test("unavailable time, calls or bytes cannot prove the budget was respected", async () => {
    const metrics = makeAttempt().metrics
    for (const field of ["elapsedMs", "toolCalls", "inputBytes", "outputBytes"] as const) {
      const result = await evaluated({ metrics: { ...metrics, [field]: "unavailable" } })
      assert.equal(result.budgetStatus, "unknown")
      assert.equal(result.success, false)
    }
  })

  test("unavailable tokens are acceptable only when there is no numeric token budget", async () => {
    const unmetered = await evaluated()
    assert.equal(unmetered.budgetStatus, "passed")
    assert.equal(unmetered.success, true)
    const bounded = await evaluated({ budget: { ...makeAttempt().budget, tokens: 100 } })
    assert.equal(bounded.budgetStatus, "unknown")
    assert.equal(bounded.success, false)
  })

  test("marks missing and altered artifacts failed and preserves their issues", async () => {
    const missing = makeAttempt()
    const missingResult = await evaluateAttempt(await writeAttempt(missing, false), protocol)
    assert.equal(missingResult.integrity.status, "failed")
    assert.equal(missingResult.success, false)
    assert.ok(missingResult.integrity.issues.length > 0)
    const altered = makeAttempt()
    const alteredDir = await writeAttempt(altered)
    await writeFile(join(alteredDir, "artifacts/acceptance.json"), "tampered")
    const alteredResult = await evaluateAttempt(alteredDir, protocol)
    assert.equal(alteredResult.integrity.status, "failed")
    assert.equal(alteredResult.success, false)
    assert.match(alteredResult.integrity.issues.join(" "), /hash|digest|sha256|size|bytes/i)
  })

  test("checks the declared artifact size as well as its digest", async () => {
    const attempt = makeAttempt()
    attempt.artifacts[0]!.bytes += 1
    const result = await evaluateAttempt(await writeAttempt(attempt), protocol)
    assert.equal(result.integrity.status, "failed")
    assert.equal(result.success, false)
  })

  test("rejects symlink files and directories even when their bytes match", async () => {
    if (process.platform === "win32") return
    const linkedFile = makeAttempt()
    const fileDir = await writeAttempt(linkedFile)
    const external = join(temporaryRoot, "external-evidence.json")
    await writeFile(external, content)
    await rm(join(fileDir, "artifacts/acceptance.json"))
    await symlink(external, join(fileDir, "artifacts/acceptance.json"))
    const fileResult = await evaluateAttempt(fileDir, protocol)
    assert.equal(fileResult.integrity.status, "failed")
    assert.equal(fileResult.success, false)
    assert.match(fileResult.integrity.issues.join(" "), /unsafe|symlink/i)

    const linkedDirectory = makeAttempt()
    const directoryDir = await writeAttempt(linkedDirectory)
    const outside = join(temporaryRoot, "external-artifacts")
    await rename(join(directoryDir, "artifacts"), outside)
    await symlink(outside, join(directoryDir, "artifacts"), "dir")
    const directoryResult = await evaluateAttempt(directoryDir, protocol)
    assert.equal(directoryResult.integrity.status, "failed")
    assert.equal(directoryResult.success, false)
    assert.match(directoryResult.integrity.issues.join(" "), /unsafe|symlink/i)
  })

  test("does not follow symlinked attempt manifests", async () => {
    if (process.platform === "win32") return
    const attempt = makeAttempt()
    const attemptDir = await writeAttempt(attempt)
    const outside = join(temporaryRoot, "external-attempt.json")
    await rename(join(attemptDir, "attempt.json"), outside)
    await symlink(outside, join(attemptDir, "attempt.json"))
    await assert.rejects(() => evaluateAttempt(attemptDir, protocol), /symlink/i)
  })

  test("rejects FIFO evidence promptly without waiting for a writer", async () => {
    if (process.platform === "win32") return
    const attemptDir = await writeAttempt(makeAttempt(), false)
    execFileSync("mkfifo", [join(attemptDir, "artifacts/acceptance.json")])
    // Keep the rejection check in its own bounded process so a regression in
    // fs.open cannot stall the test suite on a pipe that has no writer.
    const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import { readFile } from "node:fs/promises";
      import { evaluateAttempt, validateProtocol } from "./scripts/evaluation-v2.mts";
      const protocol = validateProtocol(JSON.parse(await readFile("v2/protocol.json", "utf8")));
      const result = await evaluateAttempt(${JSON.stringify(attemptDir)}, protocol);
      process.stdout.write(JSON.stringify({ integrity: result.integrity.status, success: result.success }));
    `], { cwd: benchmarkRoot, encoding: "utf8", timeout: 3_000 })
    assert.equal(child.error, undefined)
    assert.equal(child.signal, null)
    assert.equal(child.status, 0, child.stderr)
    assert.deepEqual(JSON.parse(child.stdout), { integrity: "failed", success: false })
  })
})

describe("comparative outcome reporting", () => {
  test("publishes pending status with no invented samples and excludes every synthetic attempt", async () => {
    const result = await evaluated()
    const report = generateReport([result], protocol)
    assert.equal(report.status, "pending")
    assert.equal(report.excludedSynthetic, 1)
    assert.equal(report.attempts.length, 0)
    assert.equal(report.groups.length, 0)
    assert.deepEqual(generateReport([], protocol).attempts, [])
  })

  test("counts all autonomous failures in the denominator and separates human-assisted rescues", async () => {
    const autonomous = await evaluated({ classification: "real", repetition: 1 })
    const timeout = await evaluated({ classification: "real", repetition: 2, status: "timed-out" })
    const failure = await evaluated({ classification: "real", repetition: 3, status: "failed" })
    const assisted = await evaluated({ classification: "real", repetition: 4, assistance: "human-assisted", humanCorrections: { count: 2, reasonArtifactIds: ["acceptance"] } })
    const report = generateReport([autonomous, timeout, failure, assisted], protocol)
    const cell = conditionCell(report)
    assert.equal(report.status, "insufficient-evidence")
    assert.equal(cell.autonomous.attempts, 4)
    assert.equal(cell.autonomous.successes, 1)
    assert.equal(cell.autonomous.failures, 3)
    assert.equal(cell.autonomous.rate, 1 / 4)
    assert.equal(cell.autonomous.metrics.elapsedMs.available, 3)
    assert.equal(cell.autonomous.metrics.elapsedMs.unavailable, 1)
    assert.equal(cell.assisted.attempts, 1)
    assert.equal(cell.assisted.humanCorrections.median, 2)
    assert.equal(report.attempts.length, 4)
    assert.deepEqual(new Set(cell.attemptIds), new Set([autonomous, timeout, failure, assisted].map((result) => result.attempt.attemptId)))
  })

  test("summarizes only available observations and gives empty cells no success rate", async () => {
    const rows: EvaluatedAttempt[] = []
    for (const [index, elapsedMs] of [1_000, 9_000, 3_000, "unavailable"].entries()) {
      rows.push(await evaluated({ classification: "real", repetition: index + 1, metrics: { elapsedMs: elapsedMs as number | "unavailable", toolCalls: "unavailable", inputBytes: 100, outputBytes: 200, tokens: "unavailable" } }))
    }
    const report = generateReport(rows, protocol)
    const cell = conditionCell(report)
    assert.equal(cell.autonomous.metrics.elapsedMs.available, 3)
    assert.equal(cell.autonomous.metrics.elapsedMs.unavailable, 1)
    assert.equal(cell.autonomous.metrics.elapsedMs.median, 3_000)
    assert.equal(cell.autonomous.metrics.elapsedMs.min, 1_000)
    assert.equal(cell.autonomous.metrics.elapsedMs.max, 9_000)
    assert.deepEqual(cell.autonomous.metrics.tokens, { available: 0, unavailable: 4, median: null, min: null, max: null })
    assert.equal(cell.assisted.rate, null)
    assert.equal(conditionCell(report, "existing-cli-mcp").autonomous.rate, null)
  })

  test("uses deterministic ordering independent of the input order", async () => {
    const rows = await Promise.all([1, 2, 3].map((repetition) => evaluated({ classification: "real", repetition })))
    assert.deepEqual(generateReport(rows, protocol), generateReport([...rows].reverse(), protocol))
  })

  test("does not combine different models, fixture digests or common budgets", async () => {
    const first = await evaluated({ classification: "real" })
    const model = await evaluated({ classification: "real", repetition: 2, model: { name: "different-model", version: "v1", versionKind: "immutable" } })
    const fixture = await evaluated({ classification: "real", repetition: 3, fixture: { ...first.attempt.fixture, sha256: digest("different initial fixture") } })
    const budget = await evaluated({ classification: "real", repetition: 4, budget: { ...first.attempt.budget, elapsedMs: 800_000 } })
    assert.equal(generateReport([first, model, fixture, budget], protocol).groups.length, 4)
  })

  test("permits treatment-specific tool lists in the same controlled comparison", async () => {
    const baseline = await evaluated({ classification: "real" })
    const existing = await evaluated({ classification: "real", conditionId: "existing-cli-mcp" })
    const report = generateReport([baseline, existing], protocol)
    assert.equal(report.groups.length, 1)
    assert.equal(conditionCell(report).autonomous.attempts, 1)
    assert.equal(conditionCell(report, "existing-cli-mcp").autonomous.attempts, 1)
  })

  test("rejects duplicate attempts, repeated assignment cells and reused workspaces", async () => {
    const first = await evaluated({ classification: "real" })
    assert.throws(() => generateReport([first, first], protocol), /duplicate|attemptId/i)
    const repeated = await evaluated({ classification: "real" })
    assert.throws(() => generateReport([first, repeated], protocol), /duplicate|repetition|assignment/i)
    const reusedWorkspace = await evaluated({ classification: "real", repetition: 2, workspace: first.attempt.workspace })
    assert.throws(() => generateReport([first, reusedWorkspace], protocol), /workspace|duplicate/i)
    const repeatedOrder = await evaluated({ classification: "real", repetition: 2, order: first.attempt.order })
    assert.throws(() => generateReport([first, repeatedOrder], protocol), /order|duplicate/i)
  })

  test("five observations in one cell cannot imply the complete comparison is ready", async () => {
    const rows: EvaluatedAttempt[] = []
    for (let repetition = 1; repetition <= protocol.minimumAttempts; repetition += 1) {
      rows.push(await evaluated({ classification: "real", repetition }))
    }
    const report = generateReport(rows, protocol)
    assert.equal(conditionCell(report).pilotReady, true)
    assert.equal(report.assignmentCoverage, "unverified")
    assert.equal(conditionCell(report, "new-workflow").availability, "planned")
    assert.equal(conditionCell(report, "new-workflow").pilotReady, false)
    assert.equal(report.status, "insufficient-evidence")
  })

  test("becomes pilot-ready only after every available condition/task cell reaches its sample size", async () => {
    // A local all-available protocol exercises the future ready branch. It is
    // never saved as public protocol metadata or presented as measured results.
    const availableProtocol = cloneProtocol()
    for (const condition of availableProtocol.conditions) {
      condition.availability = "available"
      delete condition.unavailableTools
    }
    const rows: EvaluatedAttempt[] = []
    const cohort = makeCohort(availableProtocol)
    for (const entry of cohort.schedule.entries) {
      rows.push(await evaluated({ classification: "real", taskId: entry.taskId, conditionId: entry.conditionId, repetition: entry.repetition, order: entry.order, status: entry.repetition === 1 ? "failed" : "completed" }, availableProtocol))
    }
    assert.equal(generateReport(rows, availableProtocol).status, "insufficient-evidence")
    assert.equal(generateReport(rows.slice(1), availableProtocol, [cohort]).status, "insufficient-evidence")
    const complete = generateReport(rows, availableProtocol, [cohort])
    assert.equal(complete.status, "pilot-ready")
    assert.equal(complete.assignmentCoverage, "verified")
    assert.equal(complete.groups.length, availableProtocol.tasks.length)
    assert.ok(complete.groups.every((group) => group.conditions.every((condition) => condition.pilotReady && condition.autonomous.attempts === 5 && condition.autonomous.failures === 1)))
  })
})

describe("frozen assignment provenance", () => {
  test("accepts exact protocol, provenance pins and deterministic schedule", () => {
    const cohort = makeCohort()
    assert.deepEqual(validateCohort(cohort, protocol), cohort)
    assert.equal(protocolDigest({ ...protocol, design: Object.fromEntries(Object.entries(protocol.design).reverse()) }), protocolDigest(protocol))
  })

  test("rejects stale protocols, invalid pins and unrecognized cohort metadata", () => {
    const cohort = makeCohort()
    assert.throws(() => validateCohort({ ...cohort, schemaVersion: 1 }, protocol), /schemaVersion/)
    assert.throws(() => validateCohort({ ...cohort, protocolSha256: digest("stale protocol") }, protocol), /protocol|digest/i)
    assert.throws(() => validateCohort({ ...cohort, pins: { ...cohort.pins, commit: "fixture-branch" } }, protocol), /commit/i)
    assert.throws(() => validateCohort({ ...cohort, pins: { ...cohort.pins, documentationSha256: "sha256-abcd" } }, protocol), /documentation|digest|sha256/i)
    assert.throws(() => validateCohort({ ...cohort, privatePath: "/fixture/private" }, protocol), /unsupported|keys/i)
    assert.throws(() => validateCohort({ ...cohort, pins: { ...cohort.pins, secret: "fixture-value" } }, protocol), /unsupported|keys/i)
  })

  test("requires frozen controls and an exact fixture inventory before any observations", () => {
    const cohort = makeCohort()
    const { controls: omittedControls, ...withoutControls } = cohort
    void omittedControls
    assert.throws(() => validateCohort(withoutControls, protocol), /controls/i)
    assert.throws(() => validateCohort({ ...cohort, controls: { ...cohort.controls, fixtures: cohort.controls.fixtures.slice(1) } }, protocol), /fixture/i)
    assert.throws(() => validateCohort({ ...cohort, controls: { ...cohort.controls, fixtures: [...cohort.controls.fixtures, cohort.controls.fixtures[0]!] } }, protocol), /fixture|duplicate/i)
    assert.throws(() => validateCohort({ ...cohort, controls: { ...cohort.controls, fixtures: cohort.controls.fixtures.map((fixture, index) => index === 0 ? { ...fixture, sha256: "sha256-abcd" } : fixture) } }, protocol), /fixture|sha256|digest/i)
    assert.throws(() => validateCohort({ ...cohort, controls: { ...cohort.controls, privatePath: "/fixture/private" } }, protocol), /unsupported|keys/i)
  })

  test("rejects modified, incomplete or reordered frozen schedules", () => {
    const cohort = makeCohort()
    assert.throws(() => validateCohort({ ...cohort, schedule: { ...cohort.schedule, seed: 43 } }, protocol), /schedule|assignments/i)
    assert.throws(() => validateCohort({ ...cohort, schedule: { ...cohort.schedule, entries: cohort.schedule.entries.slice(1) } }, protocol), /schedule|assignments/i)
    assert.throws(() => validateCohort({ ...cohort, schedule: { ...cohort.schedule, entries: [...cohort.schedule.entries].reverse() } }, protocol), /schedule|assignments/i)
  })

  test("keeps an omitted sixth assignment in the primary success denominator", async () => {
    const selectedProtocol = cloneProtocol()
    selectedProtocol.conditions = selectedProtocol.conditions.filter((condition) => condition.id === "baseline")
    selectedProtocol.tasks = selectedProtocol.tasks.filter((task) => task.id === "customer-journey")
    const cohort = makeCohort(selectedProtocol, 6)
    const rows: EvaluatedAttempt[] = []
    for (const entry of cohort.schedule.entries.filter((entry) => entry.repetition <= 5)) {
      rows.push(await evaluated({ classification: "real", repetition: entry.repetition, order: entry.order }, selectedProtocol))
    }
    const report = generateReport(rows, selectedProtocol, [cohort])
    assert.equal(report.assignmentCoverage, "verified")
    assert.equal(report.status, "insufficient-evidence")
    assert.equal(report.coverage.length, 1)
    const cell = report.coverage[0]!.cells[0]!
    assert.deepEqual({ assigned: cell.assigned, observed: cell.observed, missing: cell.missing, planned: cell.planned, autonomousSuccesses: cell.autonomousSuccesses, rate: cell.rate }, { assigned: 6, observed: 5, missing: 1, planned: 0, autonomousSuccesses: 5, rate: 5 / 6 })
    // Observed resource summaries can contain only the five recorded attempts;
    // the authoritative primary denominator comes from the frozen coverage.
    assert.equal(conditionCell(report).autonomous.attempts, 5)
    assert.equal(conditionCell(report).autonomous.rate, 1)
  })

  test("distinguishes planned assignments from missing available observations", () => {
    const cohort = makeCohort()
    const report = generateReport([], protocol, [cohort])
    const pending = report.coverage[0]!.cells.find((cell) => cell.conditionId === "new-workflow" && cell.taskId === "customer-journey")!
    assert.deepEqual({ assigned: pending.assigned, observed: pending.observed, missing: pending.missing, planned: pending.planned, rate: pending.rate }, { assigned: 5, observed: 0, missing: 0, planned: 5, rate: null })
    const available = report.coverage[0]!.cells.find((cell) => cell.conditionId === "baseline" && cell.taskId === "customer-journey")!
    assert.deepEqual({ assigned: available.assigned, observed: available.observed, missing: available.missing, planned: available.planned, rate: available.rate }, { assigned: 5, observed: 0, missing: 5, planned: 0, rate: 0 })
    assert.equal(report.status, "pending")
  })

  test("rejects records that do not match their cohort's assigned cell and order", async () => {
    const cohort = makeCohort()
    const entry = cohort.schedule.entries.find((entry) => entry.conditionId === "baseline" && entry.taskId === "customer-journey")!
    const unassigned = await evaluated({ classification: "real", repetition: entry.repetition, order: cohort.schedule.entries.length + 1 })
    assert.throws(() => generateReport([unassigned], protocol, [cohort]), /assignment|cohort/i)
    const unknownCohort = await evaluated({ classification: "real", repetition: entry.repetition, order: entry.order, cohortId: "unfrozen-cohort" })
    assert.throws(() => generateReport([unknownCohort], protocol, [cohort]), /assignment|cohort/i)
    assert.throws(() => generateReport([], protocol, [cohort, cohort]), /duplicate|cohort/i)
  })

  test("orders multiple frozen cohorts deterministically without mutating caller arrays", async () => {
    const firstCohort = makeCohort()
    const secondCohort = { ...makeCohort(), cohortId: "another-fixture-cohort" }
    const entry = firstCohort.schedule.entries.find((entry) => entry.conditionId === "baseline" && entry.taskId === "customer-journey")!
    const first = await evaluated({ classification: "real", repetition: entry.repetition, order: entry.order, cohortId: firstCohort.cohortId })
    const second = await evaluated({ classification: "real", repetition: entry.repetition, order: entry.order, cohortId: secondCohort.cohortId })
    const cohorts = [firstCohort, secondCohort]
    const originalOrder = cohorts.map((cohort) => cohort.cohortId)
    const report = generateReport([first, second], protocol, cohorts)
    assert.deepEqual(report, generateReport([second, first], protocol, [...cohorts].reverse()))
    assert.deepEqual(cohorts.map((cohort) => cohort.cohortId), originalOrder)
    assert.deepEqual(report.coverage.map((coverage) => coverage.cohortId), [...originalOrder].sort())
  })

  test("rejects changed controlled conditions or fixture digests within a frozen cohort", async () => {
    const cohort = makeCohort()
    const entries = cohort.schedule.entries.filter((entry) => entry.conditionId === "baseline" && entry.taskId === "customer-journey")
    const firstEntry = entries[0]!
    const secondEntry = entries[1]!
    const first = await evaluated({ classification: "real", repetition: firstEntry.repetition, order: firstEntry.order })
    const variations: Partial<Attempt>[] = [
      { host: { ...first.attempt.host, version: "2" } },
      { model: { ...first.attempt.model, version: "different-model-alias" } },
      { environment: { ...first.attempt.environment, os: "different-os" } },
      { capabilities: { ...first.attempt.capabilities, network: true } },
      { versions: { ...first.attempt.versions, registry: "1.1.0" } },
      { budget: { ...first.attempt.budget, toolCalls: 119 } },
      { fixture: { ...first.attempt.fixture, sha256: digest("different initial fixture") } },
    ]
    for (const variation of variations) {
      const changed = await evaluated({ classification: "real", repetition: secondEntry.repetition, order: secondEntry.order, ...variation })
      assert.throws(() => generateReport([first, changed], protocol, [cohort]), /cohort|same|fixture|budgets/i)
    }
  })

  test("rejects a first observation that differs from the prospectively frozen model, fixture or budget", async () => {
    const cohort = makeCohort()
    const entry = cohort.schedule.entries.find((entry) => entry.conditionId === "baseline" && entry.taskId === "customer-journey")!
    const example = makeAttempt()
    const variations: Partial<Attempt>[] = [
      { model: { ...example.model, version: "unfrozen-model-alias" } },
      { fixture: { ...example.fixture, sha256: digest("unfrozen initial fixture") } },
      { budget: { ...example.budget, toolCalls: 119 } },
    ]
    for (const variation of variations) {
      const changed = await evaluated({ classification: "real", repetition: entry.repetition, order: entry.order, ...variation })
      assert.throws(() => generateReport([changed], protocol, [cohort]), /frozen|controls|cohort/i)
    }
  })
})

describe("randomized pilot schedule", () => {
  test("assigns every condition/task/repetition once and retains planned conditions", () => {
    const schedule = createSchedule(protocol, { seed: 20261003, repetitions: 5 })
    assert.equal(schedule.entries.length, protocol.conditions.length * protocol.tasks.length * 5)
    assert.deepEqual(schedule.entries.map((entry) => entry.order), Array.from({ length: schedule.entries.length }, (_,index) => index + 1))
    assert.equal(new Set(schedule.entries.map((entry) => `${entry.conditionId}/${entry.taskId}/${entry.repetition}`)).size, schedule.entries.length)
    assert.ok(schedule.entries.some((entry) => entry.conditionId === "new-workflow" && entry.availability === "planned"))
    for (const condition of protocol.conditions) {
      for (const task of protocol.tasks) {
        assert.deepEqual(schedule.entries.filter((entry) => entry.conditionId === condition.id && entry.taskId === task.id).map((entry) => entry.repetition).sort((a, b) => a - b), [1, 2, 3, 4, 5])
      }
    }
  })

  test("reproduces a seed exactly and changes the order for a different seed", () => {
    const first = createSchedule(protocol, { seed: 42, repetitions: 5 })
    assert.deepEqual(createSchedule(protocol, { seed: 42, repetitions: 5 }), first)
    assert.notDeepEqual(createSchedule(protocol, { seed: 43, repetitions: 5 }).entries, first.entries)
  })

  test("rejects invalid repetitions instead of silently shrinking the pilot", () => {
    for (const repetitions of [0, -1, 4, 1.5, NaN, Infinity]) {
      assert.throws(() => createSchedule(protocol, { seed: 42, repetitions }), /repetitions|integer|finite/i)
    }
  })

  test("bounds the seed to a reproducible unsigned integer", () => {
    for (const seed of [-1, 1.5, NaN, Infinity, 0x100000000]) {
      assert.throws(() => createSchedule(protocol, { seed, repetitions: 5 }), /seed|integer|finite/i)
    }
  })
})
