import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test, type TestContext } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { reviewProjectFiles } from "../src/review.ts"

const execute = promisify(execFile)
const tsxLoader = createRequire(import.meta.url).resolve("tsx")
const cli = fileURLToPath(new URL("../src/index.ts", import.meta.url))
const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const namedButton = "export const Example = () => <button>Save customer</button>\n"
const unnamedInput = "export const Example = () => <input />\n"

async function fixture(context: TestContext, files: Record<string, string | Uint8Array>): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-cli-review-"))
  context.after(() => rm(cwd, { recursive: true, force: true }))
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true })
    await writeFile(join(cwd, path), content)
  }
  return cwd
}

function run(cwd: string, args: string[] = []) {
  return execute(process.execPath, ["--import", tsxLoader, cli, "review", "--cwd", cwd, ...args], {
    cwd: packageRoot, timeout: 60_000, maxBuffer: 1024 * 1024,
  })
}

async function failure(cwd: string, args: string[], expected?: RegExp) {
  let result: { stdout: string; stderr: string; code: number } | undefined
  await assert.rejects(() => run(cwd, args), (error: unknown) => {
    assert.ok(error && typeof error === "object" && "stderr" in error && "stdout" in error && "code" in error)
    assert.equal(error.code, 1)
    result = { stdout: String(error.stdout), stderr: String(error.stderr), code: 1 }
    if (expected) assert.match(result.stderr, expected)
    assert.equal(result.stderr.includes(cwd), false, "errors do not expose the absolute project path")
    return true
  })
  return result!
}

async function tree(cwd: string, base = ""): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const entry of await readdir(join(cwd, base), { withFileTypes: true })) {
    const path = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) Object.assign(result, await tree(cwd, path))
    else if (entry.isFile()) result[path] = createHash("sha256").update(await readFile(join(cwd, path))).digest("hex")
  }
  return result
}

test("review help exposes explicit local paths, JSON, exit policy and reasoned suppressions", async () => {
  const { stdout, stderr } = await execute(process.execPath, ["--import", tsxLoader, cli, "review", "--help"], { cwd: packageRoot })
  for (const option of ["<paths...>", "--cwd", "--json", "--fail-on", "--semantic-colors", "--suppressions"]) assert.ok(stdout.includes(option), option)
  assert.equal(stderr, "")
})

test("review defaults cwd, prints limits and uncertainty, and never executes or changes source", async (context) => {
  const cwd = await fixture(context, {
    "src/customer.tsx": "import { writeFileSync } from 'node:fs'; writeFileSync('REVIEW_EXECUTED', 'PRIVATE_VALUE');\n" + namedButton,
    "package.json": JSON.stringify({ scripts: { postinstall: "touch REVIEW_SCRIPT_EXECUTED" } }),
    "unselected.tsx": unnamedInput,
  })
  const before = await tree(cwd)
  const { stdout, stderr } = await execute(process.execPath, ["--import", tsxLoader, cli, "review", "src/customer.tsx"], { cwd, timeout: 60_000 })
  assert.match(stdout, /Static UI review \(schema 1; engine 1\)/)
  assert.match(stdout, /Findings: 0 errors, 0 warnings, 0 info/)
  assert.match(stdout, /Unknown is not pass/)
  assert.match(stdout, /Limitation:/)
  assert.equal(stdout.includes("PRIVATE_VALUE"), false)
  assert.equal(stdout.includes(cwd), false)
  assert.equal(stderr, "")
  assert.deepEqual(await tree(cwd), before)
})

test("review JSON preserves native labels and unresolved custom wrappers without false positives", async (context) => {
  const cwd = await fixture(context, {
    "labels.tsx": "export const Example = () => <><label htmlFor='customer-name'>Name</label><input id='customer-name' /><label>Email<input type='email' /></label><button><span className='sr-only'>Add customer</span><svg aria-hidden='true' /></button></>\n",
    "wrapper.jsx": "export const Example = ({props}) => <Field><input {...props} /></Field>\n",
  })
  const first = await run(cwd, ["labels.tsx", "wrapper.jsx", "--json"])
  const second = await run(cwd, ["labels.tsx", "wrapper.jsx", "--json"])
  assert.equal(first.stdout, second.stdout)
  const result = JSON.parse(first.stdout)
  assert.equal(result.schemaVersion, 1)
  assert.equal(result.engineVersion, "1")
  assert.deepEqual(result.summary, { errors: 0, warnings: 0, info: 0 })
  assert.ok(result.unknowns.some((entry: { file: string }) => entry.file === "wrapper.jsx"))
  assert.ok(result.evaluatedRules.includes("L2B-A11Y-002"))
  assert.equal(first.stderr, "")
  assert.equal(first.stdout.includes(cwd), false)
})

test("review emits findings with relative locations in JSON and human output, and fails at both thresholds", async (context) => {
  const cwd = await fixture(context, { "src/form.tsx": unnamedInput })
  const before = await tree(cwd)
  const json = await failure(cwd, ["src/form.tsx", "--json", "--fail-on", "error"])
  const result = JSON.parse(json.stdout)
  assert.ok(result.summary.errors > 0)
  assert.equal(result.findings[0].file, "src/form.tsx")
  assert.equal(result.findings[0].rule, "L2B-A11Y-002")
  assert.ok(result.findings[0].line >= 1)
  assert.equal(json.stderr, "")
  const human = await failure(cwd, ["src/form.tsx", "--fail-on", "warning"])
  assert.match(human.stdout, /src\/form\.tsx/)
  assert.match(human.stdout, /error L2B-A11Y-002/)
  assert.match(human.stdout, /Evidence:/)
  assert.equal(human.stderr, "")
  assert.deepEqual(await tree(cwd), before)
})

test("review token policy is opt-in and --fail-on accepts only supported severities", async (context) => {
  const cwd = await fixture(context, { "colors.tsx": "export const Example = () => <button className='bg-red-500'>Save</button>\n" })
  const disabled = JSON.parse((await run(cwd, ["colors.tsx", "--json"])).stdout)
  assert.equal(disabled.findings.some((finding: { rule: string }) => finding.rule === "L2B-TOK-001"), false)
  const warningAllowed = JSON.parse((await run(cwd, ["colors.tsx", "--json", "--semantic-colors"])).stdout)
  assert.equal(warningAllowed.summary.errors, 0)
  assert.ok(warningAllowed.summary.warnings > 0)
  const warningRejected = await failure(cwd, ["colors.tsx", "--json", "--semantic-colors", "--fail-on", "warning"])
  assert.deepEqual(JSON.parse(warningRejected.stdout), warningAllowed)
  await failure(cwd, ["colors.tsx", "--fail-on", "info"], /allowed choices|warning|error/)
})

test("review reads a bounded reasoned suppression file and keeps suppressed evidence visible", async (context) => {
  const reason = "This isolated fixture intentionally omits its accessible label."
  const cwd = await fixture(context, {
    "form.tsx": unnamedInput,
    "review-suppressions.json": JSON.stringify([{ file: "form.tsx", rule: "L2B-A11Y-002", line: 1, reason }]),
  })
  const before = await tree(cwd)
  const { stdout, stderr } = await run(cwd, ["form.tsx", "--json", "--suppressions", "review-suppressions.json"])
  const result = JSON.parse(stdout)
  assert.equal(result.summary.errors, 0)
  assert.equal(result.suppressed.length, 1)
  assert.equal(result.suppressed[0].reason, reason)
  assert.equal(result.suppressed[0].finding.rule, "L2B-A11Y-002")
  assert.equal(stderr, "")
  assert.deepEqual(await tree(cwd), before)
  await writeFile(join(cwd, "review-suppressions.json"), JSON.stringify([{ file: "form.tsx", rule: "L2B-A11Y-002", line: 1, reason: "ignore" }]))
  await failure(cwd, ["form.tsx", "--suppressions", "review-suppressions.json"], /reason|suppression/i)
  await writeFile(join(cwd, "review-suppressions.json"), "[invalid JSON")
  await failure(cwd, ["form.tsx", "--suppressions", "review-suppressions.json"], /valid JSON array/i)
  await writeFile(join(cwd, "review-suppressions.json"), " ".repeat(64 * 1024 + 1))
  await failure(cwd, ["form.tsx", "--suppressions", "review-suppressions.json"], /limit|exceeds/i)
})

test("review rejects missing inputs, unsafe paths, unsupported files, and duplicate normalized paths before reads", async (context) => {
  const cwd = await fixture(context, { "src/good.tsx": namedButton })
  const before = await tree(cwd)
  for (const paths of [
    [], ["../private.tsx"], [join(cwd, "src/good.tsx")], ["src\\good.tsx"], [".env.tsx"],
    ["node_modules/private.tsx"], ["src/*.tsx"], ["src"], ["src/good.ts"], ["src/missing.tsx"],
    ["src/good.tsx", "./src/good.tsx"], ["src/good.tsx", "src/GOOD.tsx"],
  ]) {
    const result = await failure(cwd, [...paths, "--json"])
    assert.equal(result.stdout, "")
  }
  assert.deepEqual(await tree(cwd), before)
})

test("review enforces source counts, per-file/total byte limits and valid UTF-8", async (context) => {
  const padded = (bytes: number) => `/*${"x".repeat(bytes - namedButton.length - 4)}*/${namedButton}`
  const cwd = await fixture(context, {
    "large.tsx": padded(128 * 1024 + 1),
    "one.tsx": padded(90 * 1024), "two.tsx": padded(90 * 1024), "three.tsx": padded(90 * 1024),
    "invalid.tsx": new Uint8Array([0xc3, 0x28]),
  })
  await failure(cwd, Array.from({ length: 65 }, (_, index) => `f${index}.tsx`), /64|limit/i)
  await failure(cwd, ["large.tsx"], /limit|exceeds/i)
  await failure(cwd, ["one.tsx", "two.tsx", "three.tsx"], /limit|exceeds/i)
  await failure(cwd, ["invalid.tsx"], /UTF-8/i)
})

test("review accepts the exact file-count and byte boundaries and reports malformed JSX as unknown", async (context) => {
  const exactFile = `/*${"x".repeat(128 * 1024 - namedButton.length - 4)}*/${namedButton}`
  const paths = Array.from({ length: 64 }, (_, index) => `file-${index}.tsx`)
  const cwd = await fixture(context, {
    ...Object.fromEntries(paths.map(path => [path, namedButton])),
    "large-one.tsx": exactFile, "large-two.tsx": exactFile,
    "malformed.tsx": "export const Example = () => <button",
  })
  assert.equal((await reviewProjectFiles(paths, { cwd })).summary.errors, 0)
  assert.equal((await reviewProjectFiles(["large-one.tsx", "large-two.tsx"], { cwd })).summary.errors, 0)
  const { stdout } = await run(cwd, ["malformed.tsx", "--json"])
  const result = JSON.parse(stdout)
  assert.equal(result.summary.errors, 0)
  assert.ok(result.unknowns.length > 0)
})

test("review rejects file and ancestor symlinks, directories, and FIFOs without disclosing destinations", async (context) => {
  const cwd = await fixture(context, { "good.tsx": namedButton })
  const outside = await fixture(context, { "PRIVATE_FILE.tsx": "export const Private = () => <input />" })
  await symlink(join(outside, "PRIVATE_FILE.tsx"), join(cwd, "linked.tsx"))
  await symlink(outside, join(cwd, "linked"), "dir")
  await mkdir(join(cwd, "directory.tsx"))
  for (const path of ["linked.tsx", "linked/PRIVATE_FILE.tsx", "directory.tsx"]) {
    const result = await failure(cwd, [path, "--json"], /symlink|regular|directory/i)
    assert.equal(result.stderr.includes(outside), false)
    assert.equal(result.stdout, "")
  }
  if (process.platform !== "win32") {
    await execute("mkfifo", [join(cwd, "pipe.tsx")])
    const result = await failure(cwd, ["pipe.tsx"], /regular|special/i)
    assert.equal(result.stdout, "")
  }
})

test("review rejects a concurrently replaced selected file without reviewing outside source", async (context) => {
  const cwd = await fixture(context, { "selected.tsx": namedButton })
  const outside = await fixture(context, { "private.tsx": unnamedInput })
  let done = false
  const swapping = (async () => {
    for (let index = 0; index < 30 && !done; index++) {
      await symlink(join(outside, "private.tsx"), join(cwd, "swap.tsx"))
      await rename(join(cwd, "swap.tsx"), join(cwd, "selected.tsx"))
      await writeFile(join(cwd, "replacement.tsx"), namedButton)
      await rename(join(cwd, "replacement.tsx"), join(cwd, "selected.tsx"))
    }
  })()
  try {
    for (let index = 0; index < 10; index++) {
      try {
        const result = await reviewProjectFiles(["selected.tsx"], { cwd })
        assert.equal(result.findings.length, 0, "outside file's proven missing label must never be reviewed")
      } catch (error) {
        assert.match(String(error), /symlink|changed|read review input/i)
        assert.equal(String(error).includes(outside), false)
      }
    }
  } finally { done = true; await swapping }
})
