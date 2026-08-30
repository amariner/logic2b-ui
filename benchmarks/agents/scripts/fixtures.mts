import { createHash } from "node:crypto"
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { dirname, relative, resolve, sep } from "node:path"

import {
  applyPresetToCss,
  decodePreset,
} from "../../../packages/tokens/src/index.ts"

export const FIXTURE_IDS = ["vite-base", "vite-settings", "empty"] as const
export type FixtureId = (typeof FIXTURE_IDS)[number]

const EXACT = {
  react: "19.2.7",
  "react-dom": "19.2.7",
  "@types/node": "24.3.0",
  "@types/react": "19.2.17",
  "@types/react-dom": "19.2.3",
  "@tailwindcss/vite": "4.3.2",
  "@vitejs/plugin-react": "6.1.1",
  tailwindcss: "4.3.2",
  typescript: "6.0.3",
  vite: "8.2.2",
  "@fontsource-variable/inter": "5.2.8",
  "@fontsource-variable/space-grotesk": "5.2.10",
  "class-variance-authority": "0.7.1",
  clsx: "2.1.1",
  "lucide-react": "1.23.0",
  "radix-ui": "1.6.1",
  "tailwind-merge": "3.6.0",
  "tw-animate-css": "1.4.0",
} as const

type RegistryItem = {
  name: string
  dependencies?: string[]
  registryDependencies?: string[]
  files?: { path: string; content: string }[]
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function safeTarget(root: string, path: string): string {
  const target = resolve(root, path)
  const rel = relative(root, target)
  if (!path || rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new Error(`Unsafe fixture path: ${path}`)
  }
  return target
}

async function writeFiles(
  root: string,
  files: { path: string; content: string }[],
): Promise<void> {
  for (const file of files) {
    const target = safeTarget(root, file.path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, file.content)
  }
}

function viteFiles(name: string, stylesheet: string) {
  return [
    {
      path: "package.json",
      content: json({
        name,
        private: true,
        version: "0.0.0",
        type: "module",
        packageManager: "pnpm@11.10.0",
        scripts: { build: "tsc --noEmit && vite build", dev: "vite" },
        dependencies: {
          react: EXACT.react,
          "react-dom": EXACT["react-dom"],
        },
        devDependencies: {
          "@tailwindcss/vite": EXACT["@tailwindcss/vite"],
          "@types/node": EXACT["@types/node"],
          "@types/react": EXACT["@types/react"],
          "@types/react-dom": EXACT["@types/react-dom"],
          "@vitejs/plugin-react": EXACT["@vitejs/plugin-react"],
          tailwindcss: EXACT.tailwindcss,
          typescript: EXACT.typescript,
          vite: EXACT.vite,
        },
      }),
    },
    {
      path: "tsconfig.json",
      content: json({
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          strict: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          module: "ESNext",
          moduleResolution: "Bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          paths: { "@/*": ["./src/*"] },
        },
        include: ["src", "vite.config.ts"],
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
})
`,
    },
    {
      path: "index.html",
      content:
        '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>logic2b agent benchmark</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
    },
    {
      path: "src/main.tsx",
      content: `import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "@/App"
import "${stylesheet}"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
    },
    {
      path: "src/App.tsx",
      content:
        'export default function App() {\n  return <main>Complete the benchmark task.</main>\n}\n',
    },
    {
      path: "src/styles/globals.css",
      content: '@import "tailwindcss";\n',
    },
    { path: "src/vite-env.d.ts", content: '/// <reference types="vite/client" />\n' },
    { path: ".gitignore", content: "node_modules\ndist\n.env*\n" },
  ]
}

function registryPath(path: string): string {
  if (path.startsWith("ui/")) return `src/components/ui/${path.slice(3)}`
  if (path.startsWith("blocks/")) return `src/components/${path.slice(7)}`
  if (path.startsWith("charts/")) return `src/components/${path}`
  if (path.startsWith("hooks/") || path.startsWith("lib/")) return `src/${path}`
  if (path.endsWith(".css")) return `src/styles/${path}`
  return `src/${path}`
}

async function readRegistryItem(sourceRoot: string, name: string): Promise<RegistryItem> {
  const path = resolve(sourceRoot, "apps/web/public/r", `${name}.json`)
  const item = JSON.parse(await readFile(path, "utf8")) as RegistryItem
  if (item.name !== name || !Array.isArray(item.files)) {
    throw new Error(`Registry fixture item is malformed: ${name}`)
  }
  return item
}

async function resolveItems(sourceRoot: string, names: string[]) {
  const resolved = new Map<string, RegistryItem>()
  const queue = [...names]
  while (queue.length > 0) {
    const name = queue.shift()!
    if (resolved.has(name)) continue
    const item = await readRegistryItem(sourceRoot, name)
    resolved.set(name, item)
    queue.push(...(item.registryDependencies ?? []))
  }
  return resolved
}

function exactDependency(name: string): string {
  const version = EXACT[name as keyof typeof EXACT]
  if (!version) {
    throw new Error(`No exact fixture version declared for registry dependency: ${name}`)
  }
  return version
}

async function settingsFiles(sourceRoot: string, preset: string) {
  const presetConfig = decodePreset(preset)
  if (!presetConfig) throw new Error(`Benchmark preset is invalid: ${preset}`)
  const items = await resolveItems(sourceRoot, [
    "button",
    "card",
    "tabs",
    "label",
    "input",
    "switch",
    "theme",
  ])
  const dependencies: Record<string, string> = {
    react: EXACT.react,
    "react-dom": EXACT["react-dom"],
  }
  const files = viteFiles("logic2b-benchmark-settings", "@/styles/theme.css")

  for (const item of items.values()) {
    for (const dependency of item.dependencies ?? []) {
      dependencies[dependency] = exactDependency(dependency)
    }
    for (const file of item.files ?? []) {
      files.push({
        path: registryPath(file.path),
        content:
          file.path === "theme.css"
            ? applyPresetToCss(file.content, presetConfig)
            : file.content,
      })
    }
  }

  const manifest = JSON.parse(files[0].content)
  manifest.dependencies = Object.fromEntries(
    Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)),
  )
  files[0].content = json(manifest)
  files.push({
    path: "components.json",
    content: json({
      $schema: "https://ui.logic2b.com/schema.json",
      style: "default",
      tailwind: {
        css: "src/styles/theme.css",
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
      logic2b: { registry: "https://ui.logic2b.com", preset },
    }),
  })
  return files
}

export async function prepareFixture(options: {
  id: FixtureId
  workspace: string
  sourceRoot: string
  preset: string
}): Promise<{ sha256: string; files: number }> {
  await mkdir(options.workspace, { recursive: true })
  if (options.id === "vite-base") {
    await writeFiles(
      options.workspace,
      viteFiles("logic2b-benchmark-install", "@/styles/globals.css"),
    )
  } else if (options.id === "vite-settings") {
    await writeFiles(
      options.workspace,
      await settingsFiles(options.sourceRoot, options.preset),
    )
  } else if (options.id !== "empty") {
    throw new Error(`Unknown benchmark fixture: ${options.id}`)
  }
  return hashDirectory(options.workspace)
}

export async function hashDirectory(
  root: string,
): Promise<{ sha256: string; files: number }> {
  const paths: string[] = []
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      const info = await lstat(path)
      if (info.isSymbolicLink()) throw new Error(`Fixture cannot contain symlinks: ${path}`)
      if (info.isDirectory()) await walk(path)
      else if (info.isFile()) paths.push(path)
    }
  }
  await walk(root)
  paths.sort((a, b) => a.localeCompare(b))
  const hash = createHash("sha256")
  for (const path of paths) {
    hash.update(relative(root, path).split(sep).join("/"))
    hash.update("\0")
    hash.update(await readFile(path))
    hash.update("\0")
  }
  return { sha256: `sha256-${hash.digest("base64")}`, files: paths.length }
}
