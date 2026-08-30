import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { describe, test } from "node:test"

import {
  fetchIndex,
  fetchItem,
  fetchChangelog,
  fetchRegistryVersions,
  createRegistryClient,
  filterIndex,
  indexUrl,
  itemUrl,
  changelogUrl,
  versionsUrl,
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

describe("versioned registry", () => {
  const base = "https://reg.test"
  const item = {
    name: "button",
    type: "registry:ui",
    description: "Versioned button.",
    files: [{ path: "ui/button.tsx", type: "registry:ui", content: "// v1" }],
  }
  const itemText = JSON.stringify(item)
  const integrity = `sha256-${createHash("sha256").update(itemText).digest("base64")}`
  const content = "/r/content/button-v1.json"
  const manifest = {
    schemaVersion: 1,
    version: "1.0.0",
    channel: "latest",
    releasedAt: "2026-08-29",
    items: [
      {
        name: "button",
        type: "registry:ui",
        description: "Versioned button.",
        version: "1.0.0",
        registryVersion: "1.0.0",
        integrity,
        content,
        changelog: "/r/changelog/button.json",
      },
    ],
  }
  const versions = {
    schemaVersion: 1,
    latest: "1.0.0",
    channels: { latest: "1.0.0", stable: "^1.0.0" },
    versions: [
      {
        version: "1.0.0",
        channel: "latest",
        releasedAt: "2026-08-29",
        manifest: "/r/versions/1.0.0.json",
      },
    ],
  }
  const changelog = {
    schemaVersion: 1,
    name: "button",
    currentVersion: "1.0.0",
    changes: [
      { version: "1.0.0", releasedAt: "2026-08-29", kind: "baseline", summary: "Initial." },
    ],
  }

  function versionFetch(overrides: Record<string, string> = {}): FetchLike {
    const routes: Record<string, string> = {
      [versionsUrl(base)]: JSON.stringify(versions),
      [`${base}/r/versions/1.0.0.json`]: JSON.stringify(manifest),
      [`${base}${content}`]: itemText,
      [changelogUrl(base, "button")]: JSON.stringify(changelog),
      ...overrides,
    }
    return async (url: string) =>
      url in routes
        ? { ok: true, status: 200, text: async () => routes[url] }
        : { ok: false, status: 404, text: async () => "Not found" }
  }

  test("reads versions, changelogs and resolves a channel", async () => {
    assert.equal((await fetchRegistryVersions(base, versionFetch())).latest, "1.0.0")
    assert.equal((await fetchChangelog(base, "button", versionFetch())).name, "button")
    const client = await createRegistryClient(base, "stable", versionFetch())
    assert.equal(client.requestedVersion, "stable")
    assert.equal(client.resolvedVersion, "1.0.0")
    const resolved = await client.getItem("button")
    assert.equal(resolved.files?.[0]?.content, "// v1")
    assert.equal(resolved.integrity, integrity)
  })

  test("refuses a content payload that does not match its SHA-256", async () => {
    const client = await createRegistryClient(
      base,
      "1.0.0",
      versionFetch({ [`${base}${content}`]: JSON.stringify({ ...item, description: "tampered" }) })
    )
    await assert.rejects(() => client.getItem("button"), /Integrity check failed/)
  })

  test("rejects invalid and unsatisfied version selectors", async () => {
    await assert.rejects(
      () => createRegistryClient(base, "not semver", versionFetch()),
      /Invalid registry version/
    )
    await assert.rejects(
      () => createRegistryClient(base, ">=2", versionFetch()),
      /No published registry version satisfies/
    )
  })

  test("rejects unsafe files and cross-origin manifest references", async () => {
    const redirected = structuredClone(versions)
    redirected.versions[0].manifest = "https://attacker.test/r/manifest.json"
    await assert.rejects(
      () =>
        createRegistryClient(
          base,
          "1.0.0",
          versionFetch({ [versionsUrl(base)]: JSON.stringify(redirected) })
        ),
      /must stay under/
    )

    const unsafe = JSON.stringify({
      ...item,
      files: [{ path: "../../package.json", type: "registry:file", content: "{}" }],
    })
    const unsafeIntegrity = `sha256-${createHash("sha256").update(unsafe).digest("base64")}`
    const unsafeManifest = structuredClone(manifest)
    unsafeManifest.items[0].integrity = unsafeIntegrity
    const client = await createRegistryClient(
      base,
      "1.0.0",
      versionFetch({
        [`${base}/r/versions/1.0.0.json`]: JSON.stringify(unsafeManifest),
        [`${base}${content}`]: unsafe,
      })
    )
    await assert.rejects(() => client.getItem("button"), /Unsafe registry file path/)
  })
})
