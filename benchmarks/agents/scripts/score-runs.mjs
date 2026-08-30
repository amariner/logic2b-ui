import { mkdir, readdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { leaderboard, scoreRun } from "./scorer.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const runsDir = resolve(root, "runs")
const resultsDir = resolve(root, "results")
const protocolPath = resolve(root, "protocol.json")
const requested = process.argv.slice(2)
for (const runId of requested) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(runId)) {
    throw new Error(`Unsafe run id: ${runId}`)
  }
}
const entries = requested.length
  ? requested
  : (await readdir(runsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

await mkdir(resultsDir, { recursive: true })
const results = []
for (const entry of entries) {
  const result = await scoreRun(resolve(runsDir, entry), { protocolPath })
  results.push(result)
  await writeFile(
    resolve(resultsDir, `${result.runId}.json`),
    `${JSON.stringify(result, null, 2)}\n`
  )
  console.log(`✓ ${result.runId}: ${result.score}/${result.maxScore} (${result.percent}%)`)
}

const board = leaderboard(results)
await writeFile(resolve(resultsDir, "leaderboard.json"), `${JSON.stringify(board, null, 2)}\n`)
console.log(`✓ leaderboard: ${board.entries.length} real run(s)`)
