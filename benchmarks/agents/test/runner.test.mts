import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { after, before, describe, test } from "node:test"

import { scoreRun } from "../scripts/scorer.mjs"
import {
  runBenchmark,
  runProcess,
  validateRunnerConfig,
} from "../scripts/runner.mts"

const benchmarkRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceRoot = resolve(benchmarkRoot, "../..")
const protocolPath = resolve(benchmarkRoot, "protocol.json")
let root: string
let fakeAgent: string

before(async () => {
  root = await mkdtemp(join(tmpdir(), "logic2b-agent-runner-"))
  fakeAgent = join(root, "fake-agent.mjs")
  await writeFile(
    fakeAgent,
    `import { mkdir, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
console.log("LOGIC2B_TOOL_CALL")
console.error("LOGIC2B_TOOL_CALL")
await writeFile(join(process.env.LOGIC2B_BENCHMARK_WORKSPACE, "agent-output.txt"), process.env.LOGIC2B_BENCHMARK_TASK_ID)
await writeFile(join(process.env.LOGIC2B_BENCHMARK_WORKSPACE, "agent-workspace.txt"), process.env.LOGIC2B_BENCHMARK_WORKSPACE)
await writeFile(join(process.env.LOGIC2B_BENCHMARK_WORKSPACE, "bounded-source.txt"), "x".repeat(2000))
await mkdir(join(process.env.LOGIC2B_BENCHMARK_WORKSPACE, "node_modules"), { recursive: true })
await writeFile(join(process.env.LOGIC2B_BENCHMARK_WORKSPACE, "node_modules/never-publish.txt"), "transient")
await mkdir(join(process.env.LOGIC2B_BENCHMARK_WORKSPACE, "dist"), { recursive: true })
await writeFile(join(process.env.LOGIC2B_BENCHMARK_WORKSPACE, "dist/never-publish.txt"), "transient")
if (process.platform !== "win32") await symlink("agent-output.txt", join(process.env.LOGIC2B_BENCHMARK_WORKSPACE, "never-publish-link.txt"))
`,
  )
})

after(async () => {
  await rm(root, { recursive: true, force: true })
})

function config(runId: string) {
  return {
    schemaVersion: 1,
    runId,
    model: { name: "fixture-model", version: "1" },
    agent: { name: "fixture-agent", version: "1" },
    capabilities: { network: false, shell: true, mcp: false },
    command: {
      executable: process.execPath,
      args: [fakeAgent, "{prompt}", "{workspace}"],
      passEnv: [],
      toolCallMarker: "LOGIC2B_TOOL_CALL",
    },
    outputLimitBytes: 100_000,
  }
}

describe("runner config", () => {
  test("keeps the public example config executable by the validator", async () => {
    const example = JSON.parse(
      await readFile(join(benchmarkRoot, "config.example.json"), "utf8"),
    )
    const validated = validateRunnerConfig(example)
    assert.equal(validated.schemaVersion, 1)
    assert.equal(validated.command.args.includes("{workspace}"), true)
    assert.equal(validated.command.args.includes("{prompt}"), true)
  })

  test("accepts a secret-name allowlist but rejects embedded config values", () => {
    assert.equal(validateRunnerConfig(config("safe-run")).runId, "safe-run")
    assert.throws(
      () => validateRunnerConfig({ ...config("safe-run"), env: { TOKEN: "secret" } }),
      /unsupported keys: env/,
    )
    assert.throws(
      () => validateRunnerConfig({ ...config("../escape"), runId: "../escape" }),
      /runId/,
    )
  })
})

describe("process isolation controls", () => {
  test("terminates commands at their deadline", async () => {
    const result = await runProcess({
      command: [process.execPath, "-e", "setTimeout(() => {}, 10000)"],
      cwd: root,
      env: { PATH: process.env.PATH },
      stdoutPath: join(root, "timeout.stdout.log"),
      stderrPath: join(root, "timeout.stderr.log"),
      timeoutMs: 40,
      outputLimitBytes: 10_000,
    })
    assert.equal(result.timedOut, true)
    assert.ok(result.durationMs < 3_000)
  })

  test("terminates commands that exceed the transcript budget", async () => {
    const result = await runProcess({
      command: [
        process.execPath,
        "-e",
        'process.stdout.write("x".repeat(5000)); setTimeout(() => {}, 10000)',
      ],
      cwd: root,
      env: { PATH: process.env.PATH },
      stdoutPath: join(root, "limit.stdout.log"),
      stderrPath: join(root, "limit.stderr.log"),
      timeoutMs: 5_000,
      outputLimitBytes: 1_000,
    })
    assert.equal(result.outputLimitExceeded, true)
    assert.equal((await readFile(join(root, "limit.stdout.log"))).byteLength, 1_000)
  })
})

describe("real benchmark runner", () => {
  test("prepares deterministic fixtures and records observed execution metadata", async () => {
    const runsDir = join(root, "runs")
    const runId = "fixture-real-run"
    const { manifest, runDir } = await runBenchmark(config(runId), {
      sourceRoot,
      runsDir,
      protocolPath,
      verificationCommand: [process.execPath, "-e", "process.exit(0)"],
    })

    assert.equal(manifest.classification, "real")
    assert.equal(manifest.execution.runner, "logic2b-agent-runner")
    assert.equal(Object.keys(manifest.tasks).length, 3)
    assert.ok(
      Object.values(manifest.tasks).every(
        (task: any) =>
          task.status === "completed" &&
          task.toolCalls === 2 &&
          task.verification.buildExitCode === 0 &&
          task.artifact.limitExceeded === false &&
          /^sha256-/.test(task.fixture.sha256),
      ),
    )
    assert.match(
      await readFile(
        join(runDir, "artifacts/02-compose-settings/src/styles/theme.css"),
        "utf8",
      ),
      /--primary: oklch\(0\.546 0\.245 262\.881\);/,
    )
    assert.match(
      await readFile(
        join(
          runDir,
          "artifacts/02-compose-settings/src/components/ui/switch.tsx",
        ),
        "utf8",
      ),
      /data-slot="switch"/,
    )
    assert.equal(
      manifest.tasks["scaffold-dashboard"].fixture.files,
      0,
      "the scaffold task starts empty before agent execution",
    )
    assert.equal(
      await readFile(
        join(runDir, "artifacts/03-scaffold-dashboard/agent-output.txt"),
        "utf8",
      ),
      "scaffold-dashboard",
    )
    assert.equal(
      (
        await readFile(
          join(runDir, "artifacts/03-scaffold-dashboard/agent-workspace.txt"),
          "utf8",
        )
      ).startsWith(sourceRoot),
      false,
      "agent staging stays outside the source repository",
    )
    await assert.rejects(
      () =>
        readFile(
          join(
            runDir,
            "artifacts/03-scaffold-dashboard/node_modules/never-publish.txt",
          ),
        ),
      /ENOENT/,
    )
    if (process.platform !== "win32") {
      assert.ok(
        Object.values(manifest.tasks).every(
          (task: any) => task.artifact.symlinksExcluded === 1,
        ),
      )
      await assert.rejects(
        () =>
          readFile(
            join(
              runDir,
              "artifacts/03-scaffold-dashboard/never-publish-link.txt",
            ),
          ),
        /ENOENT/,
      )
    }
    await assert.rejects(
      () =>
        readFile(
          join(runDir, "artifacts/03-scaffold-dashboard/dist/never-publish.txt"),
        ),
      /ENOENT/,
    )

    const scored = await scoreRun(runDir, { protocolPath })
    assert.equal(scored.classification, "real")
    assert.equal(scored.protocolVersion, "1.1.0")
    await assert.rejects(
      () =>
        runBenchmark(config(runId), {
          sourceRoot,
          runsDir,
          protocolPath,
          verificationCommand: [process.execPath, "-e", "process.exit(0)"],
        }),
      /already exists/,
    )
  })

  test("does not verify or publish artifacts over the source budget", async () => {
    const limited = { ...config("artifact-limited-run"), artifactLimitBytes: 1_000 }
    const { manifest, runDir } = await runBenchmark(limited, {
      sourceRoot,
      runsDir: join(root, "limited-runs"),
      protocolPath,
      verificationCommand: [process.execPath, "-e", "process.exit(0)"],
    })
    assert.ok(
      Object.values(manifest.tasks).every(
        (task: any) =>
          task.status === "artifact-limit" &&
          task.artifact.limitExceeded === true &&
          task.verification.buildExitCode === null,
      ),
    )
    await assert.rejects(
      () =>
        readFile(
          join(
            runDir,
            "artifacts/01-install-and-theme/src/App.tsx",
          ),
        ),
      /ENOENT/,
    )
  })
})
