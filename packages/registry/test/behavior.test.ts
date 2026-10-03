import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, test } from "node:test"
import type { RegistryBehavior } from "@logic2b/scaffold/behavior"
import { BEHAVIOR_CONTRACTS } from "../behavior.ts"
import { registry } from "../registry.ts"
import { verifyBehaviorSource } from "../scripts/behavior-source.ts"

const packageRoot = resolve(import.meta.dirname, "..")

function fixture(): RegistryBehavior {
  const behavior = structuredClone(BEHAVIOR_CONTRACTS["customer-edit-01"])
  behavior.content = [{ key: "title", type: "text", path: "content.title", sample: "Customers" }]
  behavior.actions = [{ name: "save", props: ["onSubmit"], consumer: ["Persist the draft."] }]
  return behavior
}

const source = `
import type * as React from "react"
export const content = { title: "Customers" } as const
export interface CustomerProps extends Omit<React.ComponentProps<"div">, "content"> {
  onSubmit?: (value: string) => void
}
export function Customer(props: CustomerProps) { return <div>{content.title}</div> }
`

describe("customer block behavior source evidence", () => {
  test("covers exactly the reference blocks and proves their current source contracts", async () => {
    assert.deepEqual(Object.keys(BEHAVIOR_CONTRACTS).sort(), ["admin-customers-01", "customer-edit-01"])
    for (const [name, behavior] of Object.entries(BEHAVIOR_CONTRACTS)) {
      const item = registry.find((candidate) => candidate.name === name)
      assert.equal(item?.type, "registry:block")
      assert.equal(item?.behavior, behavior)
      const path = item!.files!.find((file) => file.type === "registry:block" && file.path.endsWith(".tsx"))!.path
      assert.deepEqual(verifyBehaviorSource(await readFile(resolve(packageRoot, path), "utf8"), behavior, path), [])
    }
    assert.ok(registry.filter((item) => !Object.hasOwn(BEHAVIOR_CONTRACTS, item.name)).every((item) => !item.behavior), "uncovered catalog items do not imply behavior coverage")
  })

  test("supports literal nested copy, escapes and explicit export aliases without evaluating source", () => {
    const behavior = fixture()
    behavior.content = [{ key: "errors.retry", type: "text", path: "content.errors.retry", sample: "Try\nagain" }]
    const aliased = `
      import "./nonexistent-executable-module.ts"
      const copy = ({ errors: { retry: "Try\\nagain" } } satisfies Record<string, unknown>)
      export { copy as content }
      interface BaseProps { onSubmit(): void }
      type InternalProps = BaseProps & { className?: string }
      export { type InternalProps as CustomerProps }
      throw new Error("Source must remain inert")
    `
    assert.deepEqual(verifyBehaviorSource(aliased, behavior), [])
  })

  test("accepts locally inherited action props without rejecting external HTML inheritance", () => {
    assert.deepEqual(verifyBehaviorSource(source, fixture()), [])
    const inherited = `
      export const content = { title: "Customers" }
      interface Base { onSubmit?: () => void; onCancel?: () => void }
      export type CustomerProps = Pick<Base, "onSubmit"> & { className?: string }
    `
    assert.deepEqual(verifyBehaviorSource(inherited, fixture()), [])
    assert.match(verifyBehaviorSource(inherited.replace('Pick<Base, "onSubmit">', 'Omit<Base, "onSubmit">'), fixture()).join("\n"), /action save prop onSubmit/)
  })

  test("rejects missing/mismatched copy and an unexported or mutable content object", () => {
    assert.match(verifyBehaviorSource(source.replace('title: "Customers"', 'heading: "Customers"'), fixture()).join("\n"), /content.title is not a provable string literal/)
    assert.match(verifyBehaviorSource(source.replace('title: "Customers"', 'title: "Accounts"'), fixture()).join("\n"), /sample differs/)
    assert.match(verifyBehaviorSource(source.replace("export const content", "const content"), fixture()).join("\n"), /expected an exported const content/)
    assert.match(verifyBehaviorSource(source.replace("export const content", "export let content"), fixture()).join("\n"), /expected an exported const content/)
  })

  test("rejects stale action metadata and props that are private or absent in a union branch", () => {
    assert.match(verifyBehaviorSource(source.replace("onSubmit?", "onSave?"), fixture()).join("\n"), /action save prop onSubmit/)
    assert.match(verifyBehaviorSource(source.replace("export interface CustomerProps", "interface CustomerProps"), fixture()).join("\n"), /action save prop onSubmit/)
    const union = `export const content = {title: "Customers"}; export type CustomerProps = {onSubmit(): void} | {onCancel(): void};`
    assert.match(verifyBehaviorSource(union, fixture()).join("\n"), /action save prop onSubmit/)
  })

  test("does not treat executable initializers, spreads, computed keys or comments as copy evidence", () => {
    for (const object of [
      '{ title: (() => { throw new Error("Do not execute") })() }',
      '{ get title() { throw new Error("Do not execute") } }',
      '{ title: "Customers", ...loadCopy() }',
      '{ [getKey()]: "Customers", title: "Customers" }',
      '{ title: "Customers", title: "Accounts" }',
      '{ heading: "Accounts" /* title: "Customers" */ }',
    ]) {
      const inert = source.replace('{ title: "Customers" }', object)
      assert.match(verifyBehaviorSource(inert, fixture()).join("\n"), /content.title is not a provable string literal/)
    }
  })

  test("fails with actionable errors for malformed metadata, syntax and oversized source", () => {
    assert.match(verifyBehaviorSource(source, { ...fixture(), schemaVersion: 2 } as unknown as RegistryBehavior).join("\n"), /schema version|schemaVersion/)
    assert.match(verifyBehaviorSource("export const content = {", fixture(), "broken.tsx").join("\n"), /broken.tsx: source has syntax errors/)
    assert.match(verifyBehaviorSource(" ".repeat(1_000_001), fixture()).join("\n"), /source exceeds 1000000 bytes/)
  })
})
