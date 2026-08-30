import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { prepareFixture } from "./fixtures.mts"

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const protocol = JSON.parse(
  await readFile(resolve(sourceRoot, "benchmarks/agents/protocol.json"), "utf8"),
)
const root = await mkdtemp(resolve(tmpdir(), "logic2b-agent-fixtures-"))
let passed = false

try {
  const base = await prepareFixture({
    id: "vite-base",
    workspace: resolve(root, "apps/install"),
    sourceRoot,
    preset: protocol.preset,
  })
  const settings = await prepareFixture({
    id: "vite-settings",
    workspace: resolve(root, "apps/settings"),
    sourceRoot,
    preset: protocol.preset,
  })
  const empty = await prepareFixture({
    id: "empty",
    workspace: resolve(root, "empty"),
    sourceRoot,
    preset: protocol.preset,
  })
  if (empty.files !== 0) throw new Error("The scaffold-dashboard fixture is not empty.")

  await writeFile(
    resolve(root, "package.json"),
    `${JSON.stringify(
      {
        name: "logic2b-agent-fixture-verification",
        private: true,
        packageManager: "pnpm@11.10.0",
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    resolve(root, "pnpm-workspace.yaml"),
    'packages:\n  - "apps/*"\nverifyDepsBeforeRun: false\nallowBuilds:\n  esbuild: true\n',
  )

  const install = spawnSync("pnpm", ["install", "--frozen-lockfile=false"], {
    cwd: root,
    stdio: "inherit",
  })
  if (install.status !== 0) {
    throw new Error(`Fixture install exited ${install.status ?? "without a status"}.`)
  }
  const build = spawnSync("pnpm", ["-r", "--workspace-concurrency=1", "run", "build"], {
    cwd: root,
    stdio: "inherit",
  })
  if (build.status !== 0) {
    throw new Error(`Fixture build exited ${build.status ?? "without a status"}.`)
  }

  passed = true
  console.log(
    `✓ benchmark fixtures install and build (vite-base ${base.sha256}, vite-settings ${settings.sha256}, empty ${empty.sha256})`,
  )
} finally {
  if (passed) await rm(root, { recursive: true, force: true })
  else console.error(`Benchmark fixture workspace kept for inspection: ${root}`)
}
