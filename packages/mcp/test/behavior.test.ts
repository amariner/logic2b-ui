import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"
import { BEHAVIOR_STATES, type RegistryBehavior } from "@logic2b/scaffold/behavior"

import { createRegistryClient } from "../src/registry.ts"
import { runTool, TOOLS, type ToolResult } from "../src/tools.ts"
import { ImmutableRegistry, type FixtureItem } from "./helpers/immutable-registry.ts"

const name = "customer-fixture-01"
const source = 'throw new Error("Registry sources must remain inert during planning")'

function behavior(): RegistryBehavior {
  return {
    schemaVersion: 1,
    states: Object.fromEntries(BEHAVIOR_STATES.map((state) => [state, {
      support: state === "success" ? "built-in" : "consumer",
      how: state === "success" ? 'Provide status="success" and customers.' : "The application supplies this state.",
      transitions: ["success", "error"],
      preserves: ["value"],
    }])) as RegistryBehavior["states"],
    content: [{ key: "title", type: "text", path: "content.title", sample: "Customer details", maxLength: 120 }],
    actions: [{ name: "save", props: ["onSubmit", "status"], consumer: ["Persist and authorize the customer before reporting success."] }],
    intents: ["edit-customer", "recover-request"],
    journey: { before: ["admin-customers-01"] },
    responsive: { viewports: ["mobile", "desktop"], strategy: "Keep labels and save actions visible on narrow screens.", touchTargets: "44px" },
    consumer: ["Keep draft input through failures.", "Authorize changes on the server."],
  }
}

function fixture(payloadBehavior?: unknown, manifestBehavior: unknown = payloadBehavior, version = "1.0.0-rc.17") {
  const item: FixtureItem = {
    name, type: "registry:block", title: "Customer fixture", description: "A controlled customer editor.",
    files: [{ path: `blocks/${name}/customer.tsx`, type: "registry:block", content: source }],
    ...(payloadBehavior === undefined ? {} : { behavior: payloadBehavior }),
  }
  const registry = new ImmutableRegistry({ version, items: [item] })
  // Manifests carry compact metadata; the published source stays content-addressed.
  const manifest = JSON.parse(registry.routes.get(registry.manifestUrl())!)
  if (manifestBehavior !== undefined) manifest.items[0].behavior = manifestBehavior
  registry.replaceManifest(manifest)
  return registry
}

const schemaValidator = new AjvJsonSchemaValidator()
const validators = new Map(TOOLS.map((tool) => [tool.name, schemaValidator.getValidator(tool.outputSchema)]))

function payload(result: ToolResult, tool: string) {
  assert.equal(result.isError, undefined, `${tool}: ${result.content[0].text}`)
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text), "structured and text results are identical")
  const checked = validators.get(tool as (typeof TOOLS)[number]["name"])!(result.structuredContent)
  assert.ok(checked.valid, `${tool}: ${checked.errorMessage}`)
  return result.structuredContent!
}

const requests = [
  ["list_components", { kind: "block" }],
  ["search_components", { query: "customer" }],
  ["get_component", { name }],
  ["install_plan", { items: [name] }],
] as const

function metadata(tool: string, value: Record<string, unknown>): Record<string, unknown> {
  return tool === "get_component" ? value : (value.items as Record<string, unknown>[])[0]!
}

describe("MCP behavior contracts", () => {
  test("list/search/get/install retain the same bounded contract and text fallback", async () => {
    const contract = behavior()
    const registry = fixture(contract)
    for (const [tool, args] of requests) {
      const value = payload(await runTool(tool, args, registry), tool)
      assert.deepEqual(metadata(tool, value).behavior, contract, tool)
      assert.equal(value.registryVersion, "1.0.0-rc.17", tool)
      if (tool === "get_component") assert.equal((value.files as { content: string }[])[0]!.content, source)
      if (tool === "install_plan") {
        assert.equal((value.files as { content: string }[])[0]!.content, source)
        for (const duty of contract.consumer) assert.ok((value.notes as string[]).some((note) => note.includes(duty)), duty)
      }
    }
  })

  test("historical items without metadata remain supported and do not invent behavior", async () => {
    const registry = fixture(undefined, undefined, "1.0.0-rc.16")
    for (const [tool, args] of requests) {
      const value = payload(await runTool(tool, args, registry), tool)
      assert.equal(value.registryVersion, "1.0.0-rc.16", tool)
      assert.equal(Object.hasOwn(metadata(tool, value), "behavior"), false, tool)
      if (tool === "install_plan") assert.ok(!(value.notes as string[]).some((note) => note.includes("consumer responsibilities")))
    }
  })

  test("explicit null behavior is rejected rather than treated as absent historical metadata", async () => {
    const registry = fixture(null)
    for (const [tool, args] of requests) {
      const result = await runTool(tool, args, registry)
      assert.equal(result.isError, true, tool)
      assert.equal(result.structuredContent, undefined, tool)
      assert.match(result.content[0].text, /Invalid behavior contract.*expected an object/, tool)
    }
  })

  const malformed = [
    ["future schema version", (contract: RegistryBehavior) => { Object.assign(contract, { schemaVersion: 2 }) }],
    ["missing state", (contract: RegistryBehavior) => { delete (contract.states as Partial<RegistryBehavior["states"]>).loading }],
    ["unsupported support", (contract: RegistryBehavior) => { Object.assign(contract.states.error, { support: "automatic" }) }],
    ["unsupported transition", (contract: RegistryBehavior) => { Object.assign(contract.states.error, { transitions: ["running"] }) }],
    ["oversized copy", (contract: RegistryBehavior) => { contract.states.error.how = "x".repeat(2049) }],
    ["unsafe content path", (contract: RegistryBehavior) => { contract.content[0]!.path = "content.__proto__.title" }],
    ["duplicate content path", (contract: RegistryBehavior) => { contract.content.push({ ...contract.content[0]!, key: "another", sample: "Another label" }) }],
    ["missing action duty", (contract: RegistryBehavior) => { contract.actions[0]!.consumer = [] }],
    ["unknown property", (contract: RegistryBehavior) => { Object.assign(contract, { executor: "https://example.test/run.js" }) }],
  ] as const

  for (const [label, mutate] of malformed) {
    test(`rejects ${label} in a manifest before fetching source`, async () => {
      const contract = behavior()
      mutate(contract)
      const registry = fixture(behavior(), contract)
      await assert.rejects(() => createRegistryClient(registry.base, undefined, registry.fetchImpl), /Invalid behavior contract/)
      for (const [tool, args] of requests) {
        const result = await runTool(tool, args, registry)
        assert.equal(result.isError, true, tool)
        assert.equal(result.structuredContent, undefined, tool)
        assert.match(result.content[0].text, /Invalid behavior contract/, tool)
      }
      assert.equal(registry.callsTo(registry.contentUrl(name)), 0, "no source was fetched after invalid metadata")
    })

    test(`rejects ${label} in verified payloads without relaxing a valid manifest`, async () => {
      const contract = behavior()
      mutate(contract)
      const registry = fixture(contract, behavior())
      const client = await createRegistryClient(registry.base, undefined, registry.fetchImpl)
      await assert.rejects(() => client.getItem(name), /Invalid behavior contract/)
      for (const [tool, args] of requests.filter(([tool]) => tool === "get_component" || tool === "install_plan")) {
        const result = await runTool(tool, args, registry)
        assert.equal(result.isError, true, tool)
        assert.equal(result.structuredContent, undefined, tool)
        assert.match(result.content[0].text, /Invalid behavior contract/, tool)
      }
    })
  }

  test("wire schemas type optional behavior deeply and reject unsupported versions", async () => {
    const registry = fixture(behavior())
    for (const [tool, args] of requests) {
      const value = payload(await runTool(tool, args, registry), tool)
      const validate = validators.get(tool)!
      for (const replacement of [null, {}, { ...behavior(), schemaVersion: 2 }, { ...behavior(), actions: [{ name: "save", props: [] }] }]) {
        const changed = structuredClone(value)
        metadata(tool, changed).behavior = replacement
        assert.equal(validate(changed).valid, false, `${tool} allowed malformed nested behavior`)
      }
      const unknown = structuredClone(value)
      const unknownBehavior = metadata(tool, unknown).behavior as Record<string, unknown>
      unknownBehavior.executor = "https://example.test/run.js"
      assert.equal(validate(unknown).valid, false, `${tool} allowed an undeclared behavior property`)
      const historic = structuredClone(value)
      delete metadata(tool, historic).behavior
      assert.equal(validate(historic).valid, true, `${tool} made behavior mandatory for historical items`)
    }
  })
})
