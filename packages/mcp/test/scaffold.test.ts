import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { encodePreset, DEFAULT_CONFIG } from "@logic2b/tokens"

import { indexUrl, itemUrl, type FetchLike } from "../src/registry.ts"
import {
  buildScaffoldPlan,
  SCAFFOLD_FRAMEWORKS,
  SCAFFOLD_STARTERS,
  SCAFFOLD_STARTER_DEFINITIONS,
} from "../src/scaffold.ts"

const base = "https://reg.test"
const themeCss = `@import "tailwindcss";
:root {
  --radius: 0.625rem;
  --primary: oklch(0.205 0 0);
}
.dark {
  --primary: oklch(0.922 0 0);
}`

const registry: Record<string, unknown> = {
  "landing-page-01": {
    name: "landing-page-01",
    type: "registry:block",
    title: "Complete landing page",
    description: "Complete landing page",
    registryDependencies: [
      "navbar-01",
      "hero-01-animated",
      "feature-grid-01-animated",
      "cta-01",
      "footer-01",
    ],
    files: [{
      path: "blocks/landing-page-01/landing-page.tsx",
      type: "registry:block",
      content: "export function LandingPage() {}",
    }],
  },
  "navbar-01": item("navbar-01", "blocks/navbar-01/navbar.tsx", "export function Navbar() {}"),
  "hero-01-animated": item("hero-01-animated", "blocks/hero-01-animated/hero.tsx", "export function Hero() {}"),
  "feature-grid-01-animated": item(
    "feature-grid-01-animated",
    "blocks/feature-grid-01-animated/feature-grid.tsx",
    "export function FeatureGrid() {}"
  ),
  "cta-01": item("cta-01", "blocks/cta-01/cta.tsx", "export function Cta() {}"),
  "footer-01": item("footer-01", "blocks/footer-01/footer.tsx", "export function Footer() {}"),
  "dashboard-02": item(
    "dashboard-02",
    "blocks/dashboard-02/analytics-dashboard.tsx",
    "export function AnalyticsDashboard() {}",
    ["recharts"]
  ),
  "login-01": item(
    "login-01",
    "blocks/login-01/login-form.tsx",
    'import { LockIcon } from "lucide-react"\nexport function LoginForm() { return <LockIcon /> }',
    ["lucide-react"]
  ),
  theme: {
    name: "theme",
    type: "registry:style",
    title: "Theme",
    description: "Theme",
    dependencies: ["tw-animate-css"],
    files: [{ path: "theme.css", type: "registry:style", content: themeCss }],
  },
}

function item(
  name: string,
  path: string,
  content: string,
  dependencies = ["lucide-react"]
) {
  return {
    name,
    type: "registry:block",
    title: name,
    description: name,
    dependencies,
    files: [{ path, type: "registry:block", content }],
  }
}

const fetchImpl: FetchLike = async (url) => {
  if (url === indexUrl(base)) {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(Object.values(registry)),
    }
  }
  const name = Object.keys(registry).find((candidate) => itemUrl(base, candidate) === url)
  return name
    ? { ok: true, status: 200, text: async () => JSON.stringify(registry[name]) }
    : { ok: false, status: 404, text: async () => "Not found" }
}

function fileMap(plan: Awaited<ReturnType<typeof buildScaffoldPlan>>) {
  return new Map(plan.files.map((file) => [file.path, file.content]))
}

describe("buildScaffoldPlan", () => {
  test("exposes three framework shells and three starter compositions", () => {
    assert.deepEqual(SCAFFOLD_FRAMEWORKS, ["next", "vite", "astro"])
    assert.deepEqual(SCAFFOLD_STARTERS, ["marketing", "dashboard", "auth"])
    assert.deepEqual(SCAFFOLD_STARTER_DEFINITIONS.marketing.items, [
      "landing-page-01",
    ])
  })

  test("builds a complete Next.js marketing project", async () => {
    const plan = await buildScaffoldPlan({
      base,
      framework: "next",
      starter: "marketing",
      name: "acme-site",
      fetchImpl,
    })
    const files = fileMap(plan)
    assert.equal(plan.projectName, "acme-site")
    assert.ok(files.has("package.json"))
    assert.ok(files.has("app/layout.tsx"))
    assert.ok(files.has("app/page.tsx"))
    assert.ok(files.has("components/starter-page.tsx"))
    assert.ok(files.has("components/hero-01-animated/hero.tsx"))
    assert.ok(files.has("components/landing-page-01/landing-page.tsx"))
    assert.ok(files.has("styles/theme.css"))
    assert.ok(files.has(".logic2b/manifest.json"))
    assert.equal(
      files.get(".logic2b/base/blocks/hero-01-animated/hero.tsx"),
      "export function Hero() {}",
    )
    assert.equal(files.get(".logic2b/base/theme.css"), themeCss)
    assert.match(files.get("components/starter-page.tsx")!, /<LandingPage \/>/)
    const manifest = JSON.parse(files.get("package.json")!)
    assert.equal(manifest.dependencies.next, "16.3.3")
    assert.equal(manifest.dependencies["lucide-react"], "1.23.0")
    const installManifest = JSON.parse(files.get(".logic2b/manifest.json")!)
    assert.deepEqual(installManifest.items.theme.files, ["theme.css"])
    assert.deepEqual(
      plan.items.filter((item) => item.requested).map((item) => item.name),
      ["landing-page-01", "theme"],
    )
    assert.equal(
      plan.items.find((item) => item.name === "navbar-01")?.requested,
      false,
    )
    assert.deepEqual(
      installManifest.items["landing-page-01"].files,
      ["blocks/landing-page-01/landing-page.tsx"],
    )
    assert.equal(new Set(plan.files.map((file) => file.path)).size, plan.files.length)
  })

  test("builds a Vite dashboard with source-root aliases", async () => {
    const plan = await buildScaffoldPlan({
      base,
      framework: "vite",
      starter: "dashboard",
      fetchImpl,
    })
    const files = fileMap(plan)
    assert.ok(files.has("vite.config.ts"))
    assert.ok(files.has("src/main.tsx"))
    assert.ok(files.has("src/components/dashboard-02/analytics-dashboard.tsx"))
    assert.ok(files.has("src/styles/theme.css"))
    assert.match(files.get("vite.config.ts")!, /rolldownOptions/)
    assert.match(files.get("vite.config.ts")!, /name: "charts"/)
    assert.match(files.get("vite.config.ts")!, /includeDependenciesRecursively: false/)
    assert.match(files.get("src/components/starter-page.tsx")!, /AnalyticsDashboard/)
    assert.match(files.get("src/components/starter-page.tsx")!, /lazy\(\(\) =>/)
    assert.match(files.get("src/components/starter-page.tsx")!, /<Suspense/)
    assert.match(files.get("components.json")!, /src\/styles\/theme\.css/)
  })

  test("builds an Astro auth starter as a hydrated React island", async () => {
    const plan = await buildScaffoldPlan({
      base,
      framework: "astro",
      starter: "auth",
      fetchImpl,
    })
    const files = fileMap(plan)
    assert.ok(files.has("astro.config.mjs"))
    assert.match(files.get("src/pages/index.astro")!, /client:load/)
    assert.ok(files.has("src/components/login-01/login-form.tsx"))
    const manifest = JSON.parse(files.get("package.json")!)
    assert.equal(manifest.dependencies.astro, "7.2.9")
    assert.equal(manifest.dependencies["@astrojs/react"], "6.0.4")
  })

  test("applies a preset to theme.css and records it in components.json", async () => {
    const preset = encodePreset({ ...DEFAULT_CONFIG, theme: "blue", radius: "xl" })
    const plan = await buildScaffoldPlan({
      base,
      framework: "vite",
      starter: "auth",
      preset,
      fetchImpl,
    })
    const files = fileMap(plan)
    assert.equal(plan.preset, preset)
    assert.match(files.get("src/styles/theme.css")!, /--radius: 1rem;/)
    assert.match(files.get("src/styles/theme.css")!, /0\.546 0\.245 262\.881/)
    assert.equal(JSON.parse(files.get("components.json")!).logic2b.preset, preset)
  })

  test("builds a Hugeicons scaffold with matching source, snapshot and manifest", async () => {
    const preset = encodePreset({ ...DEFAULT_CONFIG, iconLibrary: "hugeicons" })
    const plan = await buildScaffoldPlan({
      base,
      framework: "vite",
      starter: "auth",
      preset,
      fetchImpl,
    })
    const files = fileMap(plan)
    const source = files.get("src/components/login-01/login-form.tsx")!
    assert.equal(plan.iconLibrary, "hugeicons")
    assert.match(source, /HugeiconsIcon/)
    assert.match(source, /LockIcon as Logic2bLockIconData/)
    assert.equal(files.get(".logic2b/base/blocks/login-01/login-form.tsx"), source)
    const manifest = JSON.parse(files.get("package.json")!)
    assert.equal(manifest.dependencies["@hugeicons/react"], "1.1.10")
    assert.equal(manifest.dependencies["@hugeicons/core-free-icons"], "4.3.0")
    assert.equal(manifest.dependencies["lucide-react"], undefined)
    assert.equal(JSON.parse(files.get("components.json")!).iconLibrary, "hugeicons")
  })

  test("rejects unsafe project names before fetching the registry", async () => {
    await assert.rejects(
      () =>
        buildScaffoldPlan({
          base,
          framework: "next",
          starter: "auth",
          name: "../../oops",
          fetchImpl,
        }),
      /Invalid project name/
    )
  })
})
