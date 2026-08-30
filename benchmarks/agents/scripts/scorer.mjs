import { lstat, readFile } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"

const MAX_FILE_BYTES = 1_000_000
const FIXTURES = new Set(["vite-base", "vite-settings", "empty"])
const CHECK_TYPES = new Set([
  "fileExists",
  "fileContains",
  "fileMatches",
  "fileNotMatches",
  "jsonEquals",
  "jsonHas",
  "runEquals",
])

async function readJson(path, label) {
  let raw
  try {
    raw = await readFile(path, "utf8")
  } catch (error) {
    throw new Error(`Cannot read ${label} at ${path}: ${error.message}`)
  }
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`)
  }
}

function valueAt(value, jsonPath) {
  return jsonPath.split(".").reduce((current, key) => {
    if (current === null || typeof current !== "object") return undefined
    return current[key]
  }, value)
}

function safeArtifactPath(root, path) {
  if (typeof path !== "string" || !path || isAbsolute(path)) {
    throw new Error(`Unsafe artifact path: ${String(path)}`)
  }
  const target = resolve(root, path)
  const rel = relative(root, target)
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Artifact path escapes its task directory: ${path}`)
  }
  return target
}

async function artifactText(root, path) {
  const { target, info } = await safeArtifactInfo(root, path)
  if (!info.isFile()) throw new Error(`Not a regular file: ${path}`)
  if (info.size > MAX_FILE_BYTES) {
    throw new Error(`Artifact exceeds ${MAX_FILE_BYTES} bytes: ${path}`)
  }
  return readFile(target, "utf8")
}

async function safeArtifactInfo(root, path) {
  const target = safeArtifactPath(root, path)
  const rootInfo = await lstat(root)
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    throw new Error("Artifact task root must be a regular directory.")
  }
  let current = root
  let info = rootInfo
  for (const segment of relative(root, target).split(sep).filter(Boolean)) {
    current = resolve(current, segment)
    info = await lstat(current)
    if (info.isSymbolicLink()) {
      throw new Error(`Symlinks are not scored: ${path}`)
    }
  }
  return { target, info }
}

async function evaluate(check, artifactRoot, taskRun) {
  try {
    if (check.type === "fileExists") {
      const { info } = await safeArtifactInfo(artifactRoot, check.path)
      return { passed: info.isFile(), evidence: check.path }
    }

    if (check.type === "runEquals") {
      const actual = valueAt(taskRun, check.jsonPath)
      return {
        passed: Object.is(actual, check.value),
        evidence: `${check.jsonPath}: ${JSON.stringify(actual)}`,
      }
    }

    const text = await artifactText(artifactRoot, check.path)
    if (check.type === "fileContains") {
      return { passed: text.includes(check.value), evidence: check.path }
    }
    if (check.type === "fileMatches" || check.type === "fileNotMatches") {
      const matched = new RegExp(check.pattern, "m").test(text)
      return {
        passed: check.type === "fileMatches" ? matched : !matched,
        evidence: check.path,
      }
    }
    if (check.type === "jsonEquals" || check.type === "jsonHas") {
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        return { passed: false, evidence: `${check.path} is not valid JSON` }
      }
      const actual = valueAt(parsed, check.jsonPath)
      return {
        passed:
          check.type === "jsonHas"
            ? actual !== undefined
            : Object.is(actual, check.value),
        evidence: `${check.path}#${check.jsonPath}: ${JSON.stringify(actual)}`,
      }
    }
    throw new Error(`Unknown check type: ${check.type}`)
  } catch (error) {
    return { passed: false, evidence: error.message }
  }
}

export function validateProtocol(protocol) {
  if (protocol?.schemaVersion !== 1 || !Array.isArray(protocol.tasks)) {
    throw new Error("Protocol must use schemaVersion 1 and contain a tasks array.")
  }
  const ids = new Set()
  const artifactDirs = new Set()
  for (const task of protocol.tasks) {
    if (!task.id || ids.has(task.id)) throw new Error(`Duplicate or missing task id: ${task.id}`)
    ids.add(task.id)
    if (
      typeof task.artifactDir !== "string" ||
      !/^[a-z0-9][a-z0-9._-]*$/.test(task.artifactDir) ||
      artifactDirs.has(task.artifactDir)
    ) {
      throw new Error(`Task ${task.id} has an unsafe or duplicate artifactDir.`)
    }
    artifactDirs.add(task.artifactDir)
    if (!FIXTURES.has(task.fixture)) {
      throw new Error(`Task ${task.id} has an unknown fixture: ${task.fixture}`)
    }
    if (!Number.isInteger(task.timeoutMs) || task.timeoutMs <= 0) {
      throw new Error(`Task ${task.id} has an invalid timeoutMs.`)
    }
    if (
      !Array.isArray(task.verification?.command) ||
      task.verification.command.length === 0 ||
      !task.verification.command.every((part) => typeof part === "string" && part) ||
      !Number.isInteger(task.verification.timeoutMs) ||
      task.verification.timeoutMs <= 0
    ) {
      throw new Error(`Task ${task.id} has an invalid verification command.`)
    }
    if (!Array.isArray(task.rules) || !Number.isFinite(task.maxPoints)) {
      throw new Error(`Task ${task.id} has an invalid rule set.`)
    }
    const ruleIds = new Set()
    for (const rule of task.rules) {
      if (!rule.id || ruleIds.has(rule.id) || !CHECK_TYPES.has(rule.check?.type)) {
        throw new Error(`Task ${task.id} has a duplicate, missing or invalid rule.`)
      }
      ruleIds.add(rule.id)
    }
    const points = task.rules.reduce((sum, rule) => sum + Number(rule.points || 0), 0)
    if (points !== task.maxPoints) {
      throw new Error(
        `Task ${task.id} rules total ${points}, expected maxPoints ${task.maxPoints}.`
      )
    }
  }
  return protocol
}

export function validateRun(run) {
  if (run?.schemaVersion !== 1 || typeof run.runId !== "string" || !run.runId) {
    throw new Error("Run must use schemaVersion 1 and have a runId.")
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(run.runId)) {
    throw new Error("runId must contain lowercase letters, numbers, dots, underscores or dashes.")
  }
  if (run.classification !== "real" && run.classification !== "synthetic") {
    throw new Error('Run classification must be "real" or "synthetic".')
  }
  if (!run.model || typeof run.model.name !== "string" || !run.model.name.trim()) {
    throw new Error("Run must identify model.name.")
  }
  if (!run.tasks || typeof run.tasks !== "object") {
    throw new Error("Run must contain a tasks object.")
  }
  if (run.classification === "real") {
    if (
      typeof run.model.version !== "string" ||
      !run.model.version.trim() ||
      typeof run.agent?.name !== "string" ||
      !run.agent.name.trim() ||
      typeof run.agent?.version !== "string" ||
      !run.agent.version.trim()
    ) {
      throw new Error("Real runs must identify model and agent versions.")
    }
    if (
      typeof run.environment?.os !== "string" ||
      typeof run.environment?.node !== "string" ||
      !run.capabilities ||
      !["network", "shell", "mcp"].every(
        (key) => typeof run.capabilities[key] === "boolean"
      )
    ) {
      throw new Error("Real runs must record environment and tool capabilities.")
    }
    if (
      run.execution?.runner !== "logic2b-agent-runner" ||
      typeof run.execution?.runnerVersion !== "string" ||
      !/^sha256-/.test(run.execution?.configSha256 ?? "") ||
      !/^sha256-/.test(run.execution?.protocolSha256 ?? "")
    ) {
      throw new Error("Real runs must originate from the versioned benchmark runner.")
    }
    const started = Date.parse(run.startedAt)
    const finished = Date.parse(run.finishedAt)
    if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
      throw new Error("Real runs must record valid ordered timestamps.")
    }
  }
  return run
}

export async function scoreRun(runDir, options = {}) {
  const runInfo = await lstat(runDir)
  if (runInfo.isSymbolicLink() || !runInfo.isDirectory()) {
    throw new Error(`Run root must be a regular directory: ${runDir}`)
  }
  const protocolPath = options.protocolPath ?? resolve(runDir, "../../protocol.json")
  const protocol = validateProtocol(await readJson(protocolPath, "protocol"))
  const run = validateRun(await readJson(resolve(runDir, "run.json"), "run manifest"))
  const tasks = []

  for (const task of protocol.tasks) {
    const taskRun = run.tasks[task.id] ?? {}
    const artifactRoot = resolve(runDir, "artifacts", task.artifactDir)
    const rules = []
    let earned = 0
    for (const rule of task.rules) {
      const result = await evaluate(rule.check, artifactRoot, taskRun)
      const points = result.passed ? rule.points : 0
      earned += points
      rules.push({
        id: rule.id,
        description: rule.description,
        passed: result.passed,
        points,
        maxPoints: rule.points,
        evidence: result.evidence,
      })
    }
    tasks.push({
      id: task.id,
      title: task.title,
      score: earned,
      maxScore: task.maxPoints,
      percent: Number(((earned / task.maxPoints) * 100).toFixed(1)),
      durationMs: Number.isFinite(taskRun.durationMs) ? taskRun.durationMs : null,
      toolCalls: Number.isFinite(taskRun.toolCalls) ? taskRun.toolCalls : null,
      rules,
    })
  }

  const score = tasks.reduce((sum, task) => sum + task.score, 0)
  const maxScore = tasks.reduce((sum, task) => sum + task.maxScore, 0)
  const durations = tasks.map((task) => task.durationMs).filter(Number.isFinite)

  return {
    schemaVersion: 1,
    protocolVersion: protocol.version,
    classification: run.classification,
    runId: run.runId,
    model: run.model,
    agent: run.agent ?? null,
    environment: run.environment ?? null,
    capabilities: run.capabilities ?? null,
    execution: run.execution ?? null,
    startedAt: run.startedAt ?? null,
    finishedAt: run.finishedAt ?? null,
    score,
    maxScore,
    percent: Number(((score / maxScore) * 100).toFixed(1)),
    durationMs: durations.length === tasks.length
      ? durations.reduce((sum, duration) => sum + duration, 0)
      : null,
    tasks,
  }
}

export function leaderboard(results) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    entries: results
      .filter((result) => result.classification === "real")
      .sort((a, b) => b.percent - a.percent || (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity))
      .map((result, index) => ({
        rank: index + 1,
        runId: result.runId,
        model: result.model,
        agent: result.agent,
        score: result.score,
        maxScore: result.maxScore,
        percent: result.percent,
        durationMs: result.durationMs,
        tasks: result.tasks.map((task) => ({
          id: task.id,
          percent: task.percent,
          durationMs: task.durationMs,
        })),
      })),
  }
}
