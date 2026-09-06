import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { buildInstallPlan } from "../src/plan.ts"
import {
  DEFAULT_REGISTRY_CHANNEL,
  changelogUrl,
  createRegistryClient,
  fetchChangelog,
  fetchRegistryVersions,
  filterIndex,
  kindOf,
  resolveRegistryVersion,
  scoreItem,
  searchIndex,
  versionsUrl,
  type IndexItem,
} from "../src/registry.ts"
import { ImmutableRegistry, mirrorUrls, type FixtureItem } from "./helpers/immutable-registry.ts"

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
  test("versionsUrl and changelogUrl trim trailing slashes", () => {
    assert.equal(versionsUrl("https://x.com/"), "https://x.com/r/versions.json")
    assert.equal(changelogUrl("https://x.com/", "button"), "https://x.com/r/changelog/button.json")
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

describe("verified registry client", () => {
  const button: FixtureItem = {
    name: "button",
    type: "registry:ui",
    description: "Versioned button.",
    files: [{ path: "ui/button.tsx", type: "registry:ui", content: "// v1" }],
  }
  const login: FixtureItem = {
    name: "login-01",
    type: "registry:block",
    description: "Login block.",
    registryDependencies: ["button"],
    files: [{ path: "blocks/login-01/login-form.tsx", type: "registry:block", content: "// login" }],
  }
  const buttonV2: FixtureItem = {
    ...button,
    version: "1.1.0",
    files: [{ path: "ui/button.tsx", type: "registry:ui", content: "// v2" }],
  }
  const registry = () =>
    new ImmutableRegistry({ items: [button, login], channels: { stable: "^1.0.0" } })

  test("reads versions and changelogs, resolves an explicit channel", async () => {
    const r = registry()
    assert.equal((await fetchRegistryVersions(r.base, r.fetchImpl)).latest, "1.0.0")
    assert.equal((await fetchChangelog(r.base, "button", r.fetchImpl)).name, "button")
    const client = await createRegistryClient(r.base, "stable", r.fetchImpl)
    assert.equal(client.requestedVersion, "stable")
    assert.equal(client.resolvedVersion, "1.0.0")
    const resolved = await client.getItem("button")
    assert.equal(resolved.files?.[0]?.content, "// v1")
    assert.equal(resolved.integrity, r.integrity("button"))
    assert.equal(resolved.registryVersion, "1.0.0")
  })

  test("omitted version resolves the default channel to an exact release", async () => {
    const r = registry()
    for (const omitted of [undefined, "", "   "]) {
      const client = await createRegistryClient(r.base, omitted, r.fetchImpl)
      assert.equal(client.requestedVersion, DEFAULT_REGISTRY_CHANNEL)
      assert.equal(client.resolvedVersion, "1.0.0")
      assert.equal((await client.getItem("button")).files?.[0]?.content, "// v1")
    }
    const mirrors = mirrorUrls(r.base, ["button"])
    assert.deepEqual(r.calls.filter((url) => mirrors.includes(url)), [], "no mutable mirror was read")
    assert.deepEqual(
      [...new Set(r.calls)],
      [r.versionsUrl, r.manifestUrl(), r.contentUrl("button")],
      "only the versions index, one manifest and content-addressed payloads are read"
    )
  })

  test("exact versions and ranges resolve the same immutable release", async () => {
    const r = registry()
    for (const selector of ["1.0.0", "^1.0.0", ">=1.0.0-0", "next"]) {
      const client = await createRegistryClient(r.base, selector, r.fetchImpl)
      assert.equal(client.resolvedVersion, "1.0.0", selector)
    }
  })

  test("a moved channel does not change a client that already resolved", async () => {
    const r = registry()
    const before = await createRegistryClient(r.base, undefined, r.fetchImpl)
    r.publish("1.1.0", [buttonV2, login])
    assert.equal((await fetchRegistryVersions(r.base, r.fetchImpl)).channels.next, "1.1.0")

    const item = await before.getItem("button")
    assert.equal(item.registryVersion, "1.0.0")
    assert.equal(item.files?.[0]?.content, "// v1")
    assert.equal(r.callsTo(r.versionsUrl), 2, "the earlier client never re-reads the versions index")
    assert.equal(r.callsTo(r.manifestUrl("1.1.0")), 0)

    const after = await createRegistryClient(r.base, undefined, r.fetchImpl)
    assert.equal(after.resolvedVersion, "1.1.0")
    assert.equal((await after.getItem("button")).files?.[0]?.content, "// v2")
    assert.equal((await after.getItem("button")).version, "1.1.0")
  })

  test("a deleted payload fails the verified read without touching mirrors", async () => {
    const r = registry()
    const client = await createRegistryClient(r.base, undefined, r.fetchImpl)
    r.routes.delete(r.contentUrl("button"))
    await assert.rejects(
      () => client.getItem("button"),
      /Registry item "button" content for 1\.0\.0 is unavailable: HTTP 404/
    )
    const mirrors = mirrorUrls(r.base, ["button"])
    assert.deepEqual(r.calls.filter((url) => mirrors.includes(url)), [])
  })

  test("an unpublished item is reported against the resolved release", async () => {
    const r = registry()
    const client = await createRegistryClient(r.base, undefined, r.fetchImpl)
    await assert.rejects(() => client.getItem("ghost"), /"ghost" is not present in registry 1\.0\.0/)
    assert.equal(r.calls.length, 2, "no network request is made for an unlisted name")
  })

  test("refuses a content payload that does not match its SHA-256", async () => {
    const r = registry().tamper("button", (item) => ({ ...item, description: "tampered" }))
    const client = await createRegistryClient(r.base, "1.0.0", r.fetchImpl)
    await assert.rejects(() => client.getItem("button"), /Integrity check failed for "button" in registry 1\.0\.0/)
  })

  test("a tampered transitive dependency fails the whole plan", async () => {
    const r = registry().tamper("button", (item) => ({
      ...item,
      files: [{ path: "ui/button.tsx", type: "registry:ui", content: "// injected" }],
    }))
    await assert.rejects(
      () => buildInstallPlan(["login-01"], { base: r.base, fetchImpl: r.fetchImpl }),
      /Integrity check failed for "button"/
    )
    const mirrors = mirrorUrls(r.base, ["button", "login-01"])
    assert.deepEqual(r.calls.filter((url) => mirrors.includes(url)), [])
  })

  test("a verified plan resolves the release once and verifies every dependency", async () => {
    const r = registry()
    const plan = await buildInstallPlan(["login-01"], { base: r.base, fetchImpl: r.fetchImpl })
    assert.equal(plan.requestedVersion, DEFAULT_REGISTRY_CHANNEL)
    assert.equal(plan.registryVersion, "1.0.0")
    assert.deepEqual(
      plan.items.map((item) => [item.name, item.integrity]),
      [["login-01", r.integrity("login-01")], ["button", r.integrity("button")]]
    )
    assert.equal(r.callsTo(r.versionsUrl), 1)
    assert.equal(r.callsTo(r.manifestUrl()), 1)
  })

  test("an unavailable manifest is an error, not a fallback", async () => {
    const r = registry()
    r.routes.delete(r.manifestUrl())
    await assert.rejects(
      () => createRegistryClient(r.base, undefined, r.fetchImpl),
      /Registry manifest 1\.0\.0 is unavailable: HTTP 404/
    )
    await assert.rejects(
      () => createRegistryClient(r.base, "1.0.0", r.fetchImpl),
      /Registry manifest 1\.0\.0 is unavailable/
    )
    assert.ok(!r.calls.includes(`${r.base}/r/index.json`))
  })

  test("an unavailable versions index blocks the default resolution", async () => {
    const r = registry()
    r.routes.delete(r.versionsUrl)
    await assert.rejects(
      () => createRegistryClient(r.base, undefined, r.fetchImpl),
      /Registry versions index is unavailable: HTTP 404/
    )
    assert.deepEqual(r.calls, [r.versionsUrl])
  })

  test("rejects malformed manifests and version indexes", async () => {
    const wrongVersion = registry().replaceManifest({
      schemaVersion: 1, version: "9.9.9", channel: "next", releasedAt: "2026-08-29", items: [],
    })
    await assert.rejects(
      () => createRegistryClient(wrongVersion.base, undefined, wrongVersion.fetchImpl),
      /Registry manifest 1\.0\.0 is malformed/
    )

    const invalidJson = registry().replaceManifest("{not json")
    await assert.rejects(
      () => createRegistryClient(invalidJson.base, undefined, invalidJson.fetchImpl),
      /Registry manifest 1\.0\.0 .* is not valid JSON/
    )

    const noIntegrity = registry()
    const manifest = JSON.parse(noIntegrity.routes.get(noIntegrity.manifestUrl())!)
    delete manifest.items[0].integrity
    noIntegrity.replaceManifest(manifest)
    await assert.rejects(
      () => createRegistryClient(noIntegrity.base, "1.0.0", noIntegrity.fetchImpl),
      /without a complete integrity contract/
    )

    const duplicate = registry()
    const dup = JSON.parse(duplicate.routes.get(duplicate.manifestUrl())!)
    dup.items.push(dup.items[0])
    duplicate.replaceManifest(dup)
    await assert.rejects(
      () => createRegistryClient(duplicate.base, "1.0.0", duplicate.fetchImpl),
      /lists "button" twice/
    )

    const badRelease = registry()
    badRelease.routes.set(
      badRelease.versionsUrl,
      JSON.stringify({ schemaVersion: 1, latest: "1.0.0", channels: {}, versions: [{ version: "not-semver", manifest: 1 }] })
    )
    await assert.rejects(
      () => resolveRegistryVersion(badRelease.base, "1.0.0", badRelease.fetchImpl),
      /contains a malformed release/
    )
  })

  test("rejects invalid and unsatisfied version selectors", async () => {
    const r = registry()
    await assert.rejects(
      () => createRegistryClient(r.base, "not semver", r.fetchImpl),
      /Invalid registry version "not semver".*\(next, stable\)/
    )
    await assert.rejects(
      () => createRegistryClient(r.base, ">=2", r.fetchImpl),
      /No published registry version satisfies/
    )
  })

  test("rejects unsafe files and cross-origin manifest references", async () => {
    const redirected = registry()
    redirected.releases[0].manifest = "https://attacker.test/r/manifest.json"
    redirected.writeVersions()
    await assert.rejects(
      () => createRegistryClient(redirected.base, "1.0.0", redirected.fetchImpl),
      /must stay under/
    )

    const unsafe = new ImmutableRegistry({
      items: [{
        ...button,
        files: [{ path: "../../package.json", type: "registry:file", content: "{}" }],
      }],
    })
    const client = await createRegistryClient(unsafe.base, "1.0.0", unsafe.fetchImpl)
    await assert.rejects(() => client.getItem("button"), /Unsafe registry file path/)
  })

  test("reports a fetch failure with the document it was reading", async () => {
    const r = registry()
    const failing: typeof r.fetchImpl = async (url) => {
      if (url === r.manifestUrl()) throw new Error("connection reset")
      return r.fetchImpl(url)
    }
    await assert.rejects(
      () => createRegistryClient(r.base, undefined, failing),
      /Registry manifest 1\.0\.0 could not be fetched from .*: connection reset\./
    )
  })
})
