import { mkdir, readdir, lstat, rename, unlink, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { createSchedule, evaluateAttempt, generateReport, LIMITS, readBoundedFile, validateCohort, validateProtocol, type Cohort, type Protocol, type Report } from "./evaluation-v2.mts"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const protocol = validateProtocol(JSON.parse((await readBoundedFile(resolve(root, "v2"), "protocol.json", LIMITS.manifestBytes)).toString("utf8")))

function within(parent: string, path: string) {
  const rel = relative(parent, path)
  return !isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`)
}
async function regularDirectories(path: string) {
  let current = resolve(path)
  while (true) {
    const stat = await lstat(current)
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Input and output directories must not contain symlinks.")
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
}
async function safeOutputAncestors(path: string) {
  let current = path
  while (true) {
    try { await lstat(current); await regularDirectories(current); return }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      const parent = dirname(current)
      if (parent === current) throw error
      current = parent
    }
  }
}
async function atomicWrite(path: string, content: string) {
  try { if ((await lstat(path)).isSymbolicLink()) throw new Error("Output files must not be symlinks.") }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
  const temporary = `${path}.${process.pid}.tmp`
  try {
    await writeFile(temporary, content, { flag: "wx" })
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch(() => {})
  }
}
function renderReport(report: Report, method: Protocol) {
  const lines = ["# Comparative outcome evaluation v2", "", `Protocol: ${method.id} ${method.version}. Status: **${report.status}**.`, "", "This report ingests independent evaluator observations. Artifact hashes verify retained bytes; they do not establish the truth of a claimed result.", ""]
  if (report.status === "pending") lines.push("No real v2 attempts have been collected. Comparative measurements are pending.", "")
  lines.push("| Condition | Availability | Minimum autonomous attempts per task |", "| --- | --- | --- |")
  for (const condition of method.conditions) lines.push(`| ${condition.id} | ${condition.availability} | ${method.minimumAttempts} |`)
  lines.push("", `Tasks: ${method.tasks.map((t) => t.id).join(", ")}. Synthetic evidence excluded: ${report.excludedSynthetic}. Assignment coverage: **${report.assignmentCoverage}**.`, "", "The primary rate uses every frozen assignment as its denominator. Missing observations remain pending and cannot count as successes. Human-assisted rescues remain primary failures and also appear in the assisted stratum. Without a frozen cohort manifest, only observed counts are available and a pilot cannot be ready. Profiles with different hosts, models, versions, fixtures, capabilities or budgets are not combined.", "")
  if (report.coverage.length) {
    lines.push("| Cohort / task / condition | Primary success / assigned | Observed | Missing | Planned |", "| --- | --- | --- | --- | --- |")
    for (const cohort of report.coverage) for (const cell of cohort.cells) lines.push(`| ${cohort.cohortId} / ${cell.taskId} / ${cell.conditionId} | ${cell.planned ? "pending" : `${cell.autonomousSuccesses} / ${cell.assigned}`} | ${cell.observed} | ${cell.missing} | ${cell.planned} |`)
    lines.push("")
  }
  if (report.groups.length) {
    lines.push("| Profile / task / condition | Primary success / observed | Assisted success / observed | Pending minimum | Autonomous elapsed median / min / max (ms) | Tokens available / unavailable |", "| --- | --- | --- | --- | --- | --- |")
    for (const group of report.groups) for (const condition of group.conditions) {
      const elapsed = condition.autonomous.metrics.elapsedMs
      const tokens = condition.autonomous.metrics.tokens
      lines.push(`| ${group.profileId.slice(7, 19)} / ${group.taskId} / ${condition.conditionId} | ${condition.autonomous.successes} / ${condition.autonomous.attempts} | ${condition.assisted.successes} / ${condition.assisted.attempts} | ${condition.pendingMinimumAttempts} | ${elapsed.median ?? "unavailable"} / ${elapsed.min ?? "unavailable"} / ${elapsed.max ?? "unavailable"} | ${tokens.available} / ${tokens.unavailable} |`)
    }
    lines.push("", "## Retained attempts", "", "| Attempt | Condition / task | Outcome | Integrity / budget | Required checks passed |", "| --- | --- | --- | --- | --- |")
    for (const attempt of report.attempts) lines.push(`| ${attempt.attemptId} | ${attempt.conditionId} / ${attempt.taskId} | ${attempt.status}; ${attempt.assistance}; ${attempt.success ? "accepted" : "not accepted"} | ${attempt.integrity.status} / ${attempt.budgetStatus} | ${attempt.checks.filter((c) => c.status === "passed").length} / ${attempt.checks.length} |`)
    lines.push("", "Full per-check results, metrics, unavailable counts, profile pins and artifact references are retained in report.json.", "")
  }
  lines.push("A five-attempt threshold is a pilot, not a broad statistical claim. The historical v1 leaderboard is separate installation/composition smoke evidence.", "")
  return lines.join("\n")
}

if (args[0] === "--plan") {
  if (args.length > 3) throw new Error("Usage: report:v2 --plan [seed] [repetitions]")
  const seed = args[1] === undefined ? protocol.design.seed as number : Number(args[1])
  const repetitions = args[2] === undefined ? protocol.minimumAttempts : Number(args[2])
  console.log(JSON.stringify(createSchedule(protocol, { seed, repetitions }), null, 2))
} else {
  if (args.length > 2 || args.some((a) => a.startsWith("--"))) throw new Error("Usage: report:v2 [runs-dir] [output-dir], or --plan [seed] [repetitions]")
  const runsDir = resolve(args[0] ?? resolve(root, "v2/runs"))
  const outputDir = resolve(args[1] ?? resolve(root, "v2/results"))
  if ([resolve(root, "runs"), resolve(root, "results")].some((path) => within(path, outputDir))) throw new Error("v2 output cannot modify the archived v1 runs or results.")
  let entries: string[] = []
  try {
    await regularDirectories(runsDir)
    entries = await readdir(runsDir)
  } catch (error) {
    if (args[0] !== undefined || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  let cohorts: Cohort[] = []
  if (entries.includes("cohorts.json")) {
    try {
      const raw: unknown = JSON.parse((await readBoundedFile(runsDir, "cohorts.json", LIMITS.manifestBytes)).toString("utf8"))
      if (!Array.isArray(raw) || raw.length > 16) throw new Error("Invalid cohort count.")
      cohorts = raw.map((cohort) => validateCohort(cohort, protocol))
    } catch { throw new Error("cohorts.json contains invalid metadata or unsafe evidence. No report was written.") }
  }
  const names = entries.filter((entry) => !entry.startsWith(".") && entry !== "cohorts.json").sort()
  if (names.length > LIMITS.attempts) throw new Error("Evidence root exceeds attempt count limit.")
  const evaluated = []
  for (const name of names) {
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(name)) throw new Error("Evidence root contains an unsafe attempt directory name.")
    try {
      evaluated.push(await evaluateAttempt(resolve(runsDir, name), protocol))
    } catch {
      throw new Error(`Attempt ${name} has invalid metadata or an unsafe manifest. No report was written; repair metadata while preserving its original outcome and assigned slot.`)
    }
  }
  const report = generateReport(evaluated, protocol, cohorts)
  await safeOutputAncestors(outputDir)
  await mkdir(outputDir, { recursive: true })
  await regularDirectories(outputDir)
  await atomicWrite(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
  await atomicWrite(resolve(outputDir, "report.md"), renderReport(report, protocol))
  console.log(`v2 report: ${report.status}; ${report.attempts.length} real attempts; ${report.excludedSynthetic} synthetic attempts excluded.`)
}
