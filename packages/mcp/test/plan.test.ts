import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { buildInstallPlan, planPath } from "../src/plan.ts"
import { itemUrl, type FetchLike, type RegistryFile } from "../src/registry.ts"

const file = (path: string): RegistryFile => ({ path, type: "x", content: `// ${path}` })

describe("planPath", () => {
  const cases: [string, string][] = [
    ["ui/button.tsx", "src/components/ui/button.tsx"],
    ["blocks/login-01/login-form.tsx", "src/components/login-01/login-form.tsx"],
    ["charts/chart-area-01.tsx", "src/components/charts/chart-area-01.tsx"],
    ["hooks/use-mobile.ts", "src/hooks/use-mobile.ts"],
    ["lib/utils.ts", "src/lib/utils.ts"],
    ["theme.css", "src/styles/theme.css"],
  ]
  for (const [input, expected] of cases) {
    test(`${input} → ${expected}`, () => {
      assert.equal(planPath("src", file(input)), expected)
    })
  }

  test("empty srcDir maps to the project root", () => {
    assert.equal(planPath("", file("ui/button.tsx")), "components/ui/button.tsx")
    assert.equal(planPath(".", file("theme.css")), "styles/theme.css")
  })
})

describe("buildInstallPlan", () => {
  const base = "https://reg.test"
  const items: Record<string, unknown> = {
    button: {
      name: "button", type: "registry:ui", description: "x",
      dependencies: ["radix-ui", "class-variance-authority"],
      files: [file("ui/button.tsx")],
    },
    card: {
      name: "card", type: "registry:ui", description: "x",
      files: [file("ui/card.tsx")],
    },
    "login-01": {
      name: "login-01", type: "registry:block", title: "Login", description: "x",
      registryDependencies: ["button", "card"],
      dependencies: ["radix-ui"],
      files: [file("blocks/login-01/login-form.tsx")],
    },
    theme: {
      name: "theme", type: "registry:style", description: "x",
      dependencies: ["tw-animate-css"],
      files: [file("theme.css")],
    },
  }
  const fetchImpl: FetchLike = async (url: string) => {
    const name = Object.keys(items).find((n) => url === itemUrl(base, n))
    return name
      ? { ok: true, status: 200, text: async () => JSON.stringify(items[name]) }
      : { ok: false, status: 404, text: async () => "Not found" }
  }

  test("resolves registry dependencies and dedupes npm deps", async () => {
    const plan = await buildInstallPlan(["login-01"], { base, fetchImpl })
    assert.deepEqual(
      plan.items.map((i) => [i.name, i.requested]),
      [["login-01", true], ["button", false], ["card", false]]
    )
    assert.deepEqual(plan.npmDependencies, ["class-variance-authority", "radix-ui"])
    assert.deepEqual(
      plan.files.map((f) => f.path),
      [
        "src/components/login-01/login-form.tsx",
        "src/components/ui/button.tsx",
        "src/components/ui/card.tsx",
      ]
    )
  })

  test("requesting overlapping items writes each file once", async () => {
    const plan = await buildInstallPlan(["login-01", "button"], { base, fetchImpl })
    const buttons = plan.files.filter((f) => f.path.endsWith("button.tsx"))
    assert.equal(buttons.length, 1)
  })

  test("suggests the theme when absent, explains the import when present", async () => {
    const without = await buildInstallPlan(["button"], { base, fetchImpl })
    assert.ok(without.notes.some((n) => n.includes('plan the "theme" item')))
    const withTheme = await buildInstallPlan(["button", "theme"], { base, fetchImpl })
    assert.ok(withTheme.notes.some((n) => n.includes("Import the theme stylesheet")))
    assert.ok(withTheme.files.some((f) => f.path === "src/styles/theme.css"))
  })

  test("unknown item surfaces the registry error", async () => {
    await assert.rejects(
      () => buildInstallPlan(["ghost"], { base, fetchImpl }),
      /HTTP 404/
    )
  })
})
