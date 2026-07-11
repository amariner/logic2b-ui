import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, before, describe, test } from "node:test"

import {
  aliasToDir,
  DEFAULT_ALIASES,
  DEFAULT_REGISTRY,
  detectCssPath,
  indexUrl,
  itemUrl,
  loadConfig,
  resolveGraph,
  targetPath,
  validateItem,
  type Config,
  type RegistryItem,
} from "../src/lib.ts"

function config(overrides: Partial<Config> = {}): Config {
  return {
    registry: DEFAULT_REGISTRY,
    srcDir: "src",
    cssPath: "src/styles/globals.css",
    aliases: DEFAULT_ALIASES,
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
