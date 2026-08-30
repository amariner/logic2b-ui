import { resolve } from "node:path"

import {
  loadRunnerConfig,
  runBenchmark,
} from "./runner.mts"

const args = process.argv.slice(2)
const resume = args.includes("--resume")
const validateOnly = args.includes("--validate")
const positional = args.filter((arg) => !arg.startsWith("--"))
const unknown = args.filter(
  (arg) => arg.startsWith("--") && arg !== "--resume" && arg !== "--validate",
)

if (unknown.length > 0 || positional.length !== 1) {
  console.error(
    "Usage: pnpm --dir benchmarks/agents benchmark <config.json> [--validate] [--resume]",
  )
  if (unknown.length > 0) console.error(`Unknown options: ${unknown.join(", ")}`)
  process.exitCode = 1
} else {
  const configPath = resolve(positional[0])
  const config = await loadRunnerConfig(configPath)
  if (validateOnly) {
    console.log(
      `✓ runner config valid: ${config.runId} (${config.model.name} via ${config.agent.name})`,
    )
  } else {
    const { manifest, runDir } = await runBenchmark(config, { resume })
    for (const [taskId, task] of Object.entries(manifest.tasks) as [string, any][]) {
      console.log(
        `✓ ${taskId}: ${task.status}, ${task.durationMs} ms, ${task.toolCalls} tool call(s), build ${task.verification.buildExitCode}`,
      )
    }
    console.log(`✓ real run recorded: ${runDir}`)
    console.log(`Next: pnpm --dir benchmarks/agents score ${config.runId}`)
  }
}
