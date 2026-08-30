import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, before, describe, test } from "node:test"

import {
  aliasToDir,
  addComponents,
  createRegistryClient,
  DEFAULT_ALIASES,
  DEFAULT_REGISTRY,
  detectCssPath,
  detectPackageManager,
  installCommand,
  indexUrl,
  installManifestPath,
  itemUrl,
  loadConfig,
  readInstallManifest,
  resolveRegistryVersion,
  resolveGraph,
  targetPath,
  validateItem,
  versionsUrl,
  type Config,
  type FetchLike,
  type RegistryItem,
  updateComponents,
} from "../src/lib.ts"

function fakeFetch(routes: Record<string, unknown>): FetchLike {
  return async (url: string) => {
    if (url in routes) {
      const value = routes[url]
      const text = typeof value === "string" ? value : JSON.stringify(value)
      return { ok: true, status: 200, text: async () => text }
    }
    return { ok: false, status: 404, text: async () => "Not found" }
  }
}

function versionedRegistry(
  base: string,
  releases: { version: string; content: string }[],
): Record<string, unknown> {
  const routes: Record<string, unknown> = {
    [versionsUrl(base)]: {
      schemaVersion: 1,
      latest: releases.at(-1)!.version,
      channels: { next: releases.at(-1)!.version },
      versions: releases.map(({ version }) => ({
        version,
        channel: "next",
        releasedAt: "2026-08-29",
        manifest: `/r/versions/${version}.json`,
      })),
    },
  }
  for (const release of releases) {
    const payload = JSON.stringify({
      name: "button",
      type: "registry:ui",
      description: "Button",
      files: [
        { path: "ui/button.tsx", type: "registry:ui", content: release.content },
      ],
    })
    const hash = createHash("sha256").update(payload).digest()
    const digest = hash.toString("hex")
    const integrity = `sha256-${hash.toString("base64")}`
    routes[`${base}/r/versions/${release.version}.json`] = {
      schemaVersion: 1,
      version: release.version,
      channel: "next",
      releasedAt: "2026-08-29",
      items: [
        {
          name: "button",
          type: "registry:ui",
          description: "Button",
          version: release.version,
          registryVersion: release.version,
          integrity,
          content: `/r/content/${digest}.json`,
          changelog: "/r/changelog/button.json",
        },
      ],
    }
    routes[`${base}/r/content/${digest}.json`] = payload
  }
  return routes
}

function config(overrides: Partial<Config> = {}): Config {
  return {
    registry: DEFAULT_REGISTRY,
    srcDir: "src",
    cssPath: "src/styles/globals.css",
    aliases: DEFAULT_ALIASES,
    iconLibrary: "lucide",
    ...overrides,
  }
}

describe("aliasToDir", () => {
  test("resolves @/ under srcDir when src exists", () => {
    assert.equal(
      aliasToDir("/proj", "src", "@/components/ui"),
      "/proj/src/components/ui"
    )
  })

  test("resolves @/ at cwd root when there is no src dir", () => {
    assert.equal(
      aliasToDir("/proj", ".", "@/components/ui"),
      "/proj/components/ui"
    )
  })

  test("supports the ~/ alias prefix too", () => {
    assert.equal(aliasToDir("/proj", "src", "~/lib"), "/proj/src/lib")
  })
})

describe("targetPath", () => {
  const c = config()

  test("ui/ files land under the ui alias, without the ui/ prefix", () => {
    assert.equal(
      targetPath(c, "/proj", { path: "ui/button.tsx", type: "registry:ui", content: "x" }),
      "/proj/src/components/ui/button.tsx"
    )
  })

  test("blocks/ files land under the components alias, without blocks/", () => {
    assert.equal(
      targetPath(c, "/proj", {
        path: "blocks/login-01/login-form.tsx",
        type: "registry:block",
        content: "x",
      }),
      "/proj/src/components/login-01/login-form.tsx"
    )
  })

  test("charts/ files keep the charts/ segment under components", () => {
    assert.equal(
      targetPath(c, "/proj", {
        path: "charts/chart-area-01.tsx",
        type: "registry:block",
        content: "x",
      }),
      "/proj/src/components/charts/chart-area-01.tsx"
    )
  })

  test("hooks/ files land under the hooks alias", () => {
    assert.equal(
      targetPath(c, "/proj", {
        path: "hooks/use-mobile.ts",
        type: "registry:hook",
        content: "x",
      }),
      "/proj/src/hooks/use-mobile.ts"
    )
  })

  test("lib/utils.ts maps to the utils alias as a single file", () => {
    assert.equal(
      targetPath(c, "/proj", { path: "lib/utils.ts", type: "registry:lib", content: "x" }),
      "/proj/src/lib/utils.ts"
    )
  })

  test("other lib/ files land under the lib alias", () => {
    assert.equal(
      targetPath(c, "/proj", { path: "lib/format.ts", type: "registry:lib", content: "x" }),
      "/proj/src/lib/format.ts"
    )
  })

  test("a .css theme file sits next to the configured Tailwind entry", () => {
    assert.equal(
      targetPath(config({ cssPath: "src/styles/globals.css" }), "/proj", {
        path: "theme.css",
        type: "registry:theme",
        content: "x",
      }),
      "/proj/src/styles/theme.css"
    )
  })

  test("honors custom aliases from components.json", () => {
    const custom = config({
      aliases: { ...DEFAULT_ALIASES, ui: "@/ui", components: "@/blocks" },
    })
    assert.equal(
      targetPath(custom, "/proj", { path: "ui/card.tsx", type: "registry:ui", content: "x" }),
      "/proj/src/ui/card.tsx"
    )
    assert.equal(
      targetPath(custom, "/proj", {
        path: "blocks/hero-01/hero.tsx",
        type: "registry:block",
        content: "x",
      }),
      "/proj/src/blocks/hero-01/hero.tsx"
    )
  })

  test("places files at cwd root when srcDir is '.'", () => {
    assert.equal(
      targetPath(config({ srcDir: "." }), "/proj", {
        path: "ui/button.tsx",
        type: "registry:ui",
        content: "x",
      }),
      "/proj/components/ui/button.tsx"
    )
  })
})

describe("url builders", () => {
  test("itemUrl strips a trailing slash from the registry base", () => {
    assert.equal(
      itemUrl("https://ui.logic2b.com/", "button"),
      "https://ui.logic2b.com/r/button.json"
    )
  })

  test("indexUrl builds the registry index path", () => {
    assert.equal(
      indexUrl("https://ui.logic2b.com"),
      "https://ui.logic2b.com/r/index.json"
    )
  })

  test("versionsUrl builds the release index path", () => {
    assert.equal(
      versionsUrl("https://ui.logic2b.com/"),
      "https://ui.logic2b.com/r/versions.json",
    )
  })
})

describe("version-aware registry client", () => {
  const base = "https://versioned.test"
  const routes = versionedRegistry(base, [
    { version: "1.0.0-rc.1", content: "export const v = 0\n" },
    { version: "1.0.0", content: "export const v = 1\n" },
    { version: "1.1.0", content: "export const v = 2\n" },
  ])

  test("resolves channels and semver ranges to the highest matching manifest", async () => {
    const channel = await resolveRegistryVersion(base, "next", fakeFetch(routes))
    assert.equal(channel.resolved, "1.1.0")
    const range = await resolveRegistryVersion(base, "~1.0.0", fakeFetch(routes))
    assert.equal(range.resolved, "1.0.0")
  })

  test("rejects invalid and unsatisfied ranges", async () => {
    await assert.rejects(
      () => resolveRegistryVersion(base, "banana", fakeFetch(routes)),
      /Invalid registry version/,
    )
    await assert.rejects(
      () => resolveRegistryVersion(base, "^9.0.0", fakeFetch(routes)),
      /No published registry version/,
    )
  })

  test("verifies content integrity and attaches the resolved versions", async () => {
    const client = await createRegistryClient(base, "~1.0.0", fakeFetch(routes))
    const item = await client.getItem("button")
    assert.equal(item.files?.[0].content, "export const v = 1\n")
    assert.equal(item._registry?.registryVersion, "1.0.0")
    assert.equal(item._registry?.itemVersion, "1.0.0")
  })

  test("refuses a payload that does not match the immutable manifest", async () => {
    const tampered = { ...routes }
    const contentUrl = Object.keys(tampered).find((url) =>
      url.includes("/r/content/"),
    )!
    tampered[contentUrl] = "{}"
    const client = await createRegistryClient(
      base,
      "1.0.0-rc.1",
      fakeFetch(tampered),
    )
    await assert.rejects(() => client.getItem("button"), /Integrity check failed/)
  })

  test("refuses manifests that redirect outside the registry origin", async () => {
    const redirected = structuredClone(routes)
    ;(redirected[versionsUrl(base)] as { versions: { manifest: string }[] })
      .versions[0].manifest = "https://attacker.test/r/manifest.json"
    await assert.rejects(
      () => resolveRegistryVersion(base, "1.0.0-rc.1", fakeFetch(redirected)),
      /must stay under/
    )
  })
})

describe("versioned install manifest", () => {
  const base = "https://install.test"
  let dir: string

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "logic2b-versioned-"))
    await mkdir(join(dir, "src"), { recursive: true })
  })

  after(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test("records the exact resolved item and advances only through update", async () => {
    const firstRoutes = versionedRegistry(base, [
      { version: "1.0.0", content: "export const v = 1\n" },
    ])
    await addComponents(["button"], {
      cwd: dir,
      registry: base,
      registryVersion: "^1.0.0",
      install: false,
      fetchImpl: fakeFetch(firstRoutes),
    })

    assert.equal(
      await readFile(join(dir, "src/components/ui/button.tsx"), "utf8"),
      "export const v = 1\n",
    )
    const installed = await readInstallManifest(dir)
    assert.equal(installed?.registry.requestedVersion, "^1.0.0")
    assert.equal(installed?.registry.resolvedVersion, "1.0.0")
    assert.equal(installed?.items.button.version, "1.0.0")
    assert.ok(installed?.items.button.integrity?.startsWith("sha256-"))
    assert.ok(existsSync(installManifestPath(dir)))

    const nextRoutes = versionedRegistry(base, [
      { version: "1.0.0", content: "export const v = 1\n" },
      { version: "1.1.0", content: "export const v = 2\n" },
    ])
    const summary = await updateComponents(["button"], {
      cwd: dir,
      registry: base,
      registryVersion: "^1.0.0",
      install: false,
      fetchImpl: fakeFetch(nextRoutes),
    })
    assert.equal(summary.updated, 1)
    assert.equal(summary.resolvedVersion, "1.1.0")
    assert.equal(
      await readFile(join(dir, "src/components/ui/button.tsx"), "utf8"),
      "export const v = 2\n",
    )
    assert.equal(
      (await readInstallManifest(dir))?.registry.resolvedVersion,
      "1.1.0",
    )
  })
})

describe("configured icon libraries", () => {
  test("rewrites installed files, dependencies and update bases together", async () => {
    const dir = await mkdtemp(join(tmpdir(), "logic2b-icons-"))
    try {
      await mkdir(join(dir, "src"), { recursive: true })
      await writeFile(join(dir, "components.json"), JSON.stringify({ iconLibrary: "tabler" }))
      const registryItem = (content: string): RegistryItem => ({
        name: "icon-test",
        type: "registry:ui",
        description: "Icon test",
        dependencies: ["lucide-react", "clsx"],
        files: [{ path: "ui/icon-test.tsx", type: "registry:ui", content }],
      })
      const client = {
        registry: "https://icons.test",
        index: [],
        async getItem(): Promise<RegistryItem> {
          return registryItem('import { SearchIcon } from "lucide-react"\nexport { SearchIcon }\n')
        },
      }
      const resolved = await addComponents(["icon-test"], {
        cwd: dir,
        client,
        install: false,
      })
      const installed = await readFile(join(dir, "src/components/ui/icon-test.tsx"), "utf8")
      assert.match(installed, /IconSearch as SearchIcon/)
      assert.match(installed, /@tabler\/icons-react/)
      assert.doesNotMatch(installed, /lucide-react/)
      assert.equal(await readFile(join(dir, ".logic2b/base/ui/icon-test.tsx"), "utf8"), installed)
      assert.deepEqual(resolved.get("icon-test")?.dependencies, ["clsx", "@tabler/icons-react"])

      const nextItem = registryItem(
        'import { SearchIcon } from "lucide-react"\nexport { SearchIcon }\nexport const revision = 2\n',
      )
      const summary = await updateComponents(["icon-test"], {
        cwd: dir,
        registry: client.registry,
        install: false,
        fetchImpl: fakeFetch({
          [indexUrl(client.registry)]: [nextItem],
          [itemUrl(client.registry, "icon-test")]: nextItem,
        }),
      })
      const updated = await readFile(join(dir, "src/components/ui/icon-test.tsx"), "utf8")
      assert.equal(summary.updated, 1)
      assert.match(updated, /revision = 2/)
      assert.match(updated, /@tabler\/icons-react/)
      assert.doesNotMatch(updated, /lucide-react/)
      assert.equal(await readFile(join(dir, ".logic2b/base/ui/icon-test.tsx"), "utf8"), updated)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe("validateItem", () => {
  test("returns the item when name and type are present", () => {
    const item = validateItem("button", { name: "button", type: "registry:ui" })
    assert.equal(item.name, "button")
  })

  test("throws on a non-object payload", () => {
    assert.throws(() => validateItem("button", "nope"), /malformed/)
  })

  test("throws when name or type is missing", () => {
    assert.throws(() => validateItem("button", { name: "button" }), /missing/)
  })

  test("throws when files is not an array", () => {
    assert.throws(
      () => validateItem("button", { name: "button", type: "registry:ui", files: {} }),
      /malformed "files"/
    )
  })

  test("rejects mismatched item names and unsafe file paths", () => {
    assert.throws(
      () => validateItem("button", { name: "card", type: "registry:ui" }),
      /mismatched name/
    )
    assert.throws(
      () =>
        validateItem("button", {
          name: "button",
          type: "registry:ui",
          files: [{ path: "../../package.json", type: "registry:file", content: "{}" }],
        }),
      /Unsafe registry file path/
    )
  })
})

describe("resolveGraph", () => {
  const registry: Record<string, RegistryItem> = {
    "login-01": {
      name: "login-01",
      type: "registry:block",
      description: "",
      registryDependencies: ["button", "card"],
    },
    button: {
      name: "button",
      type: "registry:ui",
      description: "",
      registryDependencies: ["utils"],
    },
    card: {
      name: "card",
      type: "registry:ui",
      description: "",
      registryDependencies: ["utils"],
    },
    utils: { name: "utils", type: "registry:lib", description: "" },
  }

  test("resolves the full transitive dependency graph", async () => {
    const seen: string[] = []
    const getItem = async (name: string) => {
      seen.push(name)
      return registry[name]
    }
    const resolved = await resolveGraph(["login-01"], getItem)
    assert.deepEqual(
      [...resolved.keys()].sort(),
      ["button", "card", "login-01", "utils"]
    )
  })

  test("fetches each item only once despite shared dependencies", async () => {
    const fetches: string[] = []
    const getItem = async (name: string) => {
      fetches.push(name)
      return registry[name]
    }
    await resolveGraph(["login-01"], getItem)
    // utils is a dep of both button and card, but must be fetched once.
    const utilsFetches = fetches.filter((n) => n === "utils").length
    assert.equal(utilsFetches, 1)
  })

  test("terminates on a dependency cycle", async () => {
    const cyclic: Record<string, RegistryItem> = {
      a: { name: "a", type: "registry:ui", description: "", registryDependencies: ["b"] },
      b: { name: "b", type: "registry:ui", description: "", registryDependencies: ["a"] },
    }
    const resolved = await resolveGraph(["a"], async (n) => cyclic[n])
    assert.deepEqual([...resolved.keys()].sort(), ["a", "b"])
  })
})

describe("loadConfig", () => {
  let dir: string

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "logic2b-cli-"))
  })

  after(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test("returns defaults when there is no components.json", async () => {
    const c = await loadConfig(dir)
    assert.equal(c.registry, DEFAULT_REGISTRY)
    assert.deepEqual(c.aliases, DEFAULT_ALIASES)
    // No src/ dir in the temp folder → srcDir collapses to "."
    assert.equal(c.srcDir, ".")
  })

  test("reads registry and merges aliases from components.json", async () => {
    await writeFile(
      join(dir, "components.json"),
      JSON.stringify({
        aliases: { ui: "@/ui" },
        tailwind: { css: "app/main.css" },
        logic2b: { registry: "https://example.test" },
      })
    )
    const c = await loadConfig(dir)
    assert.equal(c.registry, "https://example.test")
    assert.equal(c.aliases.ui, "@/ui")
    // unspecified aliases keep their defaults
    assert.equal(c.aliases.utils, DEFAULT_ALIASES.utils)
    assert.equal(c.cssPath, "app/main.css")
    assert.equal(c.iconLibrary, "lucide")
  })

  test("reads and validates the configured icon library", async () => {
    await writeFile(join(dir, "components.json"), JSON.stringify({ iconLibrary: "phosphor" }))
    assert.equal((await loadConfig(dir)).iconLibrary, "phosphor")
    await writeFile(join(dir, "components.json"), JSON.stringify({ iconLibrary: "unknown" }))
    await assert.rejects(() => loadConfig(dir), /must be one of/)
    await writeFile(join(dir, "components.json"), "{}")
  })

  test("a --registry override beats components.json", async () => {
    const c = await loadConfig(dir, "https://override.test")
    assert.equal(c.registry, "https://override.test")
  })

  test("throws a helpful error on invalid JSON", async () => {
    await writeFile(join(dir, "components.json"), "{ not json")
    await assert.rejects(() => loadConfig(dir), /not valid JSON/)
  })
})

describe("detectCssPath", () => {
  let dir: string

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "logic2b-css-"))
  })

  after(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test("falls back to a sensible default when nothing is found", () => {
    assert.equal(detectCssPath(dir, "src"), "src/styles/globals.css")
    assert.equal(detectCssPath(dir, "."), "styles/globals.css")
  })

  test("finds an existing candidate stylesheet", async () => {
    const { mkdir } = await import("node:fs/promises")
    await mkdir(join(dir, "app"), { recursive: true })
    await writeFile(join(dir, "app/globals.css"), "")
    assert.equal(detectCssPath(dir, "src"), "app/globals.css")
    assert.ok(existsSync(join(dir, "app/globals.css")))
  })
})

describe("detectPackageManager / installCommand", () => {
  const tmp = () => mkdtemp(join(tmpdir(), "l2b-pm-"))

  test("defaults to npm with no signals", async () => {
    assert.equal(detectPackageManager(await tmp()), "npm")
  })

  test("prefers the packageManager field over lockfiles", async () => {
    const dir = await tmp()
    await writeFile(join(dir, "package.json"), JSON.stringify({ packageManager: "yarn@4.1.0" }))
    await writeFile(join(dir, "pnpm-lock.yaml"), "")
    assert.equal(detectPackageManager(dir), "yarn")
  })

  test("detects each lockfile", async () => {
    for (const [file, pm] of [
      ["pnpm-lock.yaml", "pnpm"],
      ["yarn.lock", "yarn"],
      ["bun.lockb", "bun"],
      ["package-lock.json", "npm"],
    ] as const) {
      const dir = await tmp()
      await writeFile(join(dir, file), "")
      assert.equal(detectPackageManager(dir), pm)
    }
  })

  test("ignores a malformed package.json", async () => {
    const dir = await tmp()
    await writeFile(join(dir, "package.json"), "{nope")
    await writeFile(join(dir, "yarn.lock"), "")
    assert.equal(detectPackageManager(dir), "yarn")
  })

  test("builds the right install invocation per pm", () => {
    assert.deepEqual(installCommand("npm", ["a", "b"]), ["npm", "install", "a", "b"])
    assert.deepEqual(installCommand("pnpm", ["a"]), ["pnpm", "add", "a"])
    assert.deepEqual(installCommand("yarn", ["a"]), ["yarn", "add", "a"])
    assert.deepEqual(installCommand("bun", ["a"]), ["bun", "add", "a"])
  })
})
