import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { updateComponents, type FetchLike } from "../src/lib.ts"
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

  const app = join(root, "apps/web")
  const policy = "# Consumer policy\r\nKeep the app's native controls and wrappers.\r\n\r\n"
  const notes = "\r\n# Consumer notes\r\nThese instructions belong to our project.\r\n"
  for (const [path, kind] of [["AGENTS.md", "rules"], ["DESIGN.md", "design"]]) {
    const content = await readFile(join(app, path), "utf8")
    assert.match(content, new RegExp(`logic2b:${kind}:start v1`))
    assert.equal((content.match(new RegExp(`logic2b:${kind}:start`, "g")) ?? []).length, 1)
    await writeFile(join(app, path), `${policy}${content}${notes}`)
  }
  await updateComponents(["navbar-01"], {
    cwd: app,
    registry: "https://ui.logic2b.com",
    registryVersion: "1.0.0-rc.16",
    install: false,
    fetchImpl,
  })
  for (const [path, kind] of [["AGENTS.md", "rules"], ["DESIGN.md", "design"]]) {
    const refreshed = await readFile(join(app, path), "utf8")
    assert.ok(refreshed.startsWith(policy), `${path} lost the consumer prefix`)
    assert.ok(refreshed.endsWith(notes), `${path} lost the consumer suffix`)
    assert.equal((refreshed.match(new RegExp(`logic2b:${kind}:start`, "g")) ?? []).length, 1)
  }

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
  console.log(`✓ CLI monorepo scaffold preserves agent/design content through update, installs and builds (${root})`)
} finally {
  if (passed) await rm(root, { recursive: true, force: true })
  else console.error(`Scaffold verification kept at ${root}`)
}
