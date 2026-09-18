import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
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

  test("adjacent replacements remain independent in either direction", () => {
    for (const [local, remote] of [["a\nB-local\nc\nd\ne", "a\nb\nC-registry\nd\ne"], ["a\nb\nC-registry\nd\ne", "a\nB-local\nc\nd\ne"]]) {
      assert.deepEqual(merge3(BASE, local, remote), { merged: "a\nB-local\nC-registry\nd\ne", conflicts: 0 })
    }
  })

  test("a deletion and the immediately following replacement are independent", () => {
    assert.deepEqual(merge3(BASE, "a\nc\nd\ne", "a\nb\nC\nd\ne"), { merged: "a\nC\nd\ne", conflicts: 0 })
  })

  test("insertions at replacement boundaries keep their position", () => {
    const local = "a\nB\nc\nd\ne", remote = "a\nbefore\nb\nafter\nc\nd\ne"
    assert.deepEqual(merge3(BASE, local, remote), { merged: "a\nbefore\nB\nafter\nc\nd\ne", conflicts: 0 })
    assert.deepEqual(merge3(BASE, remote, local), { merged: "a\nbefore\nB\nafter\nc\nd\ne", conflicts: 0 })
  })

  test("adjacent edits retain the original final-newline convention", () => {
    for (const ending of ["", "\n", "\n\n"]) assert.deepEqual(merge3(`a\nb\nc${ending}`, `a\nB\nc${ending}`, `a\nb\nC${ending}`), { merged: `a\nB\nC${ending}`, conflicts: 0 })
  })

  test("large divergent files reject before allocating an unbounded comparison matrix", () => {
    const base = Array.from({ length: 2000 }, (_, index) => `line ${index}`).join("\n")
    assert.throws(() => merge3(base, base.replace("line 0", "local 0"), base.replace("line 1", "remote 1")), /comparison limit/)
  })

  test("an insertion inside a removed range conflicts, retaining both alternatives", () => {
    const result = merge3(BASE, "a\nreplacement\ne", "a\nb\ninserted\nc\nd\ne")
    assert.equal(result.conflicts, 1)
    assert.equal(result.merged, "a\n<<<<<<< local\nreplacement\n=======\nb\ninserted\nc\nd\n>>>>>>> registry\ne")
  })

  test("different insertions at the same interior boundary conflict", () => {
    const result = merge3(BASE, "a\nlocal\nb\nc\nd\ne", "a\nremote\nb\nc\nd\ne")
    assert.equal(result.conflicts, 1)
    assert.equal(result.merged, "a\n<<<<<<< local\nlocal\n=======\nremote\n>>>>>>> registry\nb\nc\nd\ne")
  })

  test("a wide replacement conflicts with all intersecting hunks without losing their stable gap", () => {
    const result = merge3(BASE, "a\nreplacement\ne", "a\nB\nc\nD\ne")
    assert.equal(result.conflicts, 1)
    assert.equal(result.merged, "a\n<<<<<<< local\nreplacement\n=======\nB\nc\nD\n>>>>>>> registry\ne")
  })

  test("custom marker labels affect generated conflicts only", () => {
    const original = "/*\n<<<<<<< local\nexample\n=======\nexample\n>>>>>>> registry\n*/\nconst value = 1\n"
    const result = merge3(original, original.replace("value = 1", "value = 2"), original.replace("value = 1", "value = 3"), { local: "local (unique)", remote: "registry (unique)" })
    assert.equal(result.conflicts, 1)
    assert.ok(result.merged.startsWith(original.slice(0, original.indexOf("const value"))))
    assert.match(result.merged, /<<<<<<< local \(unique\)\nconst value = 2/)
  })

  test("immutable rc.17 custom columns and a second filter change merge with the adjacent rc.18 accessibility fix", async () => {
    const source = async (version: string) => {
      const manifest = JSON.parse(await readFile(new URL(`../../../apps/web/public/r/versions/${version}.json`, import.meta.url), "utf8"))
      const entry = manifest.items.find((item: { name: string }) => item.name === "admin-customers-01")
      const bytes = await readFile(new URL(`../../../apps/web/public${entry.content}`, import.meta.url))
      assert.equal(`sha256-${createHash("sha256").update(bytes).digest("base64")}`, entry.integrity)
      return JSON.parse(bytes.toString("utf8")).files[0].content as string
    }
    const base = await source("1.0.0-rc.17"), remote = await source("1.0.0-rc.18")
    const customize = (text: string) => text.replace("  name: string", "  accountOwner: string\n  name: string")
      .replace('title: "Customers"', 'title: "Strategic customers"')
      .replace("<TableHead>{text.customer}</TableHead>", '<TableHead>{text.customer}</TableHead><TableHead className="hidden w-28 sm:table-cell">Account owner</TableHead>')
      .replace('<TableCell className="hidden tabular-nums sm:table-cell">{c.orders}', '<TableCell className="hidden sm:table-cell">{c.accountOwner}</TableCell>\n            <TableCell className="hidden tabular-nums sm:table-cell">{c.orders}')
      .replace("`${c.name}\\n${c.email}`", "`${c.name}\\n${c.email}\\n${c.accountOwner}`")
    const result = merge3(base, customize(base), remote)
    assert.equal(result.conflicts, 0)
    assert.equal(result.merged, customize(remote))
    assert.match(result.merged, /containerProps=\{\{ tabIndex: 0/)
    assert.equal(merge3(base, base.replace('<Table className="table-fixed">', '<Table className="table-fixed sm:min-w-[44rem]">'), remote).conflicts, 1)
  })
})
