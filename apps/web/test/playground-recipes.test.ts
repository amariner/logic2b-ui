import assert from "node:assert/strict"
import test from "node:test"

import { API_CONTRACTS } from "@logic2b/registry/api"
import * as Recharts from "recharts"

import {
  PLAYGROUND_NAMES,
  PLAYGROUND_RECIPES,
  hasPlayground,
  type PlaygroundNode,
  type PlaygroundRecipe,
} from "../src/data/playground-recipes.ts"

function validateNode(
  recipeName: string,
  node: PlaygroundNode,
  componentExports: ReadonlySet<string>,
  initialProps: Readonly<Record<string, unknown>>,
) {
  assert.notEqual(
    Boolean(node.exportName),
    Boolean(node.element),
    `${recipeName} nodes need exactly one component or native element`,
  )
  if (node.exportName) {
    const availableExports = node.module === "recharts"
      ? new Set(Object.keys(Recharts))
      : componentExports
    assert.ok(
      availableExports.has(node.exportName),
      `${recipeName} cannot resolve composed ${node.exportName}`,
    )
  }
  if (node.element) {
    assert.equal(node.module, undefined, `${recipeName} native nodes cannot select a module`)
  }
  if (node.action) {
    assert.equal(node.element, "button", `${recipeName} actions need a native button`)
    assert.equal(node.action.type, "toast")
    assert.ok(node.action.message.length > 0)
  }
  for (const [prop, stateKey] of Object.entries(node.bindings ?? {})) {
    assert.ok(
      !Object.hasOwn(node.props ?? {}, prop),
      `${recipeName}.${node.exportName ?? node.element}.${prop} is both static and bound`,
    )
    assert.ok(
      Object.hasOwn(initialProps, stateKey),
      `${recipeName}.${node.exportName ?? node.element}.${prop} binds unknown ${stateKey}`,
    )
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      validateNode(recipeName, child, componentExports, initialProps)
    }
  }
}

test("playground recipes target real public component exports", () => {
  assert.equal(new Set(PLAYGROUND_NAMES).size, PLAYGROUND_NAMES.length)
  assert.equal(PLAYGROUND_NAMES.length, 71)

  for (const name of PLAYGROUND_NAMES) {
    const recipe: PlaygroundRecipe = PLAYGROUND_RECIPES[name]
    const contract = API_CONTRACTS[name]
    assert.ok(contract, `${name} has no generated API contract`)
    const componentExports = new Set(
      contract.exports
        .filter((entry) => entry.kind === "component")
        .map((entry) => entry.name),
    )
    assert.ok(
      componentExports.has(recipe.exportName),
      `${name} does not export ${recipe.exportName}`,
    )

    for (const rootProp of recipe.rootProps ?? []) {
      assert.ok(
        Object.hasOwn(recipe.initialProps, rootProp),
        `${name} root prop ${rootProp} has no initial value`,
      )
    }
    if (recipe.composition) {
      assert.equal(recipe.children, undefined, `${name} mixes children and composition`)
      assert.equal(recipe.options, undefined, `${name} mixes options and composition`)
      for (const node of recipe.composition) {
        validateNode(name, node, componentExports, recipe.initialProps)
      }
    }

    const controls = new Set<string>()
    for (const control of recipe.controls) {
      assert.ok(!controls.has(control.prop), `${name} repeats ${control.prop}`)
      controls.add(control.prop)
      assert.ok(
        Object.hasOwn(recipe.initialProps, control.prop),
        `${name}.${control.prop} has no initial value`,
      )
      const initialValue = recipe.initialProps[control.prop]
      if (control.kind === "boolean") {
        assert.equal(typeof initialValue, "boolean", `${name}.${control.prop} is not boolean`)
      } else if (control.kind === "number") {
        if (control.array) {
          assert.ok(
            Array.isArray(initialValue) && typeof initialValue[0] === "number",
            `${name}.${control.prop} is not a number array`,
          )
        } else {
          assert.equal(typeof initialValue, "number", `${name}.${control.prop} is not numeric`)
        }
      } else {
        assert.equal(typeof initialValue, "string", `${name}.${control.prop} is not text`)
      }
      if (control.kind === "select") {
        assert.ok(control.options.length >= 2)
        assert.ok(
          control.options.some(
            (option) => option.value === recipe.initialProps[control.prop],
          ),
          `${name}.${control.prop} initial value is not selectable`,
        )
      }
    }
  }
})

test("playground lookup is exact", () => {
  assert.equal(hasPlayground("button"), true)
  assert.equal(hasPlayground("Button"), false)
  assert.equal(hasPlayground("unknown"), false)
})
