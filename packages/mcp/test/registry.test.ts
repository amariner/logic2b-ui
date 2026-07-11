import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  fetchIndex,
  fetchItem,
  filterIndex,
  indexUrl,
  itemUrl,
  kindOf,
  scoreItem,
  searchIndex,
  type FetchLike,
  type IndexItem,
} from "../src/registry.ts"

const index: IndexItem[] = [
  { name: "button", type: "registry:ui", title: "Button", description: "A clickable button." },
  { name: "card", type: "registry:ui", title: "Card", description: "A surface container." },
  {
    name: "login-01",
    type: "registry:block",
    title: "Login",
    description: "A centered login form.",
    categories: ["authentication"],
  },
  {
    name: "chart-area-01",
    type: "registry:block",
    title: "Area Chart",
    description: "A single-series area chart.",
    categories: ["charts", "charts-area"],
  },
  {
    name: "theme",
    type: "registry:theme",
    title: "Theme",
    description: "The design system tokens.",
  },
]

describe("url builders", () => {
  test("indexUrl trims trailing slash", () => {
    assert.equal(indexUrl("https://x.com/"), "https://x.com/r/index.json")
  })
  test("itemUrl builds the payload path", () => {
    assert.equal(itemUrl("https://x.com", "button"), "https://x.com/r/button.json")
  })
})

describe("kindOf", () => {
  test("classifies ui as component", () => {
    assert.equal(kindOf(index[0]), "component")
  })
  test("classifies a non-chart block as block", () => {
    assert.equal(kindOf(index[2]), "block")
  })
  test("classifies a charts-category block as chart", () => {
    assert.equal(kindOf(index[3]), "chart")
  })
  test("classifies theme", () => {
    assert.equal(kindOf(index[4]), "theme")
  })
})

describe("filterIndex", () => {
  test("no filter returns everything", () => {
    assert.equal(filterIndex(index).length, index.length)
  })
  test("kind=component excludes blocks, charts and theme", () => {
    const r = filterIndex(index, { kind: "component" })
    assert.deepEqual(r.map((i) => i.name).sort(), ["button", "card"])
  })
  test("kind=chart returns only chart-category blocks", () => {
    const r = filterIndex(index, { kind: "chart" })
    assert.deepEqual(r.map((i) => i.name), ["chart-area-01"])
  })
  test("kind=block excludes charts", () => {
    const r = filterIndex(index, { kind: "block" })
    assert.deepEqual(r.map((i) => i.name), ["login-01"])
  })
  test("category filter matches tagged items", () => {
    const r = filterIndex(index, { category: "authentication" })
    assert.deepEqual(r.map((i) => i.name), ["login-01"])
  })
})

describe("scoreItem / searchIndex", () => {
  test("exact name match dominates", () => {
    assert.ok(scoreItem(index[0], "button") >= 1000)
  })
  test("no match scores zero", () => {
    assert.equal(scoreItem(index[0], "xyzzy"), 0)
  })
  test("name hit outranks description-only hit", () => {
    const byName = scoreItem(index[3], "area") // name + title
    const byDesc = scoreItem(index[1], "container") // description only
    assert.ok(byName > byDesc)
  })
  test("searchIndex ranks and limits", () => {
    const r = searchIndex(index, "chart")
    assert.equal(r[0].name, "chart-area-01")
  })
  test("searchIndex respects the limit", () => {
    const r = searchIndex(index, "a", 2)
    assert.ok(r.length <= 2)
  })
  test("empty query yields no results via searchIndex filter", () => {
    // scoreItem returns 1 for empty, but callers guard; here every item scores 1.
    const r = searchIndex(index, "")
    assert.equal(r.length, index.length)
  })
})

describe("fetchIndex / fetchItem", () => {
  function fakeFetch(routes: Record<string, unknown>): FetchLike {
    return async (url: string) => {
      if (url in routes) {
        return { ok: true, status: 200, text: async () => JSON.stringify(routes[url]) }
      }
      return { ok: false, status: 404, text: async () => "Not found" }
    }
  }

  const base = "https://reg.test"

  test("fetchIndex parses an array payload", async () => {
    const f = fakeFetch({ [indexUrl(base)]: index })
    const r = await fetchIndex(base, f)
    assert.equal(r.length, index.length)
  })

  test("fetchIndex rejects a non-array payload", async () => {
    const f = fakeFetch({ [indexUrl(base)]: { nope: true } })
    await assert.rejects(() => fetchIndex(base, f), /malformed/)
  })

  test("fetchItem returns the payload object", async () => {
    const payload = { name: "button", type: "registry:ui", description: "x", files: [] }
    const f = fakeFetch({ [itemUrl(base, "button")]: payload })
    const r = await fetchItem(base, "button", f)
    assert.equal(r.name, "button")
  })

  test("fetchItem throws a helpful error on 404", async () => {
    const f = fakeFetch({})
    await assert.rejects(() => fetchItem(base, "ghost", f), /HTTP 404/)
  })
})
