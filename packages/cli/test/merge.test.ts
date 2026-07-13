import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { merge3 } from "../src/merge.ts"

const BASE = ["a", "b", "c", "d", "e"].join("\n")

describe("merge3", () => {
  test("identical sides pass through", () => {
    assert.deepEqual(merge3(BASE, BASE, BASE), { merged: BASE, conflicts: 0 })
  })

  test("local-only edits are kept when the registry is unchanged", () => {
    const local = ["a", "B!", "c", "d", "e"].join("\n")
    assert.deepEqual(merge3(BASE, local, BASE), { merged: local, conflicts: 0 })
  })

  test("registry-only edits are taken when local is pristine", () => {
    const remote = ["a", "b", "c", "D!", "e"].join("\n")
    assert.deepEqual(merge3(BASE, BASE, remote), { merged: remote, conflicts: 0 })
  })

  test("non-overlapping edits merge cleanly", () => {
    const local = ["a", "B-local", "c", "d", "e"].join("\n")
    const remote = ["a", "b", "c", "D-registry", "e"].join("\n")
    const r = merge3(BASE, local, remote)
    assert.equal(r.conflicts, 0)
    assert.equal(r.merged, ["a", "B-local", "c", "D-registry", "e"].join("\n"))
  })

  test("identical edits on both sides collapse to one", () => {
    const both = ["a", "same-change", "c", "d", "e"].join("\n")
    assert.deepEqual(merge3(BASE, both, both), { merged: both, conflicts: 0 })
  })

  test("overlapping different edits produce a marked conflict", () => {
    const local = ["a", "B-local", "c", "d", "e"].join("\n")
    const remote = ["a", "B-registry", "c", "d", "e"].join("\n")
    const r = merge3(BASE, local, remote)
    assert.equal(r.conflicts, 1)
    assert.equal(
      r.merged,
      ["a", "<<<<<<< local", "B-local", "=======", "B-registry", ">>>>>>> registry", "c", "d", "e"].join("\n")
    )
  })

  test("insertions at the end from both sides", () => {
    const local = BASE + "\nlocal-tail"
    const remote = BASE + "\nregistry-tail"
    const r = merge3(BASE, local, remote)
    assert.equal(r.conflicts, 1)
    assert.match(r.merged, /local-tail/)
    assert.match(r.merged, /registry-tail/)
  })

  test("local deletion + distant registry edit merge cleanly", () => {
    const local = ["a", "c", "d", "e"].join("\n") // deleted b
    const remote = ["a", "b", "c", "d", "E!"].join("\n")
    const r = merge3(BASE, local, remote)
    assert.equal(r.conflicts, 0)
    assert.equal(r.merged, ["a", "c", "d", "E!"].join("\n"))
  })

  test("registry insertion between untouched lines lands in place", () => {
    const remote = ["a", "b", "b2", "c", "d", "e"].join("\n")
    const local = ["a", "b", "c", "d", "e", "tail"].join("\n")
    const r = merge3(BASE, local, remote)
    assert.equal(r.conflicts, 0)
    assert.equal(r.merged, ["a", "b", "b2", "c", "d", "e", "tail"].join("\n"))
  })
})
