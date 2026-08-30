import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import type { FetchLike } from "../src/lib.ts"
import { scaffoldProject } from "../src/scaffold.ts"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const registryDir = join(repoRoot, "apps/web/public/r")

const fetchImpl: FetchLike = async (input) => {
  const url = new URL(input)
  if (!url.pathname.startsWith("/r/")) {
    return { ok: false, status: 404, text: async () => "Not found" }
  }
  const registryPath = decodeURIComponent(url.pathname.slice(3))
  if (
    !registryPath.endsWith(".json") ||
    registryPath
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return { ok: false, status: 404, text: async () => "Not found" }
  }
  try {
    const content = await readFile(join(registryDir, registryPath), "utf8")
    return { ok: true, status: 200, text: async () => content }
  } catch {
    return { ok: false, status: 404, text: async () => "Not found" }
  }
}

const root = await mkdtemp(join(tmpdir(), "logic2b-cli-scaffold-verification-"))
let passed = false

try {
  await scaffoldProject({
    cwd: root,
    registry: "https://ui.logic2b.com",
    registryVersion: "1.0.0-rc.16",
    framework: "vite",
    starter: "marketing",
    name: "verified-platform",
    monorepo: true,
    packageManager: "pnpm",
    install: false,
    fetchImpl,
  })

  const install = spawnSync("pnpm", ["install", "--frozen-lockfile=false"], {
    cwd: root,
    env: { ...process.env, CI: "true" },
    stdio: "inherit",
  })
  if (install.status !== 0) {
    throw new Error(`generated workspace install failed (${install.status})`)
  }

  const build = spawnSync("pnpm", ["run", "build"], {
    cwd: root,
    env: { ...process.env, CI: "true" },
    stdio: "inherit",
  })
  if (build.status !== 0) {
    throw new Error(`generated workspace build failed (${build.status})`)
  }

  passed = true
  console.log(`✓ CLI monorepo scaffold installs and builds (${root})`)
} finally {
  if (passed) await rm(root, { recursive: true, force: true })
  else console.error(`Scaffold verification kept at ${root}`)
}
