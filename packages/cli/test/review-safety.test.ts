import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test, type TestContext } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { reviewLocalFiles } from "../src/review.ts"

const execute = promisify(execFile)
const loader = createRequire(import.meta.url).resolve("tsx")
const cli = fileURLToPath(new URL("../src/index.ts", import.meta.url))
const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const named = 'export const UI = () => <button aria-label="Save customer"/>\n'
async function fixture(context: TestContext, files: Record<string, string> = { "src/App.tsx": named }) {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), "logic2b-review-safety-")))
  context.after(async () => { await rm(cwd, { recursive: true, force: true }); await rm(`${cwd}-moved`, { recursive: true, force: true }) })
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true })
    await writeFile(join(cwd, path), content)
  }
  return cwd
}
async function tree(cwd: string, prefix = ""): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const entry of await readdir(join(cwd, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) Object.assign(result, await tree(cwd, path))
    else if (entry.isFile()) result[path] = createHash("sha256").update(await readFile(join(cwd, path))).digest("hex")
  }
  return result
}

test("hardened review retains directories, in-root absolute paths and ancestor aliases", async context => {
  const cwd = await fixture(context, {
    "src/deep/App.tsx": named,
    "src/note.md": "PRIVATE_UNSELECTED_TEXT",
    "src/node_modules/dependency.tsx": "throw new Error('UNSELECTED_DEPENDENCY')",
  })
  await symlink(join(cwd, "src"), join(cwd, "alias"), "dir")
  const before = await tree(cwd)
  const options = { cwd, completeLabelContext: true, scope: ["a11y"] as const }
  const directory = await reviewLocalFiles({ ...options, scope: [...options.scope], paths: ["src"] })
  const absolute = await reviewLocalFiles({ ...options, scope: [...options.scope], paths: [join(cwd, "src/deep/App.tsx")] })
  const alias = await reviewLocalFiles({ ...options, scope: [...options.scope], paths: ["alias/deep/App.tsx"] })
  assert.deepEqual(directory, absolute)
  assert.deepEqual(alias, absolute)
  assert.equal(directory.summary.errors, 0)
  assert.equal(JSON.stringify(directory).includes("PRIVATE_UNSELECTED_TEXT"), false)
  assert.deepEqual(await tree(cwd), before)
})

test("hardened review retains the 256 KiB single-file boundary and directory file-count limit", async context => {
  const padded = `/*${"x".repeat(256 * 1024 - named.length - 4)}*/${named}`
  const cwd = await fixture(context, { "large.tsx": padded })
  assert.equal((await reviewLocalFiles({ cwd, paths: ["large.tsx"] })).summary.errors, 0)
  await writeFile(join(cwd, "large.tsx"), padded + " ")
  await assert.rejects(reviewLocalFiles({ cwd, paths: ["large.tsx"] }), /256 KiB/)
  await mkdir(join(cwd, "src"))
  for (let index = 0; index < 64; index++) await writeFile(join(cwd, `src/f${index}.tsx`), named)
  assert.equal((await reviewLocalFiles({ cwd, paths: ["src"] })).summary.errors, 0)
  await writeFile(join(cwd, "src/overflow.tsx"), named)
  await assert.rejects(reviewLocalFiles({ cwd, paths: ["src"] }), /64 files/)
})

test("review filesystem failures retain exit 2 without exposing absolute local paths", async context => {
  const cwd = await fixture(context)
  for (const [selectedRoot, path] of [[cwd, "src/missing.tsx"], [join(cwd, "PRIVATE_MISSING_ROOT"), "src/App.tsx"]]) {
    await assert.rejects(execute(process.execPath, ["--import", loader, cli, "review", path, "--cwd", selectedRoot, "--json"], { cwd: packageRoot, timeout: 10_000 }), (error: unknown) => {
      assert.ok(error && typeof error === "object" && "code" in error && "stdout" in error && "stderr" in error)
      assert.equal(error.code, 2)
      assert.equal(error.stdout, "")
      assert.match(String(error.stderr), /Cannot read review .*ENOENT/)
      assert.equal(String(error.stderr).includes(cwd), false)
      assert.equal(String(error.stderr).includes("PRIVATE_MISSING_ROOT"), false)
      return true
    })
  }
})

// Each child patches only its builtin filesystem bindings, then calls the real
// adapter. This deterministically exercises the race windows with real files
// without production hooks or global patches shared by parallel tests.
const racingChild = `
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
const [cwd, mode] = process.argv.slice(1);
const target = join(cwd, "src/App.tsx");
const originalOpen = fs.open.bind(fs);
let changed = false;
fs.open = async (path, flags, ...rest) => {
  if (path === target && mode === "fifo" && !changed) {
    changed = true;
    await fs.rm(target);
    const result = spawnSync("mkfifo", [target], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
  }
  const handle = await originalOpen(path, flags, ...rest);
  if (path === target && mode !== "fifo") {
    const read = handle.read.bind(handle);
    handle.read = async (...args) => {
      const result = await read(...args);
      if (result.bytesRead && !changed) {
        changed = true;
        if (mode === "root") {
          await fs.rename(cwd, cwd + "-moved");
          await fs.mkdir(join(cwd, "src"), { recursive: true });
          await fs.writeFile(target, "<button/>");
        } else if (mode === "alias") {
          await fs.mkdir(join(cwd, "replacement"));
          await fs.writeFile(join(cwd, "replacement/App.tsx"), "<button/>");
          await fs.rm(join(cwd, "alias"));
          await fs.symlink(join(cwd, "replacement"), join(cwd, "alias"), "dir");
        } else {
          await fs.rename(join(cwd, "src"), join(cwd, "original-src"));
          await fs.mkdir(join(cwd, "src"));
          await fs.writeFile(target, "<button/>");
        }
      }
      return result;
    };
  }
  return handle;
};
syncBuiltinESMExports();
const { reviewLocalFiles } = await import(${JSON.stringify(new URL("../src/review.ts", import.meta.url).href)});
try {
  const result = await reviewLocalFiles({ cwd, paths: [mode === "alias" ? "alias/App.tsx" : "src/App.tsx"], completeLabelContext: true });
  console.log(JSON.stringify({ changed, accepted: true, result }));
} catch (error) {
  console.log(JSON.stringify({ changed, accepted: false, message: error.message }));
}
`

for (const mode of ["parent", "root", "alias", "fifo"]) {
  test(`review rejects ${mode} replacement during reading without returning stale findings`, async context => {
    if (mode === "fifo" && process.platform === "win32") return context.skip("POSIX FIFO fixture")
    const cwd = await fixture(context)
    if (mode === "alias") await symlink(join(cwd, "src"), join(cwd, "alias"), "dir")
    const { stdout, stderr } = await execute(process.execPath, ["--import", loader, "--input-type=module", "-e", racingChild, cwd, mode], { cwd: packageRoot, timeout: 10_000 })
    assert.equal(stderr, "")
    const result = JSON.parse(stdout)
    assert.equal(result.changed, true)
    assert.equal(result.accepted, false)
    assert.match(result.message, /changed|regular|Cannot read/)
    assert.equal(result.message.includes(cwd), false)
  })
}
