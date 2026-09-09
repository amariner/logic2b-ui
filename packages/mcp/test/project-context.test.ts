import assert from "node:assert/strict"
import { test } from "node:test"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { runTool, TOOLS } from "../src/tools.ts"
import { ToolInputError } from "../src/limits.ts"
import { inspectProject, type ProjectSnapshotV1 } from "@logic2b/scaffold/project-context"
const snapshot: ProjectSnapshotV1 = { schemaVersion: 1, configurations: [{ path: "package.json", content: '{"dependencies":{"next":"^16","react":"^19"}}' }, { path: "tsconfig.json", content: '{"compilerOptions":{"paths":{"@/*":["./*"]}}}' }], files: [], capabilities: { fileWrites: true, dependencyInstall: false, browser: false } }
const noFetch = async () => { throw new Error("Inspection must never fetch") }
const validator = new AjvJsonSchemaValidator().getValidator(TOOLS.find(tool => tool.name === "inspect_project")!.outputSchema)
test("MCP full and compact inspection exactly match the shared core and typed text fallback", async () => {
  for (const detail of ["summary", "full"] as const) {
    const result = await runTool("inspect_project", { snapshot, detail }, { fetchImpl: noFetch })
    assert.equal(result.isError, undefined)
    assert.deepEqual(result.structuredContent, inspectProject(snapshot, detail))
    assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text))
    const valid = validator(result.structuredContent); assert.ok(valid.valid, valid.errorMessage)
    assert.equal(validator({ ...result.structuredContent, summary: { ...result.structuredContent!.summary as object, capabilities: "invented" } }).valid, false)
  }
})
test("invalid, escaped and oversized snapshots are protocol errors before network work", async () => {
  const cases = [
    {}, { snapshot: { ...snapshot, schemaVersion: 2 } }, { snapshot, detail: "all" },
    { snapshot: { ...snapshot, capabilities: { fileWrites: "yes", browser: false, dependencyInstall: false } } },
    { snapshot: { ...snapshot, configurations: [{ path: ".env", content: "PRIVATE_ENV" }] } },
    { snapshot: { ...snapshot, configurations: [{ path: "package.json", content: "INVALID_PRIVATE_SOURCE" }] } },
    { snapshot: { ...snapshot, configurations: [{ path: "package.json", content: JSON.stringify({ text: "€".repeat(50000) }) }] } },
    { snapshot: { ...snapshot, files: [{ path: "src/../outside", sha256: "a".repeat(64) }] } },
    { snapshot: { ...snapshot, configurations: [{ path: ".logic2b/manifest.json", content: '{"schemaVersion":2,"items":{},"registry":{}}' }] } },
  ]
  for (const args of cases) await assert.rejects(runTool("inspect_project", args, { fetchImpl: noFetch }), error => error instanceof ToolInputError && !error.message.includes("PRIVATE"))
})
