import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import test from "node:test"
import { CLI_PACKAGE_SELECTOR, MCP_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"
import { buildAddPrompt, buildInitPrompt, STACKS } from "../src/lib/prompts.ts"
import { buildAgentsMd } from "../src/lib/agents-md.ts"
import { buildDesignMd } from "../src/lib/themes.ts"
import { LAUNCH_DEMOS } from "../src/data/launch-demos.ts"

const root = resolve(import.meta.dirname, "../../..")
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)],
  )
}

test("copyable docs and examples use the shared beta package selectors", () => {
  const paths = [
    ...files(join(root, "apps/web/src/content")),
    ...files(join(root, "apps/web/src/demos")),
    join(root, "README.md"),
    ...["cli", "mcp", "vscode"].map((name) => join(root, `packages/${name}/README.md`)),
  ]
  let commands = 0
  for (const path of paths) {
    const source = readFileSync(path, "utf8")
    for (const match of source.matchAll(/(?:npx (?:-y )?|pnpm dlx |yarn dlx |bunx )(logic2b(?:@[\w.-]+)?|@logic2b\/mcp(?:@[\w.-]+)?)(?=[\s`"<])/g)) {
      assert.equal(match[1], match[1]!.startsWith("@logic2b/") ? MCP_PACKAGE_SELECTOR : CLI_PACKAGE_SELECTOR, path)
      commands++
    }
    for (const match of source.matchAll(/"args": \["-y", "(@logic2b\/mcp[^" ]*)"\]/g)) {
      assert.equal(match[1], MCP_PACKAGE_SELECTOR, path)
      commands++
    }
  }
  assert.ok(commands > 30, "the corpus must include active onboarding commands")
})

test("generated prompts, theme exports and demo launch commands share beta policy", () => {
  const presetId = encodePreset(DEFAULT_CONFIG)
  const outputs = [
    buildAddPrompt("button"),
    buildInitPrompt({ cfg: DEFAULT_CONFIG, presetId, template: "vite", mode: "new" }),
    buildAgentsMd(DEFAULT_CONFIG), buildDesignMd(DEFAULT_CONFIG),
    ...LAUNCH_DEMOS.map((demo) => demo.command),
  ]
  for (const output of outputs) {
    assert.ok(output.includes(CLI_PACKAGE_SELECTOR))
    assert.doesNotMatch(output, /logic2b@latest|\$\{CLI_PACKAGE_SELECTOR\}/)
  }
  assert.ok(buildAgentsMd(DEFAULT_CONFIG).includes(MCP_PACKAGE_SELECTOR))
})

test("existing-project prompts and agent rules establish evidence before choosing writes", () => {
  const presetId = encodePreset(DEFAULT_CONFIG)
  const outputs = [
    ...STACKS.map((stack) => buildAddPrompt("button", stack)),
    ...STACKS.map((stack) => buildInitPrompt({ cfg: DEFAULT_CONFIG, presetId, mode: "existing", stack })),
    buildAgentsMd(DEFAULT_CONFIG),
  ]
  for (const output of outputs) {
    for (const source of ["package.json", "tsconfig.json", "components.json", ".logic2b/manifest.json", ".logic2b/base/"]) {
      assert.ok(output.includes(source), `missing existing-project source: ${source}`)
    }
    assert.match(output, /select the application root first/)
    assert.match(output, /physical destinations/)
    assert.match(output, /stylesheet entry/)
    assert.match(output, /installed source/)
    assert.match(output, /custom wrappers/)
    assert.match(output, /native HTML controls/)
    assert.match(output, /local edits/)
    assert.match(output, /record those unknowns.*needed context before writes/s)
    assert.match(output, /Use the CLI only when its path mapping matches/)
    assert.doesNotMatch(output, /inspect_project|logic2b(?:@next)? inspect/)
    assert.doesNotMatch(output, /`ui\/\*` → `@\/components\/ui\/\*`/)
    if (output.includes("## Steps")) {
      assert.ok(output.indexOf("## Read project context before writes") < output.indexOf("## Steps"))
    }
  }
  const rules = outputs.at(-1)!
  assert.match(rules, /available registry items, not this app's installed/)
  assert.doesNotMatch(rules, /Before writing any UI element from scratch, install it/)
})

test("new-project prompts retain an explicit empty-directory scaffold workflow", () => {
  const presetId = encodePreset(DEFAULT_CONFIG)
  for (const template of ["next", "vite", "astro"]) {
    const output = buildInitPrompt({ cfg: DEFAULT_CONFIG, presetId, mode: "new", template, monorepo: true })
    assert.match(output, /in an empty target directory/)
    assert.match(output, /inside a pnpm workspace monorepo/)
    assert.match(output, /target already contains an app, use the existing-project workflow/)
    assert.match(output, /Read the generated configuration/)
    assert.ok(output.includes(`npx ${CLI_PACKAGE_SELECTOR} init --preset ${presetId}`))
    assert.match(output, /Fresh scaffolds may use/)
  }
})
