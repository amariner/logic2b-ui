import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { test, type TestContext } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const execute = promisify(execFile)
const tsxLoader = createRequire(import.meta.url).resolve("tsx")
const cli = fileURLToPath(new URL("../src/index.ts", import.meta.url))
const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const localSource = "export const privateCustomerCopy = 'LOCAL_SOURCE_MUST_STAY_LOCAL'\n"
const baseSource = "export const privateCustomerCopy = 'baseline'\n"

async function fixture(context: TestContext, files: Record<string, string>): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-cli-inspect-"))
  context.after(() => rm(cwd, { recursive: true, force: true }))
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true })
    await writeFile(join(cwd, path), content)
  }
  return cwd
}

function appFiles(): Record<string, string> {
  return {
    "package.json": JSON.stringify({
      name: "PRIVATE_PACKAGE_MUST_STAY_LOCAL",
      dependencies: { react: "19.2.7" },
      devDependencies: { vite: "8.2.2", tailwindcss: "4.3.2" },
      scripts: { postinstall: "echo SCRIPT_MUST_STAY_LOCAL > inspect-script-executed" },
    }),
    "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } } }),
    "components.json": JSON.stringify({
      tailwind: { css: "src/theme/globals.css" },
      aliases: { ui: "@/custom/ui", components: "@/custom", lib: "@/shared", utils: "@/shared/utils", hooks: "@/hooks" },
      iconLibrary: "lucide",
      logic2b: { version: "1.0.0", registry: "https://user:REGISTRY_SECRET_MUST_STAY_LOCAL@registry.test" },
    }),
    ".logic2b/manifest.json": JSON.stringify({
      schemaVersion: 1,
      registry: { url: "https://user:REGISTRY_SECRET_MUST_STAY_LOCAL@registry.test", resolvedVersion: "1.0.0" },
      items: { button: { version: "1.0.0", files: ["ui/button.tsx"] } },
    }),
    ".logic2b/base/ui/button.tsx": baseSource,
    "src/custom/ui/button.tsx": localSource,
    "src/theme/globals.css": "@import 'tailwindcss';\n:root { --private-token: PRIVATE_CSS_MUST_STAY_LOCAL; }\n",
    "vite.config.mjs": "import { writeFileSync } from 'node:fs'; writeFileSync(new URL('./inspect-script-executed', import.meta.url), 'CONFIG_EXECUTED'); export default {}\n",
    ".env": "SECRET_ENV_MUST_STAY_LOCAL=true\n",
  }
}

async function inspect(cwd: string, args: string[] = []) {
  return execute(process.execPath, ["--import", tsxLoader, cli, "inspect", "--cwd", cwd, ...args], {
    cwd: packageRoot,
    timeout: 60_000,
    maxBuffer: 512 * 1024,
  })
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

test("inspect is exposed in CLI help with explicit, read-only capability options", async () => {
  const result = await execute(process.execPath, ["--import", tsxLoader, cli, "inspect", "--help"], { cwd: packageRoot })
  for (const option of ["--json", "--details", "--app-root", "--snapshot", "--file", "--file-writes", "--dependency-install", "--browser"]) {
    assert.ok(result.stdout.includes(option), option)
  }
  assert.equal(result.stderr, "")
})

test("inspect defaults to the process working directory and provides a compact text summary", async (context) => {
  const cwd = await fixture(context, appFiles())
  const before = await tree(cwd)
  const { stdout, stderr } = await execute(process.execPath, ["--import", tsxLoader, cli, "inspect"], { cwd, timeout: 60_000 })
  assert.match(stdout, /Project inspection \(schema 1\)/)
  assert.match(stdout, /Framework:.*vite/)
  assert.equal(stdout.includes("src/custom/ui/button.tsx"), false)
  assert.equal(stderr, "")
  assert.deepEqual(await tree(cwd), before)
})

test("inspect emits deterministic compact JSON without exposing source or changing the app", async (context) => {
  const cwd = await fixture(context, appFiles())
  const before = await tree(cwd)
  const first = await inspect(cwd, ["--json"])
  const second = await inspect(cwd, ["--json"])
  assert.equal(first.stdout, second.stdout)
  assert.equal(first.stderr, "")
  const result = JSON.parse(first.stdout)
  assert.equal(result.schemaVersion, 1)
  assert.ok(result.summary)
  assert.equal(Object.hasOwn(result, "context"), false)
  assert.match(first.stdout, /vite/)
  assert.equal(first.stdout.includes("src/custom/ui/button.tsx"), false)
  for (const secret of ["LOCAL_SOURCE_MUST_STAY_LOCAL", "PRIVATE_CSS_MUST_STAY_LOCAL", "SECRET_ENV_MUST_STAY_LOCAL", "SCRIPT_MUST_STAY_LOCAL", "PRIVATE_PACKAGE_MUST_STAY_LOCAL", "REGISTRY_SECRET_MUST_STAY_LOCAL"]) {
    assert.equal(first.stdout.includes(secret), false, secret)
  }
  assert.deepEqual(await tree(cwd), before)
  assert.ok(Buffer.byteLength(first.stdout) < 16 * 1024)
})

test("inspect details compares custom installed targets to the retained baseline", async (context) => {
  const cwd = await fixture(context, appFiles())
  const before = await tree(cwd)
  const { stdout } = await inspect(cwd, ["--json", "--details"])
  const result = JSON.parse(stdout)
  assert.equal(result.schemaVersion, 1)
  assert.equal(result.context.schemaVersion, 1)
  const button = result.context.installed.find((item: { name: string }) => item.name === "button")
  assert.ok(button)
  assert.equal(button.files[0].path, "src/custom/ui/button.tsx")
  assert.equal(button.files[0].modified, true)
  assert.equal(button.files[0].sha256, createHash("sha256").update(localSource).digest("hex"))
  assert.equal(stdout.includes("LOCAL_SOURCE_MUST_STAY_LOCAL"), false)
  assert.deepEqual(await tree(cwd), before)
})

test("inspect defaults capabilities to false and reports host declarations without acting on them", async (context) => {
  const cwd = await fixture(context, appFiles())
  const before = await tree(cwd)
  const defaultResult = JSON.parse((await inspect(cwd, ["--json", "--details"])).stdout)
  assert.deepEqual(defaultResult.context.capabilities, { fileWrites: false, dependencyInstall: false, browser: false })
  const declared = JSON.parse((await inspect(cwd, ["--json", "--details", "--file-writes", "--dependency-install", "--browser"])).stdout)
  assert.deepEqual(declared.context.capabilities, { fileWrites: true, dependencyInstall: true, browser: true })
  assert.deepEqual(await tree(cwd), before)
})

test("inspect snapshot exports sanitized metadata and selected file hashes without source", async (context) => {
  const cwd = await fixture(context, appFiles())
  const { stdout, stderr } = await inspect(cwd, ["--snapshot", "--file", "src/custom/ui/button.tsx", "--file", "src/theme/globals.css"])
  const snapshot = JSON.parse(stdout)
  assert.equal(snapshot.schemaVersion, 1)
  assert.equal(Object.hasOwn(snapshot, "summary"), false)
  assert.match(stdout, /src\/custom\/ui\/button\.tsx/)
  assert.match(stdout, new RegExp(createHash("sha256").update(localSource).digest("hex")))
  for (const secret of ["LOCAL_SOURCE_MUST_STAY_LOCAL", "PRIVATE_CSS_MUST_STAY_LOCAL", "PRIVATE_PACKAGE_MUST_STAY_LOCAL", "SCRIPT_MUST_STAY_LOCAL", "REGISTRY_SECRET_MUST_STAY_LOCAL"]) {
    assert.equal(stdout.includes(secret), false, secret)
  }
  assert.equal(stderr, "")
})

test("inspect requires app selection for an ambiguous workspace and supports --app-root", async (context) => {
  const nextApp = { "package.json": JSON.stringify({ dependencies: { next: "16.3.3", react: "19.2.7" } }) }
  const cwd = await fixture(context, {
    "package.json": JSON.stringify({ private: true, workspaces: ["apps/*"] }),
    ...Object.fromEntries(Object.entries(appFiles()).map(([path, content]) => [`apps/frontend/${path}`, content])),
    ...Object.fromEntries(Object.entries(nextApp).map(([path, content]) => [`apps/admin/${path}`, content])),
  })
  const ambiguous = await inspect(cwd, ["--json"])
  assert.match(ambiguous.stdout, /apps\/admin/)
  assert.match(ambiguous.stdout, /apps\/frontend/)
  assert.match(ambiguous.stdout, /unknown|ambiguous|app-root/i)
  const selected = JSON.parse((await inspect(cwd, ["--app-root", "apps/frontend", "--json", "--details"])).stdout)
  assert.equal(selected.context.framework.name, "vite")
  assert.ok(selected.context.installed.some((item: { name: string }) => item.name === "button"))
})

test("inspect reports partial configuration as unknown instead of applying init defaults", async (context) => {
  const cwd = await fixture(context, { "package.json": JSON.stringify({ private: true }) })
  const { stdout } = await inspect(cwd, ["--json", "--details"])
  const result = JSON.parse(stdout)
  assert.equal(result.context.framework.name, "unknown")
  assert.deepEqual(result.context.aliases, {})
  assert.ok(result.context.unknowns.length > 0)
  assert.deepEqual(Object.keys(await tree(cwd)), ["package.json"])
})

test("inspect rejects malformed, oversized and unsupported-version configuration with no writes", async (context) => {
  for (const [file, content, expected] of [
    ["package.json", "{ malformed", /JSON|parse|invalid/i],
    ["package.json", JSON.stringify({ name: "x".repeat(128 * 1024) }), /128|limit|large|bytes/i],
    [".logic2b/manifest.json", JSON.stringify({ schemaVersion: 2, registry: { url: "https://registry.test" }, items: {} }), /schema|version/i],
  ] as const) {
    const cwd = await fixture(context, { [file]: content })
    const before = await tree(cwd)
    await assert.rejects(() => inspect(cwd, ["--json"]), (error: unknown) => {
      assert.ok(error && typeof error === "object" && "stderr" in error)
      assert.match(String(error.stderr), expected)
      assert.equal("stdout" in error ? error.stdout : undefined, "")
      return true
    })
    assert.deepEqual(await tree(cwd), before)
  }
})

test("inspect rejects unsafe selected paths and app roots before reading private files", async (context) => {
  const cwd = await fixture(context, appFiles())
  const before = await tree(cwd)
  for (const args of [
    ["--file", "../outside.ts"],
    ["--file", join(cwd, "src/custom/ui/button.tsx")],
    ["--file", ".env"],
    ["--file", "node_modules/private/index.ts"],
    ["--file", "src/custom/ui/button.tsx", "--file", "src/custom/ui/./button.tsx"],
    ["--app-root", "../outside"],
    ["--app-root", cwd],
  ]) {
    await assert.rejects(() => inspect(cwd, ["--json", ...args]))
  }
  assert.deepEqual(await tree(cwd), before)
})

test("inspect rejects selected files through a symlink escaping the app", async (context) => {
  const cwd = await fixture(context, { "package.json": JSON.stringify({ private: true }) })
  const outside = await fixture(context, { "private.ts": "DO_NOT_READ_OUTSIDE_APP" })
  await symlink(outside, join(cwd, "outside"), "dir")
  await assert.rejects(() => inspect(cwd, ["--json", "--file", "outside/private.ts"]), (error: unknown) => {
    assert.ok(error && typeof error === "object" && "stderr" in error)
    assert.match(String(error.stderr), /symlink|root|outside/i)
    assert.equal("stdout" in error ? error.stdout : undefined, "")
    return true
  })
})
