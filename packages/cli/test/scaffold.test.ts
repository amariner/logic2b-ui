import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, before, describe, test } from "node:test"

import {
  indexUrl,
  itemUrl,
  updateComponents,
  type FetchLike,
} from "../src/lib.ts"
import {
  buildCliScaffoldPlan,
  packageManagerDevCommand,
  packageManagerInstallCommand,
  projectFiles,
  scaffoldProject,
} from "../src/scaffold.ts"

const base = "https://registry.test"

function item(name: string, path: string, content: string) {
  return {
    name,
    type: "registry:block",
    title: name,
    description: name,
    dependencies: ["lucide-react"],
    files: [{ path, type: "registry:block", content }],
  }
}

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
  "navbar-01": item(
    "navbar-01",
    "blocks/navbar-01/navbar.tsx",
    "export function Navbar() {}",
  ),
  "hero-01-animated": item(
    "hero-01-animated",
    "blocks/hero-01-animated/hero.tsx",
    "export function Hero() {}",
  ),
  "feature-grid-01-animated": item(
    "feature-grid-01-animated",
    "blocks/feature-grid-01-animated/feature-grid.tsx",
    "export function FeatureGrid() {}",
  ),
  "cta-01": item(
    "cta-01",
    "blocks/cta-01/cta.tsx",
    "export function Cta() {}",
  ),
  "footer-01": item(
    "footer-01",
    "blocks/footer-01/footer.tsx",
    "export function Footer() {}",
  ),
  theme: {
    name: "theme",
    type: "registry:style",
    title: "Theme",
    description: "Theme",
    dependencies: ["tw-animate-css"],
    files: [
      {
        path: "theme.css",
        type: "registry:style",
        content: '@import "tailwindcss";\n:root { --radius: 0.625rem; }\n',
      },
    ],
  },
}

const fetchImpl: FetchLike = async (url) => {
  if (url === indexUrl(base)) {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(Object.values(registry)),
    }
  }
  const name = Object.keys(registry).find(
    (candidate) => itemUrl(base, candidate) === url,
  )
  return name
    ? {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(registry[name]),
      }
    : { ok: false, status: 404, text: async () => "Not found" }
}

describe("CLI project scaffolding", () => {
  let root: string

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "logic2b-cli-scaffold-"))
  })

  after(async () => {
    await rm(root, { recursive: true, force: true })
  })

  test("builds the same complete project contract exposed by MCP", async () => {
    const plan = await buildCliScaffoldPlan({
      registry: base,
      framework: "vite",
      starter: "marketing",
      name: "acme-site",
      fetchImpl,
    })
    const files = new Map(plan.files.map((file) => [file.path, file.content]))
    assert.equal(plan.framework, "vite")
    assert.equal(plan.projectName, "acme-site")
    assert.ok(files.has("src/main.tsx"))
    assert.ok(files.has("src/components/navbar-01/navbar.tsx"))
    assert.ok(files.has("src/components/landing-page-01/landing-page.tsx"))
    assert.ok(files.has("src/styles/theme.css"))
    assert.ok(files.has(".logic2b/manifest.json"))
    assert.equal(
      files.get(".logic2b/base/blocks/navbar-01/navbar.tsx"),
      "export function Navbar() {}",
    )
    assert.equal(
      files.get(".logic2b/base/theme.css"),
      '@import "tailwindcss";\n:root { --radius: 0.625rem; }\n',
    )
    const lock = JSON.parse(files.get(".logic2b/manifest.json")!)
    assert.deepEqual(lock.items.theme.files, ["theme.css"])
    assert.match(
      files.get("src/components/starter-page.tsx")!,
      /<LandingPage \/>/,
    )
    assert.deepEqual(
      plan.items.filter((item) => item.requested).map((item) => item.name),
      ["landing-page-01", "theme"],
    )
    assert.equal(
      plan.items.find((item) => item.name === "footer-01")?.requested,
      false,
    )
    assert.deepEqual(lock.items["landing-page-01"].files, [
      "blocks/landing-page-01/landing-page.tsx",
    ])
  })

  test("wraps the generated app in a real Turbo workspace", async () => {
    const plan = await buildCliScaffoldPlan({
      registry: base,
      framework: "next",
      starter: "marketing",
      name: "acme-platform",
      fetchImpl,
    })
    const files = new Map(
      projectFiles(plan, true).map((file) => [file.path, file.content]),
    )
    assert.ok(files.has("pnpm-workspace.yaml"))
    assert.ok(files.has("turbo.json"))
    assert.ok(files.has("apps/web/app/page.tsx"))
    assert.ok(files.has("apps/web/.logic2b/manifest.json"))
    const rootPackage = JSON.parse(files.get("package.json")!)
    assert.deepEqual(rootPackage.workspaces, ["apps/*", "packages/*"])
    assert.equal(rootPackage.scripts.build, "turbo run build")
    assert.equal(rootPackage.devDependencies.turbo, "2.10.3")
    assert.equal(rootPackage.packageManager, "pnpm@11.10.0")
  })

  test("materializes an empty target and never invokes installation when disabled", async () => {
    const target = join(root, "generated-app")
    const result = await scaffoldProject({
      cwd: target,
      registry: base,
      framework: "astro",
      starter: "marketing",
      name: "generated-app",
      packageManager: "pnpm",
      install: false,
      fetchImpl,
    })
    assert.equal(result.installed, false)
    assert.equal(result.packageManager, "pnpm")
    assert.ok(existsSync(join(target, "src/pages/index.astro")))
    assert.ok(existsSync(join(target, "components.json")))
    assert.match(await readFile(join(target, "README.md"), "utf8"), /logic2b ui/)
  })

  test("seeds update snapshots so a generated project can take registry changes", async () => {
    const target = join(root, "update-ready-app")
    await scaffoldProject({
      cwd: target,
      registry: base,
      framework: "vite",
      starter: "marketing",
      packageManager: "pnpm",
      install: false,
      fetchImpl,
    })

    const updatedNavbar = "export function Navbar() { return null }"
    const updatedFetch: FetchLike = async (url, init) => {
      if (url === itemUrl(base, "navbar-01")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify(
              item(
                "navbar-01",
                "blocks/navbar-01/navbar.tsx",
                updatedNavbar,
              ),
            ),
        }
      }
      return fetchImpl(url, init)
    }
    const summary = await updateComponents(["navbar-01"], {
      cwd: target,
      fetchImpl: updatedFetch,
      install: false,
    })

    assert.equal(summary.updated, 1)
    assert.equal(summary.noBase, 0)
    assert.equal(
      await readFile(
        join(target, "src/components/navbar-01/navbar.tsx"),
        "utf8",
      ),
      updatedNavbar,
    )
  })

  test("refuses a non-empty target before contacting the registry", async () => {
    const target = join(root, "occupied")
    await mkdir(target)
    await writeFile(join(target, "keep.txt"), "do not touch")
    let fetched = false
    await assert.rejects(
      () =>
        scaffoldProject({
          cwd: target,
          registry: base,
          framework: "vite",
          starter: "marketing",
          install: false,
          fetchImpl: async (...args) => {
            fetched = true
            return fetchImpl(...args)
          },
        }),
      /requires an empty directory.*keep\.txt/,
    )
    assert.equal(fetched, false)
    assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "do not touch")
  })

  test("builds package-manager install and dev commands", () => {
    assert.deepEqual(packageManagerInstallCommand("npm"), ["npm", "install"])
    assert.deepEqual(packageManagerInstallCommand("yarn"), ["yarn"])
    assert.equal(packageManagerDevCommand("pnpm"), "pnpm run dev")
    assert.equal(packageManagerDevCommand("bun"), "bun run dev")
  })
})
