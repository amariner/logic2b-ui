import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  fetchUnverifiedIndex,
  fetchUnverifiedItem,
  indexUrl,
  itemUrl,
} from "../src/registry-raw.ts"
import type { FetchLike } from "../src/registry.ts"

/** The legacy mirrors stay readable for explicit compatibility callers only. */
describe("legacy unverified readers", () => {
  const base = "https://reg.test"
  function fakeFetch(routes: Record<string, unknown>): FetchLike {
    return async (url: string) =>
      url in routes
        ? { ok: true, status: 200, text: async () => JSON.stringify(routes[url]) }
        : { ok: false, status: 404, text: async () => "Not found" }
  }

  test("url builders target the mutable mirrors", () => {
    assert.equal(indexUrl("https://x.com/"), "https://x.com/r/index.json")
    assert.equal(itemUrl("https://x.com", "button"), "https://x.com/r/button.json")
  })

  test("index reader parses an array and rejects anything else", async () => {
    const index = [{ name: "button", type: "registry:ui", description: "x" }]
    assert.equal((await fetchUnverifiedIndex(base, fakeFetch({ [indexUrl(base)]: index }))).length, 1)
    await assert.rejects(
      () => fetchUnverifiedIndex(base, fakeFetch({ [indexUrl(base)]: { nope: true } })),
      /malformed/
    )
  })

  test("item reader validates structure but carries no integrity", async () => {
    const payload = { name: "button", type: "registry:ui", description: "x", files: [] }
    const item = await fetchUnverifiedItem(base, "button", fakeFetch({ [itemUrl(base, "button")]: payload }))
    assert.equal(item.name, "button")
    assert.equal(item.integrity, undefined)
    assert.equal(item.registryVersion, undefined)
    await assert.rejects(() => fetchUnverifiedItem(base, "ghost", fakeFetch({})), /HTTP 404/)
  })
})
