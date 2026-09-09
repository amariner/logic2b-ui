import assert from "node:assert/strict"
import { test } from "node:test"
import { detectProjectContext, inspectProject, parseProjectConfiguration, PROJECT_LIMITS, projectPath, validateProjectSnapshot, type ProjectSnapshotV1 } from "../src/project-context.ts"
const digest = "a".repeat(64)
const snapshot = (configurations: Record<string, unknown> = {}, files: ProjectSnapshotV1["files"] = []): ProjectSnapshotV1 => ({ schemaVersion: 1, configurations: Object.entries(configurations).map(([path, content]) => ({ path, content: typeof content === "string" ? content : JSON.stringify(content) })), files, capabilities: { fileWrites: false, dependencyInstall: false, browser: true } })
const config = (root: string) => ({ compilerOptions: { paths: { "@/*": [`${root}/*`] } } })
const components = { aliases: { ui: "@/design/atoms", components: "@/screens", utils: "@/shared/utils" }, tailwind: { css: "src/styles/app.css" }, iconLibrary: "lucide", logic2b: { version: "next", preset: "example-preset" } }
const manifest = { schemaVersion: 1, registry: { resolvedVersion: "1.0.0-rc.17" }, items: { button: { files: ["ui/button.tsx"] } } }

test("Next root alias and Vite src alias do not share assumed destinations", () => {
  const next = detectProjectContext(snapshot({ "package.json": { dependencies: { next: "^16.0.0", react: "^19", tailwindcss: "^4" } }, "tsconfig.json": config("."), "components.json": components }))
  assert.equal(next.framework.name, "next"); assert.equal(next.sourceRoot, "."); assert.equal(next.componentAliases.ui, "design/atoms")
  const vite = detectProjectContext(snapshot({ "package.json": { devDependencies: { vite: "^8" } }, "tsconfig.json": config("./src"), "components.json": components }))
  assert.equal(vite.framework.name, "vite"); assert.equal(vite.sourceRoot, "src"); assert.equal(vite.componentAliases.ui, "src/design/atoms")
})
test("JSONC, local inheritance and referenced Vite app configs resolve without execution", () => {
  const context = detectProjectContext(snapshot({ "package.json": { dependencies: { vite: "8.0.0" } }, "tsconfig.json": '// comment\n{"references":[{"path":"./tsconfig.app.json"}],}', "tsconfig.app.json": { extends: "./config/tsconfig.base.json", compilerOptions: { paths: { "@/*": ["./src/*"] } } }, "config/tsconfig.base.json": { compilerOptions: { strict: true } } }))
  assert.equal(context.sourceRoot, "src")
  assert.deepEqual(parseProjectConfiguration("tsconfig.json", '{"compilerOptions":{"paths":{"url":["https://example.test/*"]},},"string":"/* stays */",}').string, "/* stays */")
})
test("Astro React islands and unsupported or conflicting frameworks report scope honestly", () => {
  const astro = detectProjectContext(snapshot({ "package.json": { dependencies: { astro: "^7", vite: "^8", react: "^19", "@astrojs/react": "^6" } }, "tsconfig.json": { extends: "astro/tsconfigs/strict", compilerOptions: { paths: { "@/*": ["src/*"] } } } }))
  assert.equal(astro.framework.name, "astro"); assert.equal(astro.reactVersion, "^19"); assert.equal(astro.sourceRoot, undefined)
  assert.match(astro.unknowns.join(" "), /package-based extends/)
  for (const dependencies of [{ next: "16", vite: "8" }, { svelte: "5" }]) assert.equal(detectProjectContext(snapshot({ "package.json": { dependencies } })).framework.name, "unknown")
})
test("workspace candidates require selection; missing config and host capability stay unknown", () => {
  const root = detectProjectContext({ ...snapshot({ "package.json": { dependencies: { next: "16" } } }), applications: ["apps/a", "apps/b"], capabilities: undefined })
  assert.equal(root.framework.name, "unknown"); assert.deepEqual(root.capabilities, { fileWrites: false, dependencyInstall: false, browser: false })
  assert.match(root.unknowns.join(" "), /select an app root/)
  assert.equal(detectProjectContext(snapshot()).sourceRoot, undefined)
})
test("install inventory distinguishes modified, missing baseline, missing target and unresolved destination", () => {
  const input = snapshot({ "tsconfig.json": config("src"), "components.json": components, ".logic2b/manifest.json": manifest }, [{ path: "src/design/atoms/button.tsx", sha256: digest, baseSha256: "b".repeat(64) }])
  let context = detectProjectContext(input)
  assert.deepEqual(context.installed[0].files[0], { registryPath: "ui/button.tsx", path: "src/design/atoms/button.tsx", state: "present", sha256: digest, modified: true })
  assert.equal(context.registryVersion, "1.0.0-rc.17")
  input.files[0].baseSha256 = digest; assert.equal(detectProjectContext(input).installed[0].files[0].modified, false)
  delete input.files[0].baseSha256; assert.equal(detectProjectContext(input).installed[0].files[0].modified, undefined)
  input.files = []; assert.equal(detectProjectContext(input).installed[0].files[0].state, "missing")
  context = detectProjectContext(snapshot({ ".logic2b/manifest.json": manifest })); assert.equal(context.installed[0].files[0].state, "unresolved")
})
test("shadcn configuration does not falsely label arbitrary copied files as installed registry items", () => {
  const context = detectProjectContext(snapshot({ "tsconfig.json": config("src"), "components.json": components }, [{ path: "src/design/atoms/button.tsx", sha256: digest }]))
  assert.deepEqual(context.installed, []); assert.equal(context.selectedFiles.length, 1)
})
test("configured stylesheet remains the theme destination even with additional selected CSS", () => {
  const context = detectProjectContext(snapshot({ "components.json": components, ".logic2b/manifest.json": { ...manifest, items: { theme: { files: ["theme.css"] } } } }, [{ path: "src/styles/theme.css", sha256: digest }]))
  assert.equal(context.installed[0].files[0].path, "src/styles/theme.css"); assert.equal(context.installed[0].files[0].state, "present")
})
test("all path-bearing inputs reject escapes and normalized duplicate targets", () => {
  for (const path of ["../x", "src/../x", "/absolute", "C:/absolute", "src\\file", "node_modules/x", ".env", "src/.env.local", ".git/config"]) assert.throws(() => projectPath(path))
  assert.equal(projectPath("./src//button.tsx"), "src/button.tsx")
  assert.throws(() => validateProjectSnapshot(snapshot({}, [{ path: "./src/x", sha256: digest }, { path: "src/x", sha256: digest }])), /Duplicate normalized/)
  for (const target of ["/tmp/escape/*", "../outside/*", "C:/outside/*"]) { const context = detectProjectContext(snapshot({ "tsconfig.json": { compilerOptions: { paths: { "@/*": [target] } } } })); assert.equal(context.sourceRoot, undefined); assert.equal(context.aliases["@/*"], undefined); assert.match(context.unknowns.join(" "), /destination is withheld/) }
  assert.throws(() => validateProjectSnapshot({ ...snapshot(), configurations: [{ path: "./tsconfig.json", content: "{}" }, { path: "tsconfig.json", content: "{}" }] }), /Duplicate normalized/)
})
test("malformed JSON, byte/count limits and unknown versions reject without echoing source", () => {
  assert.throws(() => validateProjectSnapshot(snapshot({ "package.json": '{"token":"PRIVATE_VALUE",' })), error => !String(error).includes("PRIVATE_VALUE"))
  assert.throws(() => validateProjectSnapshot(snapshot({ "package.json": { text: "€".repeat(50000) } })), /128 KiB/)
  assert.throws(() => validateProjectSnapshot({ ...snapshot(), schemaVersion: 2 }), /schemaVersion/)
  assert.throws(() => validateProjectSnapshot(snapshot({}, Array.from({ length: 1001 }, (_, i) => ({ path: `src/${i}`, sha256: digest })))), /limits/)
  assert.throws(() => detectProjectContext(snapshot({ ".logic2b/manifest.json": { ...manifest, schemaVersion: 2 } })), /manifest/)
  assert.throws(() => detectProjectContext(snapshot({ "tsconfig.json": { extends: "./tsconfig.json" } })), /Circular/)
})
test("prototype-like alias keys cannot mutate prototypes and URL dependency locators are omitted", () => {
  const context = detectProjectContext(snapshot({ "package.json": { dependencies: { next: "https://user:PRIVATE_TOKEN@example.test/next" } }, "tsconfig.json": '{"compilerOptions":{"paths":{"__proto__":["src/thing"],"@/*":["src/*"]}}}' }))
  assert.equal(context.sourceRoot, "src"); assert.equal(context.framework.version, undefined)
  assert.ok(!JSON.stringify(context).includes("PRIVATE_TOKEN")); assert.equal(Object.prototype.hasOwnProperty.call(context.aliases, "__proto__"), true)
})
test("summary remains compact for 1000 files and full output is deterministic", () => {
  const input = snapshot({ "tsconfig.json": config("src") }, Array.from({ length: 1000 }, (_, i) => ({ path: `src/item-${i}.tsx`, sha256: digest })))
  const summary = inspectProject(input)
  assert.equal(summary.context, undefined); assert.equal(summary.summary.inspectedFiles, 1000)
  assert.ok(Buffer.byteLength(JSON.stringify(summary)) <= PROJECT_LIMITS.compactBytes)
  assert.deepEqual(inspectProject({ ...input, files: [...input.files].reverse() }, "full"), inspectProject(input, "full"))
})
