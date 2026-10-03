import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

import { addComponents, createRegistryClient, indexUrl, itemUrl, validateItem, versionsUrl, type FetchLike } from "../src/lib.ts"
import { behaviorContract } from "./helpers/behavior.ts"

const base = "https://behavior-registry.test"
const name = "customers"
const source = {
  name,
  type: "registry:block",
  description: "Customer list",
  files: [{ path: "blocks/customers/customers.tsx", type: "registry:block", content: "export function Customers() {}" }],
}

function fetchRoutes(routes: Record<string, unknown>, fetched: string[] = []): FetchLike {
  return async (url) => {
    fetched.push(url)
    if (!Object.hasOwn(routes, url)) return { ok: false, status: 404, text: async () => "Not found" }
    const value = routes[url]
    return { ok: true, status: 200, text: async () => typeof value === "string" ? value : JSON.stringify(value) }
  }
}

function immutableRoutes(payload: unknown, indexBehavior?: unknown): Record<string, unknown> {
  const serialized = JSON.stringify(payload, null, 2)
  const hash = createHash("sha256").update(serialized).digest()
  return {
    [versionsUrl(base)]: { schemaVersion: 1, channels: { next: "1.0.0" }, versions: [{ version: "1.0.0", manifest: "/r/versions/1.0.0.json" }] },
    [`${base}/r/versions/1.0.0.json`]: {
      schemaVersion: 1,
      version: "1.0.0",
      items: [{ name, type: "registry:block", description: source.description, version: "1.0.0", integrity: `sha256-${hash.toString("base64")}`, content: "/r/content/payload.json", ...(indexBehavior === undefined ? {} : { behavior: indexBehavior }) }],
    },
    [`${base}/r/content/payload.json`]: serialized,
  }
}

test("CLI item validation preserves supplied behavior and historical omission", () => {
  const legacy = validateItem(name, source)
  assert.equal(Object.hasOwn(legacy, "behavior"), false)
  const supplied = { ...source, behavior: behaviorContract }
  assert.equal(validateItem(name, supplied), supplied)
  assert.deepEqual(validateItem(name, supplied).behavior, behaviorContract)
  assert.throws(() => validateItem(name, { ...source, behavior: { ...behaviorContract, schemaVersion: 2 } }), /Invalid behavior contract.*schema version/)
})

test("CLI rejects malformed behavior in the mutable index before fetching an item", async () => {
  const fetched: string[] = []
  await assert.rejects(() => createRegistryClient(base, undefined, fetchRoutes({
    [indexUrl(base)]: [{ name, type: "registry:block", description: source.description, behavior: { ...behaviorContract, schemaVersion: 2 } }],
    [itemUrl(base, name)]: source,
  }, fetched)), /Invalid behavior contract/)
  assert.deepEqual(fetched, [indexUrl(base)])
})

test("CLI validates immutable index behavior before reading the payload", async () => {
  const fetched: string[] = []
  await assert.rejects(() => createRegistryClient(base, "next", fetchRoutes(immutableRoutes(source, { ...behaviorContract, schemaVersion: 2 }), fetched)), /Invalid behavior contract/)
  assert.equal(fetched.some((url) => url.includes("/r/content/")), false)
})

test("CLI preserves behavior through immutable resolution and legacy payload bytes", async () => {
  const current = await createRegistryClient(base, "next", fetchRoutes(immutableRoutes({ ...source, behavior: behaviorContract }, behaviorContract)))
  assert.deepEqual(current.index[0].behavior, behaviorContract)
  assert.deepEqual((await current.getItem(name)).behavior, behaviorContract)
  const legacy = await createRegistryClient(base, "next", fetchRoutes(immutableRoutes(source)))
  const legacyItem = await legacy.getItem(name)
  assert.equal(Object.hasOwn(legacyItem, "behavior"), false)
  assert.deepEqual(legacyItem.files, source.files)
})

test("CLI rejects an integrity-valid malformed behavior before writing any project file", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-cli-bad-behavior-"))
  try {
    await assert.rejects(() => addComponents([name], {
      cwd,
      registry: base,
      registryVersion: "next",
      install: false,
      fetchImpl: fetchRoutes(immutableRoutes({ ...source, behavior: { ...behaviorContract, content: [] } })),
    }), /Invalid behavior contract at behavior.content/)
    assert.deepEqual(await readdir(cwd), [])
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test("CLI add returns the contract and prints its consumer responsibilities", async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), "logic2b-cli-behavior-"))
  const logs: string[] = []
  context.mock.method(console, "log", (message: string) => logs.push(message))
  try {
    const resolved = await addComponents([name], {
      cwd,
      registry: base,
      registryVersion: "next",
      install: false,
      fetchImpl: fetchRoutes(immutableRoutes({ ...source, behavior: behaviorContract }, behaviorContract)),
    })
    assert.deepEqual(resolved.get(name)?.behavior, behaviorContract)
    assert.ok(logs.some((message) => message === `\nConsumer responsibilities for ${name}:`))
    assert.ok(logs.some((message) => message.includes(behaviorContract.consumer[0])))
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
