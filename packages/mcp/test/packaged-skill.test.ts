import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { promisify } from "node:util"

const exec = promisify(execFile)
const copyScript = new URL("../scripts/copy-skills.mjs", import.meta.url)

test("MCP publishes only the canonical skill path in addition to its existing files", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
  assert.deepEqual(manifest.files, ["dist", "CHANGELOG.md", "skills/logic2b-ui/SKILL.md"])
  assert.equal(manifest.scripts.prepack, "tsup && node scripts/copy-skills.mjs")
  const canonical = await readFile(new URL("../../../skills/logic2b-ui/SKILL.md", import.meta.url), "utf8")
  assert.match(canonical, /^---\nname: logic2b-ui\n/)
  assert.match(canonical, /only\s+(?:tools|when discovery confirms)/)
  assert.doesNotMatch(canonical, /always\s+(?:run\s+)?`?review_ui|always\s+(?:use\s+)?`?compose_plan/)
})

test("prepack stages exact canonical bytes and refreshes a stale generated copy without executing content", async () => {
  const root = await mkdtemp(join(tmpdir(), "logic2b-packaged-skill-"))
  try {
    const canonical = join(root, "skills/logic2b-ui/SKILL.md")
    const script = join(root, "packages/mcp/scripts/copy-skills.mjs")
    const staged = join(root, "packages/mcp/skills/logic2b-ui/SKILL.md")
    await mkdir(dirname(canonical), { recursive: true })
    await mkdir(dirname(script), { recursive: true })
    await copyFile(copyScript, script)
    const original = "---\nname: logic2b-ui\n---\nUTF-8: à · 😀\nprocess.exit(99) is inert skill text.\n"
    await writeFile(canonical, original)
    await exec(process.execPath, [script])
    assert.equal(await readFile(staged, "utf8"), original)
    await writeFile(canonical, `${original}Updated instructions.\n`)
    await exec(process.execPath, [script])
    assert.equal(await readFile(staged, "utf8"), `${original}Updated instructions.\n`)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
