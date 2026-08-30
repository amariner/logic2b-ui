import {
  applyPresetToCss,
  decodePreset,
  encodePreset,
  type IconLibrary,
} from "@logic2b/tokens"

import {
  ICON_PACKAGE_VERSIONS,
  rewriteIconDependencies,
  rewriteIconImports,
} from "./icons.ts"

export * from "./icons.ts"

export const SCAFFOLD_FRAMEWORKS = ["next", "vite", "astro"] as const
export type ScaffoldFramework = (typeof SCAFFOLD_FRAMEWORKS)[number]

export const SCAFFOLD_STARTERS = ["marketing", "dashboard", "auth"] as const
export type ScaffoldStarter = (typeof SCAFFOLD_STARTERS)[number]

export interface ScaffoldStarterDefinition {
  title: string
  description: string
  items: readonly string[]
}

/**
 * Public, read-only starter catalog. Product surfaces can describe the exact
 * compositions emitted by the CLI and MCP without maintaining a second list.
 */
export const SCAFFOLD_STARTER_DEFINITIONS: Readonly<
  Record<ScaffoldStarter, ScaffoldStarterDefinition>
> = {
  marketing: {
    title: "Marketing site",
    description:
      "A complete launch page with navigation, animated hero, feature grid, call to action and footer.",
    items: ["landing-page-01"],
  },
  dashboard: {
    title: "Analytics dashboard",
    description:
      "An application shell with KPI cards and production-ready charts.",
    items: ["dashboard-02"],
  },
  auth: {
    title: "Authentication",
    description: "A centered sign-in experience ready to wire to any backend.",
    items: ["login-01"],
  },
}

const EXACT_VERSIONS = {
  react: "19.2.7",
  reactDom: "19.2.7",
  reactTypes: "19.2.17",
  reactDomTypes: "19.2.3",
  nodeTypes: "24.3.0",
  typescript: "6.0.3",
  tailwind: "4.3.2",
  vite: "8.2.2",
  viteReact: "6.1.1",
  next: "16.3.3",
  astro: "7.2.9",
  astroReact: "6.0.4",
} as const

// The registry payload intentionally stays package-manager agnostic and names
// dependencies without versions. A full scaffold owns its package.json, so it
// pins the same compatible ranges the source registry is tested against.
const REGISTRY_DEPENDENCY_VERSIONS: Record<string, string> = {
  "@fontsource-variable/inter": "5.2.8",
  "@fontsource-variable/space-grotesk": "5.2.10",
  "@hookform/resolvers": "5.4.0",
  "class-variance-authority": "0.7.1",
  clsx: "2.1.1",
  cmdk: "1.1.1",
  "embla-carousel-react": "8.6.0",
  "input-otp": "1.4.2",
  "radix-ui": "1.6.1",
  "react-day-picker": "10.0.1",
  "react-hook-form": "7.81.0",
  "react-resizable-panels": "4.12.1",
  recharts: "3.9.2",
  sonner: "2.0.7",
  "tailwind-merge": "3.6.0",
  "tw-animate-css": "1.4.0",
  vaul: "1.1.2",
  zod: "4.4.3",
  ...ICON_PACKAGE_VERSIONS,
}

export interface ScaffoldPlanOptions {
  base: string
  framework: ScaffoldFramework
  starter: ScaffoldStarter
  name?: string
  preset?: string
  version?: string
  resolveInstallPlan: ScaffoldInstallPlanResolver
}

export interface ScaffoldInstallItem {
  name: string
  title: string
  requested: boolean
  version?: string
  integrity?: string
  files?: string[]
}

export interface ScaffoldInstallPlan {
  requestedVersion?: string
  registryVersion?: string
  items: ScaffoldInstallItem[]
  files: { path: string; content: string }[]
  /** Raw registry paths/content used as the base side of future 3-way updates. */
  snapshots: { path: string; content: string }[]
  npmDependencies: string[]
}

export type ScaffoldInstallPlanResolver = (
  names: string[],
  options: { base: string; srcDir: string; version?: string },
) => Promise<ScaffoldInstallPlan>

export interface ScaffoldPlan {
  registry: string
  requestedVersion?: string
  registryVersion?: string
  framework: ScaffoldFramework
  starter: {
    name: ScaffoldStarter
    title: string
    description: string
  }
  projectName: string
  preset?: string
  items: ScaffoldInstallItem[]
  files: { path: string; content: string }[]
  npmDependencies: string[]
  iconLibrary: IconLibrary
  commands: Record<"npm" | "pnpm" | "yarn" | "bun", string>
  notes: string[]
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function sortRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
  )
}

function projectName(value: string | undefined, starter: ScaffoldStarter): string {
  const name = (value ?? `logic2b-${starter}`).trim()
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error(
      `Invalid project name "${name}". Use lowercase letters, numbers, dots, underscores or dashes.`
    )
  }
  return name
}

function starterComponent(starter: ScaffoldStarter): string {
  if (starter === "marketing") {
    return `import { LandingPage } from "@/components/landing-page-01/landing-page"

export function StarterPage() {
  return <LandingPage />
}
`
  }
  if (starter === "dashboard") {
    return `import { lazy, Suspense } from "react"

const AnalyticsDashboard = lazy(() =>
  import("@/components/dashboard-02/analytics-dashboard").then((module) => ({
    default: module.AnalyticsDashboard,
  }))
)

export function StarterPage() {
  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <Suspense
        fallback={
          <div className="grid min-h-[24rem] place-items-center text-sm text-muted-foreground" role="status">
            Loading dashboard…
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </main>
  )
}
`
  }
  return `import { LoginForm } from "@/components/login-01/login-form"

export function StarterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  )
}
`
}

function baseManifest(
  framework: ScaffoldFramework,
  name: string,
  registryDependencies: string[]
) {
  const dependencies: Record<string, string> = Object.fromEntries(
    registryDependencies.map((dependency) => [
      dependency,
      REGISTRY_DEPENDENCY_VERSIONS[dependency] ?? "latest",
    ])
  )
  dependencies.react = EXACT_VERSIONS.react
  dependencies["react-dom"] = EXACT_VERSIONS.reactDom

  const devDependencies: Record<string, string> = {
    "@types/react": EXACT_VERSIONS.reactTypes,
    "@types/react-dom": EXACT_VERSIONS.reactDomTypes,
    tailwindcss: EXACT_VERSIONS.tailwind,
    typescript: EXACT_VERSIONS.typescript,
  }

  let scripts: Record<string, string>
  if (framework === "next") {
    dependencies.next = EXACT_VERSIONS.next
    devDependencies["@tailwindcss/postcss"] = EXACT_VERSIONS.tailwind
    devDependencies["@types/node"] = EXACT_VERSIONS.nodeTypes
    scripts = {
      dev: "next dev",
      build: "next build",
      start: "next start",
      typecheck: "tsc --noEmit",
    }
  } else if (framework === "astro") {
    dependencies.astro = EXACT_VERSIONS.astro
    dependencies["@astrojs/react"] = EXACT_VERSIONS.astroReact
    devDependencies["@tailwindcss/vite"] = EXACT_VERSIONS.tailwind
    scripts = {
      dev: "astro dev",
      build: "astro build",
      start: "astro preview",
    }
  } else {
    devDependencies["@tailwindcss/vite"] = EXACT_VERSIONS.tailwind
    devDependencies["@vitejs/plugin-react"] = EXACT_VERSIONS.viteReact
    devDependencies.vite = EXACT_VERSIONS.vite
    scripts = {
      dev: "vite",
      build: "tsc --noEmit && vite build",
      start: "vite preview",
      typecheck: "tsc --noEmit",
    }
  }

  return {
    name,
    private: true,
    version: "0.0.0",
    type: "module",
    scripts,
    dependencies: sortRecord(dependencies),
    devDependencies: sortRecord(devDependencies),
  }
}

function componentsConfig(
  base: string,
  framework: ScaffoldFramework,
  iconLibrary: IconLibrary,
  preset?: string,
  registryVersion?: string,
): string {
  const root = framework === "next" ? "" : "src/"
  return json({
    $schema: "https://ui.logic2b.com/schema.json",
    style: "default",
    tailwind: {
      css: `${root}styles/theme.css`,
      baseColor: "neutral",
      cssVariables: true,
    },
    aliases: {
      components: "@/components",
      ui: "@/components/ui",
      utils: "@/lib/utils",
      hooks: "@/hooks",
      lib: "@/lib",
    },
    iconLibrary,
    logic2b: {
      registry: base,
      ...(registryVersion ? { version: registryVersion } : {}),
      ...(preset ? { preset } : {}),
    },
  })
}

function installManifest(
  base: string,
  install: ScaffoldInstallPlan,
): string {
  return json({
    schemaVersion: 1,
    registry: {
      url: base,
      ...(install.requestedVersion
        ? { requestedVersion: install.requestedVersion }
        : {}),
      ...(install.registryVersion
        ? { resolvedVersion: install.registryVersion }
        : {}),
    },
    items: Object.fromEntries(
      install.items
        .map((item): [string, {
          version?: string
          integrity?: string
          files: string[]
        }] => [
          item.name,
          {
            ...(item.version ? { version: item.version } : {}),
            ...(item.integrity ? { integrity: item.integrity } : {}),
            files: [...(item.files ?? [])].sort(),
          },
        ])
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  })
}

/** Map one registry payload path to its default scaffold destination. */
export function scaffoldRegistryPath(srcDir: string, path: string): string {
  const root = srcDir === "" || srcDir === "." ? "" : `${srcDir.replace(/\/$/, "")}/`
  if (path.startsWith("ui/")) return `${root}components/ui/${path.slice(3)}`
  if (path.startsWith("blocks/")) return `${root}components/${path.slice(7)}`
  if (path.startsWith("charts/")) return `${root}components/${path}`
  if (path.startsWith("hooks/")) return `${root}${path}`
  if (path.startsWith("lib/")) return `${root}${path}`
  if (path.endsWith(".css")) return `${root}styles/${path}`
  return `${root}${path}`
}

function nextFiles(name: string, starter: ScaffoldStarter): { path: string; content: string }[] {
  return [
    {
      path: "package.json",
      content: "", // Filled after registry dependencies are known.
    },
    {
      path: "tsconfig.json",
      content: json({
        compilerOptions: {
          target: "ES2022",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
        exclude: ["node_modules"],
      }),
    },
    {
      path: "next-env.d.ts",
      content:
        '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// Generated by logic2b ui.\n',
    },
    { path: "next.config.mjs", content: "export default {}\n" },
    {
      path: "postcss.config.mjs",
      content: 'export default { plugins: { "@tailwindcss/postcss": {} } }\n',
    },
    {
      path: "app/layout.tsx",
      content: `import "../styles/theme.css"

export const metadata = {
  title: "${SCAFFOLD_STARTER_DEFINITIONS[starter].title}",
  description: "Built with logic2b ui.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
`,
    },
    {
      path: "app/page.tsx",
      content:
        'import { StarterPage } from "@/components/starter-page"\n\nexport default function Page() {\n  return <StarterPage />\n}\n',
    },
    { path: "components/starter-page.tsx", content: starterComponent(starter) },
    { path: ".gitignore", content: "node_modules\n.next\nout\n.env*.local\n" },
    { path: "README.md", content: `# ${name}\n\nGenerated by logic2b ui.\n` },
  ]
}

function viteFiles(name: string, starter: ScaffoldStarter): { path: string; content: string }[] {
  const dashboardBuild =
    starter === "dashboard"
      ? `
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "charts",
              test: /node_modules[\\\\/](?:recharts|victory-vendor|d3-|react-smooth|decimal\\.js-light)/,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },`
      : ""
  return [
    { path: "package.json", content: "" },
    {
      path: "tsconfig.json",
      content: json({
        compilerOptions: {
          target: "ES2022",
          useDefineForClassFields: true,
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          allowJs: false,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          module: "ESNext",
          moduleResolution: "Bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          paths: { "@/*": ["./src/*"] },
        },
        include: ["src"],
      }),
    },
    {
      path: "vite.config.ts",
      content: `import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
${dashboardBuild}
})
`,
    },
    {
      path: "index.html",
      content:
        '<!doctype html>\n<html lang="en" class="dark">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>logic2b starter</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
    },
    {
      path: "src/main.tsx",
      content:
        'import { StrictMode } from "react"\nimport { createRoot } from "react-dom/client"\n\nimport { StarterPage } from "@/components/starter-page"\nimport "@/styles/theme.css"\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <StarterPage />\n  </StrictMode>\n)\n',
    },
    {
      path: "src/vite-env.d.ts",
      content: '/// <reference types="vite/client" />\n',
    },
    { path: "src/components/starter-page.tsx", content: starterComponent(starter) },
    { path: ".gitignore", content: "node_modules\ndist\n.env.local\n" },
    { path: "README.md", content: `# ${name}\n\nGenerated by logic2b ui.\n` },
  ]
}

function astroFiles(name: string, starter: ScaffoldStarter): { path: string; content: string }[] {
  return [
    { path: "package.json", content: "" },
    {
      path: "astro.config.mjs",
      content: `import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

export default defineConfig({
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
})
`,
    },
    {
      path: "tsconfig.json",
      content: json({
        extends: "astro/tsconfigs/strict",
        compilerOptions: {
          paths: { "@/*": ["./src/*"] },
        },
      }),
    },
    {
      path: "src/pages/index.astro",
      content: `---
import { StarterPage } from "@/components/starter-page"
import "@/styles/theme.css"
---

<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${SCAFFOLD_STARTER_DEFINITIONS[starter].title}</title>
  </head>
  <body>
    <StarterPage client:load />
  </body>
</html>
`,
    },
    { path: "src/components/starter-page.tsx", content: starterComponent(starter) },
    { path: ".gitignore", content: "node_modules\ndist\n.astro\n.env\n" },
    { path: "README.md", content: `# ${name}\n\nGenerated by logic2b ui.\n` },
  ]
}

function frameworkFiles(
  framework: ScaffoldFramework,
  name: string,
  starter: ScaffoldStarter
): { path: string; content: string }[] {
  if (framework === "next") return nextFiles(name, starter)
  if (framework === "astro") return astroFiles(name, starter)
  return viteFiles(name, starter)
}

/**
 * Build an entire runnable project as file writes. Unlike install_plan this
 * includes the framework shell, package manifest, routing entry, selected
 * starter blocks and the full logic2b theme.
 */
export async function buildScaffoldPlan({
  base,
  framework,
  starter,
  name,
  preset,
  version,
  resolveInstallPlan,
}: ScaffoldPlanOptions): Promise<ScaffoldPlan> {
  if (!SCAFFOLD_FRAMEWORKS.includes(framework)) {
    throw new Error(`Unknown framework "${framework}".`)
  }
  if (!SCAFFOLD_STARTERS.includes(starter)) {
    throw new Error(`Unknown starter "${starter}".`)
  }

  const normalizedName = projectName(name, starter)
  const presetConfig = preset ? decodePreset(preset) : null
  if (preset && !presetConfig) {
    throw new Error(`"${preset}" is not a valid logic2b preset id.`)
  }

  const definition = SCAFFOLD_STARTER_DEFINITIONS[starter]
  const srcDir = framework === "next" ? "" : "src"
  const install = await resolveInstallPlan([...definition.items, "theme"], {
    base,
    srcDir,
    version,
  })
  const iconLibrary = presetConfig?.iconLibrary ?? "lucide"
  let transformedIcons = false
  const transformFiles = (files: { path: string; content: string }[]) => files.map((file) => {
    const result = rewriteIconImports(file.content, iconLibrary)
    transformedIcons ||= result.transformed
    return { ...file, content: result.content }
  })
  const transformedFiles = transformFiles(install.files)
  const transformedSnapshots = transformFiles(install.snapshots)
  const transformedInstall: ScaffoldInstallPlan = {
    ...install,
    files: transformedFiles,
    snapshots: transformedSnapshots,
    npmDependencies:
      rewriteIconDependencies(
        install.npmDependencies,
        iconLibrary,
        transformedIcons || install.npmDependencies.includes("lucide-react"),
      ) ?? [],
  }
  const canonicalPreset = presetConfig ? encodePreset(presetConfig) : undefined
  const registryFiles = transformedInstall.files.map((file) => ({
    ...file,
    content:
      presetConfig && file.path.endsWith("theme.css")
        ? applyPresetToCss(file.content, presetConfig)
        : file.content,
  }))

  const files = frameworkFiles(framework, normalizedName, starter)
  const manifest = baseManifest(framework, normalizedName, transformedInstall.npmDependencies)
  files.find((file) => file.path === "package.json")!.content = json(manifest)
  files.push({
    path: "components.json",
    content: componentsConfig(
      base,
      framework,
      iconLibrary,
      canonicalPreset,
      install.registryVersion,
    ),
  })
  files.push({
    path: ".logic2b/manifest.json",
    content: installManifest(base, transformedInstall),
  })
  for (const snapshot of transformedInstall.snapshots) {
    files.push({
      path: `.logic2b/base/${snapshot.path}`,
      content: snapshot.content,
    })
  }

  const byPath = new Map<string, string>()
  for (const file of [...files, ...registryFiles]) {
    if (byPath.has(file.path)) {
      throw new Error(`Scaffold generated the path "${file.path}" more than once.`)
    }
    byPath.set(file.path, file.content)
  }

  const npmDependencies = [
    ...Object.keys(manifest.dependencies),
    ...Object.keys(manifest.devDependencies),
  ].sort()

  return {
    registry: base,
    ...(install.requestedVersion
      ? { requestedVersion: install.requestedVersion }
      : {}),
    ...(install.registryVersion
      ? { registryVersion: install.registryVersion }
      : {}),
    framework,
    iconLibrary,
    starter: {
      name: starter,
      title: definition.title,
      description: definition.description,
    },
    projectName: normalizedName,
    ...(canonicalPreset ? { preset: canonicalPreset } : {}),
    items: install.items,
    files: [...byPath].map(([path, content]) => ({ path, content })),
    npmDependencies,
    commands: {
      npm: "npm install && npm run dev",
      pnpm: "pnpm install && pnpm dev",
      yarn: "yarn && yarn dev",
      bun: "bun install && bun run dev",
    },
    notes: [
      'Write every entry in "files" relative to an empty project directory.',
      "The generated package.json pins the framework toolchain and includes every registry dependency.",
      "The starter is backend-agnostic: replace its static sample data and submit handlers with your application services.",
      "Dark mode is enabled on <html>; remove the dark class to start in the light theme.",
    ],
  }
}
