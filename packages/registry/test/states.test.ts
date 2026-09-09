import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import ts from "typescript"
import { z } from "zod"
import { registry } from "../registry.ts"
import { assertRegistryBehavior, BEHAVIOR_SCHEMA, BEHAVIOR_STATES } from "../../scaffold/src/behavior.ts"
import { BEHAVIOR_CONTRACTS } from "../states.ts"

const schema = z.fromJSONSchema(BEHAVIOR_SCHEMA)
test("customer slice has complete typed states, truthful source slots and callbacks", async () => {
  assert.deepEqual(Object.keys(BEHAVIOR_CONTRACTS).sort(), ["admin-customers-01", "customer-edit-01"])
  for (const [name, contract] of Object.entries(BEHAVIOR_CONTRACTS)) {
    schema.parse(contract)
    assertRegistryBehavior(contract)
    assert.deepEqual(Object.keys(contract.states).sort(), [...BEHAVIOR_STATES].sort())
    const item = registry.find(item => item.name === name)!
    assert.deepEqual(item.behavior, contract)
    const source = await readFile(new URL(`../${item.files![0].path}`, import.meta.url), "utf8")
    const ast = ts.createSourceFile("block.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const values = new Map<string, string>()
    for (const statement of ast.statements) if (ts.isVariableStatement(statement) && statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of statement.declarationList.declarations) if (declaration.name.getText(ast) === "content" && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
        for (const property of declaration.initializer.properties) if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer)) values.set(`content.${property.name.getText(ast)}`, property.initializer.text)
      }
    }
    assert.ok(values.size > 0)
    for (const slot of contract.content) {
      assert.equal(values.get(slot.path), slot.sample, `${name}: missing/drifted ${slot.path}`)
      assert.match(source, new RegExp(`text\\.${slot.key}\\b`), `${name}: slot is not rendered`)
    }
    for (const action of contract.actions) assert.match(source, new RegExp(`\\b${action.callback}\\b`))
    const payload = JSON.parse(await readFile(new URL(`../../../apps/web/public/r/${name}.json`, import.meta.url), "utf8"))
    assert.deepEqual(payload.behavior, contract)
  }
})
test("behavior schema rejects missing states, unknown support and invalid intents", () => {
  const contract = BEHAVIOR_CONTRACTS["admin-customers-01"]
  for (const change of [{ schemaVersion: 2 }, { states: {} }, { intents: ["invented"] }, { states: { ...contract.states, loading: { ...contract.states.loading, support: "magic" } } }]) { assert.equal(schema.safeParse({ ...contract, ...change }).success, false); assert.throws(() => assertRegistryBehavior({ ...contract, ...change }), /Invalid behavior contract/) }
})
test("published behavior schema equals the shared contract", async () => {
  const schema = JSON.parse(await readFile(new URL("../../../apps/web/public/schema/behavior.json", import.meta.url), "utf8"))
  const { $schema, $id, ...body } = schema
  assert.deepEqual(body, BEHAVIOR_SCHEMA)
})
