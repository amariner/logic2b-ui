import assert from "node:assert/strict"
import test from "node:test"

import {
  SCAFFOLD_STARTERS,
  SCAFFOLD_STARTER_DEFINITIONS,
} from "@logic2b/scaffold"

import { LAUNCH_DEMOS, getLaunchDemo } from "../src/data/launch-demos.ts"

test("launch demos mirror every scaffold starter in canonical order", () => {
  assert.deepEqual(
    LAUNCH_DEMOS.map((demo) => demo.name),
    SCAFFOLD_STARTERS,
  )

  for (const demo of LAUNCH_DEMOS) {
    const definition = SCAFFOLD_STARTER_DEFINITIONS[demo.name]
    assert.equal(demo.title, definition.title)
    assert.equal(demo.description, definition.description)
    assert.deepEqual(demo.items, definition.items)
    assert.equal(demo.previewHref, `/demos/launch/${demo.name}`)
    assert.match(demo.command, new RegExp(`--starter ${demo.name}(?: |$)`))
    assert.match(demo.command, /--template vite(?: |$)/)
    assert.match(demo.command, /--cwd logic2b-[a-z]+(?: |$)/)
  }
})

test("launch demo lookup rejects unknown names", () => {
  assert.equal(getLaunchDemo("marketing"), LAUNCH_DEMOS[0])
  assert.equal(getLaunchDemo("unknown"), undefined)
})
