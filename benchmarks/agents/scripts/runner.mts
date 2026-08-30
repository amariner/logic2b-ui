import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { createWriteStream } from "node:fs"
import {
  cp,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import { arch, platform, release, tmpdir } from "node:os"
import { dirname, relative, resolve, sep } from "node:path"
import { finished } from "node:stream/promises"
import { fileURLToPath } from "node:url"

import { validateProtocol } from "./scorer.mjs"
import { FIXTURE_IDS, prepareFixture, type FixtureId } from "./fixtures.mts"

export const RUNNER_VERSION = "1.0.0"
const DEFAULT_OUTPUT_LIMIT = 20_000_000
const DEFAULT_ARTIFACT_LIMIT = 100_000_000
const ARTIFACT_EXCLUDES = new Set([
  ".astro",
  ".git",
  ".next",
  ".output",
  ".turbo",
  "dist",
  "node_modules",
])
const STANDARD_ENV = [
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "TMPDIR",
  "TMP",
  "TEMP",
  "SystemRoot",
  "ComSpec",
  "PATHEXT",
  "XDG_CONFIG_HOME",
  "PNPM_HOME",
  "COREPACK_HOME",
]
const TERMINAL_TASK_STATES = new Set([
  "completed",
  "agent-failed",
  "timed-out",
  "output-limit",
  "artifact-limit",
])

type CommandConfig = {
  executable: string
  args: string[]
  passEnv?: string[]
  toolCallMarker: string
}

export type RunnerConfig = {
  schemaVersion: 1
  runId: string
  model: { name: string; version: string }
  agent: { name: string; version: string }
  capabilities: { network: boolean; shell: boolean; mcp: boolean }
  command: CommandConfig
  outputLimitBytes?: number
  artifactLimitBytes?: number
}

type ProcessResult = {
  exitCode: number | null
  signal: NodeJS.Signals | null
  durationMs: number
  timedOut: boolean
  outputLimitExceeded: boolean
  spawnError: string | null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) {
    throw new Error(`${label} contains unsupported keys: ${unknown.join(", ")}`)
  }
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`)
  }
  return value
}

export function validateRunnerConfig(value: unknown): RunnerConfig {
  if (!isObject(value) || value.schemaVersion !== 1) {
    throw new Error("Runner config must use schemaVersion 1.")
  }
  assertKeys(
    value,
    [
      "schemaVersion",
      "$schema",
      "runId",
      "model",
      "agent",
      "capabilities",
      "command",
      "outputLimitBytes",
      "artifactLimitBytes",
    ],
    "Runner config",
  )
  const runId = requiredText(value.runId, "runId")
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(runId)) {
    throw new Error(
      "runId must contain lowercase letters, numbers, dots, underscores or dashes.",
    )
  }
  if (!isObject(value.model) || !isObject(value.agent)) {
    throw new Error("Runner config must identify model and agent objects.")
  }
  assertKeys(value.model, ["name", "version"], "model")
  assertKeys(value.agent, ["name", "version"], "agent")
  if (!isObject(value.capabilities)) {
    throw new Error("Runner config must declare capabilities.")
  }
  assertKeys(
    value.capabilities,
    ["network", "shell", "mcp"],
    "capabilities",
  )
  for (const key of ["network", "shell", "mcp"]) {
    if (typeof value.capabilities[key] !== "boolean") {
      throw new Error(`capabilities.${key} must be boolean.`)
    }
  }
  if (!isObject(value.command)) {
    throw new Error("Runner config must declare a command object.")
  }
  assertKeys(
    value.command,
    ["executable", "args", "passEnv", "toolCallMarker"],
    "command",
  )
  if (
    !Array.isArray(value.command.args) ||
    !value.command.args.every((arg) => typeof arg === "string")
  ) {
    throw new Error("command.args must be an array of strings.")
  }
  const passEnv = value.command.passEnv ?? []
  if (
    !Array.isArray(passEnv) ||
    !passEnv.every(
      (name) => typeof name === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name),
    )
  ) {
    throw new Error("command.passEnv must contain environment variable names.")
  }
  if (new Set(passEnv).size !== passEnv.length) {
    throw new Error("command.passEnv must not contain duplicates.")
  }
  const outputLimitValue = value.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT
  if (
    typeof outputLimitValue !== "number" ||
    !Number.isInteger(outputLimitValue) ||
    outputLimitValue < 1_000 ||
    outputLimitValue > 100_000_000
  ) {
    throw new Error("outputLimitBytes must be an integer from 1,000 to 100,000,000.")
  }
  const artifactLimitValue = value.artifactLimitBytes ?? DEFAULT_ARTIFACT_LIMIT
  if (
    typeof artifactLimitValue !== "number" ||
    !Number.isInteger(artifactLimitValue) ||
    artifactLimitValue < 1_000 ||
    artifactLimitValue > 1_000_000_000
  ) {
    throw new Error(
      "artifactLimitBytes must be an integer from 1,000 to 1,000,000,000.",
    )
  }
  return {
    schemaVersion: 1,
    runId,
    model: {
      name: requiredText(value.model.name, "model.name"),
      version: requiredText(value.model.version, "model.version"),
    },
    agent: {
      name: requiredText(value.agent.name, "agent.name"),
      version: requiredText(value.agent.version, "agent.version"),
    },
    capabilities: value.capabilities as RunnerConfig["capabilities"],
    command: {
      executable: requiredText(value.command.executable, "command.executable"),
      args: value.command.args as string[],
      passEnv: passEnv as string[],
      toolCallMarker: requiredText(
        value.command.toolCallMarker,
        "command.toolCallMarker",
      ),
    },
    outputLimitBytes: outputLimitValue,
    artifactLimitBytes: artifactLimitValue,
  }
}

function sha256(value: string | Buffer): string {
  return `sha256-${createHash("sha256").update(value).digest("base64")}`
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`)
  await rename(temp, path)
}

function minimalEnv(extraNames: string[] = []): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const name of [...STANDARD_ENV, ...extraNames]) {
    const value = process.env[name]
    if (value !== undefined) env[name] = value
  }
  return env
}

function terminate(child: ReturnType<typeof spawn>, signal: NodeJS.Signals) {
  if (!child.pid) return
  try {
    if (platform() === "win32") child.kill(signal)
    else process.kill(-child.pid, signal)
  } catch {
    child.kill(signal)
  }
}

export async function runProcess(options: {
  command: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  stdoutPath: string
  stderrPath: string
  timeoutMs: number
  outputLimitBytes: number
}): Promise<ProcessResult> {
  if (options.command.length === 0 || !options.command[0]) {
    throw new Error("Cannot run an empty command.")
  }
  await mkdir(dirname(options.stdoutPath), { recursive: true })
  const stdout = createWriteStream(options.stdoutPath, { flags: "w" })
  const stderr = createWriteStream(options.stderrPath, { flags: "w" })
  const started = performance.now()
  let bytes = 0
  let timedOut = false
  let outputLimitExceeded = false
  let spawnError: string | null = null
  let forceTimer: NodeJS.Timeout | undefined

  const child = spawn(options.command[0], options.command.slice(1), {
    cwd: options.cwd,
    env: options.env,
    shell: false,
    detached: platform() !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  })

  const consume = (chunk: Buffer, stream: NodeJS.WritableStream) => {
    const remaining = Math.max(0, options.outputLimitBytes - bytes)
    if (remaining > 0) stream.write(chunk.subarray(0, remaining))
    bytes += chunk.byteLength
    if (bytes > options.outputLimitBytes && !outputLimitExceeded) {
      outputLimitExceeded = true
      terminate(child, "SIGTERM")
      forceTimer = setTimeout(() => terminate(child, "SIGKILL"), 2_000)
    }
  }
  child.stdout.on("data", (chunk: Buffer) => consume(chunk, stdout))
  child.stderr.on("data", (chunk: Buffer) => consume(chunk, stderr))

  const timeout = setTimeout(() => {
    timedOut = true
    terminate(child, "SIGTERM")
    forceTimer = setTimeout(() => terminate(child, "SIGKILL"), 2_000)
  }, options.timeoutMs)

  const closed = await new Promise<{
    code: number | null
    signal: NodeJS.Signals | null
  }>((resolvePromise) => {
    let resolved = false
    const finish = (code: number | null, signal: NodeJS.Signals | null) => {
      if (resolved) return
      resolved = true
      resolvePromise({ code, signal })
    }
    child.on("error", (error) => {
      spawnError = error.message
      finish(null, null)
    })
    child.on("close", finish)
  })
  clearTimeout(timeout)
  if (forceTimer) clearTimeout(forceTimer)
  stdout.end()
  stderr.end()
  await Promise.all([finished(stdout), finished(stderr)])

  return {
    exitCode: closed.code,
    signal: closed.signal,
    durationMs: Math.round(performance.now() - started),
    timedOut,
    outputLimitExceeded,
    spawnError,
  }
}

function expand(value: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replaceAll(`{${key}}`, replacement),
    value,
  )
}

async function countMarker(paths: string[], marker: string): Promise<number> {
  let count = 0
  for (const path of paths) {
    const text = await readFile(path, "utf8")
    let offset = 0
    while ((offset = text.indexOf(marker, offset)) !== -1) {
      count++
      offset += marker.length
    }
  }
  return count
}

function taskPrompt(task: { prompt: string; id: string }, preset: string) {
  return `${task.prompt}\n\nBenchmark preset id: ${preset}\nTask id: ${task.id}\n`
}

async function copyAgentArtifact(
  source: string,
  target: string,
  limitBytes: number,
) {
  let bytes = 0
  let files = 0
  let symlinksExcluded = 0
  async function inspect(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (ARTIFACT_EXCLUDES.has(entry.name)) continue
      const path = resolve(dir, entry.name)
      const info = await lstat(path)
      if (info.isSymbolicLink()) {
        symlinksExcluded++
      } else if (info.isDirectory()) {
        await inspect(path)
      } else if (info.isFile()) {
        files++
        bytes += info.size
      }
      if (bytes > limitBytes) return
    }
  }
  await inspect(source)
  await rm(target, { recursive: true, force: true })
  if (bytes > limitBytes) {
    return { bytes, files, symlinksExcluded, limitExceeded: true }
  }
  await cp(source, target, {
    recursive: true,
    async filter(path) {
      const rel = relative(source, path)
      if (!rel) return true
      if (rel.split(sep).some((part) => ARTIFACT_EXCLUDES.has(part))) return false
      return !(await lstat(path)).isSymbolicLink()
    },
  })
  return { bytes, files, symlinksExcluded, limitExceeded: false }
}

async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf8"))
}

export async function runBenchmark(
  rawConfig: unknown,
  options: {
    resume?: boolean
    sourceRoot?: string
    runsDir?: string
    protocolPath?: string
    verificationCommand?: string[]
  } = {},
) {
  const config = validateRunnerConfig(rawConfig)
  for (const name of config.command.passEnv ?? []) {
    if (process.env[name] === undefined) {
      throw new Error(`Required pass-through environment variable is missing: ${name}`)
    }
  }

  const defaultRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../..",
  )
  const sourceRoot = resolve(options.sourceRoot ?? defaultRoot)
  const runsDir = resolve(
    options.runsDir ?? resolve(sourceRoot, "benchmarks/agents/runs"),
  )
  const protocolPath = resolve(
    options.protocolPath ?? resolve(sourceRoot, "benchmarks/agents/protocol.json"),
  )
  const protocolRaw = await readFile(protocolPath, "utf8")
  const protocol = validateProtocol(JSON.parse(protocolRaw))
  const configHash = sha256(JSON.stringify(config))
  const runDir = resolve(runsDir, config.runId)
  const manifestPath = resolve(runDir, "run.json")
  const configPath = resolve(runDir, "runner-config.json")

  let manifest: Record<string, any>
  try {
    const info = await lstat(runDir)
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new Error(`Run target is not a regular directory: ${runDir}`)
    }
    if (!options.resume) {
      throw new Error(
        `Run ${config.runId} already exists. Use --resume to continue its incomplete tasks.`,
      )
    }
    manifest = await readJson(manifestPath)
    if (manifest.execution?.configSha256 !== configHash) {
      throw new Error("Cannot resume: runner config does not match the existing run.")
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    if (options.resume) throw new Error(`Cannot resume missing run: ${config.runId}`)
    await mkdir(runDir, { recursive: true })
    manifest = {
      schemaVersion: 1,
      classification: "real",
      runId: config.runId,
      protocolVersion: protocol.version,
      model: config.model,
      agent: config.agent,
      capabilities: config.capabilities,
      environment: {
        os: `${platform()} ${release()}`,
        arch: arch(),
        node: process.version,
      },
      execution: {
        runner: "logic2b-agent-runner",
        runnerVersion: RUNNER_VERSION,
        configSha256: configHash,
        protocolSha256: sha256(protocolRaw),
        artifactExcludes: [...ARTIFACT_EXCLUDES].sort(),
      },
      startedAt: new Date().toISOString(),
      finishedAt: null,
      tasks: {},
    }
    await atomicJson(configPath, config)
    await atomicJson(manifestPath, manifest)
  }

  const stagingRoot = await mkdtemp(
    resolve(tmpdir(), `logic2b-agent-${config.runId}-`),
  )
  try {
    for (const task of protocol.tasks) {
      if (TERMINAL_TASK_STATES.has(manifest.tasks[task.id]?.status)) continue
      if (!FIXTURE_IDS.includes(task.fixture as FixtureId)) {
        throw new Error(`Task ${task.id} declares unknown fixture ${task.fixture}.`)
      }
      const workspace = resolve(stagingRoot, task.artifactDir)
      const artifactTarget = resolve(runDir, "artifacts", task.artifactDir)
      await rm(workspace, { recursive: true, force: true })
      const fixture = await prepareFixture({
        id: task.fixture as FixtureId,
        workspace,
        sourceRoot,
        preset: protocol.preset,
      })
      const taskStartedAt = new Date().toISOString()
      manifest.tasks[task.id] = {
        status: "running",
        startedAt: taskStartedAt,
        fixture: { id: task.fixture, ...fixture },
      }
      await atomicJson(manifestPath, manifest)

      const prompt = taskPrompt(task, protocol.preset)
      const replacements = {
        prompt,
        preset: protocol.preset,
        taskId: task.id,
        workspace,
      }
      const agentCommand = [
        config.command.executable,
        ...config.command.args.map((arg) => expand(arg, replacements)),
      ]
      const transcriptRoot = resolve(runDir, "transcripts")
      const agentStdout = resolve(transcriptRoot, `${task.id}.stdout.log`)
      const agentStderr = resolve(transcriptRoot, `${task.id}.stderr.log`)
      const agentResult = await runProcess({
        command: agentCommand,
        cwd: workspace,
        env: {
          ...minimalEnv(config.command.passEnv),
          LOGIC2B_BENCHMARK_PROMPT: prompt,
          LOGIC2B_BENCHMARK_PRESET: protocol.preset,
          LOGIC2B_BENCHMARK_TASK_ID: task.id,
          LOGIC2B_BENCHMARK_WORKSPACE: workspace,
        },
        stdoutPath: agentStdout,
        stderrPath: agentStderr,
        timeoutMs: task.timeoutMs,
        outputLimitBytes: config.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT,
      })
      const toolCalls = await countMarker(
        [agentStdout, agentStderr],
        config.command.toolCallMarker,
      )

      // Preserve exactly what the agent left before the evaluator executes any
      // project code. Dependencies and generated build caches never publish.
      const artifact = await copyAgentArtifact(
        workspace,
        artifactTarget,
        config.artifactLimitBytes ?? DEFAULT_ARTIFACT_LIMIT,
      )

      const verificationCommand =
        options.verificationCommand ?? task.verification.command
      const verifyStdout = resolve(transcriptRoot, `${task.id}.verify.stdout.log`)
      const verifyStderr = resolve(transcriptRoot, `${task.id}.verify.stderr.log`)
      let verification: ProcessResult
      if (artifact.limitExceeded) {
        await mkdir(dirname(verifyStdout), { recursive: true })
        await writeFile(verifyStdout, "")
        await writeFile(
          verifyStderr,
          `Build skipped: source artifact exceeded ${config.artifactLimitBytes} bytes.\n`,
        )
        verification = {
          exitCode: null,
          signal: null,
          durationMs: 0,
          timedOut: false,
          outputLimitExceeded: false,
          spawnError: "Build skipped because the source artifact exceeded its limit.",
        }
      } else {
        verification = await runProcess({
          command: verificationCommand,
          cwd: workspace,
          env: minimalEnv(),
          stdoutPath: verifyStdout,
          stderrPath: verifyStderr,
          timeoutMs: task.verification.timeoutMs,
          outputLimitBytes: config.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT,
        })
      }
      const status = agentResult.timedOut
        ? "timed-out"
        : agentResult.outputLimitExceeded
          ? "output-limit"
          : artifact.limitExceeded
            ? "artifact-limit"
          : agentResult.exitCode === 0
            ? "completed"
            : "agent-failed"
      manifest.tasks[task.id] = {
        status,
        startedAt: taskStartedAt,
        finishedAt: new Date().toISOString(),
        fixture: { id: task.fixture, ...fixture },
        durationMs: agentResult.durationMs,
        toolCalls,
        artifact,
        agent: agentResult,
        verification: {
          buildExitCode: verification.exitCode,
          durationMs: verification.durationMs,
          timedOut: verification.timedOut,
          outputLimitExceeded: verification.outputLimitExceeded,
          spawnError: verification.spawnError,
        },
      }
      await atomicJson(manifestPath, manifest)
    }
  } finally {
    await rm(stagingRoot, { recursive: true, force: true })
  }

  manifest.finishedAt = new Date().toISOString()
  await atomicJson(manifestPath, manifest)
  return { manifest, runDir }
}

export async function loadRunnerConfig(path: string): Promise<RunnerConfig> {
  return validateRunnerConfig(await readJson(resolve(path)))
}
