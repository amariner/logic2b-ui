#!/usr/bin/env node
import { Command } from "commander"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

const DEFAULT_REGISTRY = "https://ui.logic2b.com"

interface RegistryFile {
  path: string
  type: string
  content: string
}

interface RegistryItem {
  name: string
  type: string
  description: string
  dependencies?: string[]
  registryDependencies?: string[]
  files: RegistryFile[]
}

interface Config {
  registry: string
  srcDir: string
}

async function loadConfig(cwd: string): Promise<Config> {
  const configPath = join(cwd, "components.json")
  let registry = DEFAULT_REGISTRY
  if (existsSync(configPath)) {
    const raw = JSON.parse(await readFile(configPath, "utf8"))
    registry = raw.logic2b?.registry ?? registry
  }
  const srcDir = existsSync(join(cwd, "src")) ? "src" : "."
  return { registry, srcDir }
}

async function fetchItem(registry: string, name: string): Promise<RegistryItem> {
  const url = `${registry.replace(/\/$/, "")}/r/${name}.json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Component "${name}" not found at ${url} (HTTP ${res.status})`)
  }
  return (await res.json()) as RegistryItem
}

function targetPath(cwd: string, srcDir: string, file: RegistryFile): string {
  // Registry file paths look like "ui/button.tsx" or "lib/utils.ts".
  if (file.path.startsWith("ui/")) {
    return join(cwd, srcDir, "components", file.path)
  }
  return join(cwd, srcDir, file.path)
}

async function addComponents(
  names: string[],
  opts: { registry?: string; cwd?: string; overwrite?: boolean }
) {
  const cwd = resolve(opts.cwd ?? process.cwd())
  const config = await loadConfig(cwd)
  const registry = opts.registry ?? config.registry

  const resolved = new Map<string, RegistryItem>()
  const queue = [...names]
  while (queue.length > 0) {
    const name = queue.shift()!
    if (resolved.has(name)) continue
    const item = await fetchItem(registry, name)
    resolved.set(name, item)
    queue.push(...(item.registryDependencies ?? []))
  }

  const npmDeps = new Set<string>()
  let written = 0
  let skipped = 0

  for (const item of resolved.values()) {
    for (const dep of item.dependencies ?? []) npmDeps.add(dep)
    for (const file of item.files) {
      const target = targetPath(cwd, config.srcDir, file)
      if (existsSync(target) && !opts.overwrite) {
        console.log(`  skip  ${target} (exists — use --overwrite)`)
        skipped++
        continue
      }
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, file.content)
      console.log(`  write ${target}`)
      written++
    }
  }

  console.log(`\n✓ ${written} file(s) written, ${skipped} skipped.`)
  if (npmDeps.size > 0) {
    console.log(`\nInstall the required dependencies:\n`)
    console.log(`  npm install ${[...npmDeps].join(" ")}\n`)
  }
}

const program = new Command()

program
  .name("logic2b")
  .description("Add logic2b ui components to your project.")
  .version("0.1.0")

program
  .command("init")
  .description("Create components.json and install the cn() helper.")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())
    const configPath = join(cwd, "components.json")
    if (!existsSync(configPath)) {
      await writeFile(
        configPath,
        JSON.stringify(
          {
            $schema: "https://ui.logic2b.com/schema.json",
            style: "default",
            tailwind: { css: "src/styles/global.css", baseColor: "neutral", cssVariables: true },
            aliases: {
              components: "@/components",
              ui: "@/components/ui",
              utils: "@/lib/utils",
            },
            logic2b: { registry: opts.registry },
          },
          null,
          2
        )
      )
      console.log(`✓ created ${configPath}`)
    } else {
      console.log(`components.json already exists, leaving it untouched.`)
    }
    await addComponents(["utils"], { registry: opts.registry, cwd })
    console.log(
      "Next: add the theme tokens to your CSS — see /docs/theming on the registry site."
    )
  })

program
  .command("add")
  .description("Add one or more components (resolves registry dependencies).")
  .argument("<components...>", "component names, e.g. button card dialog")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL")
  .option("-o, --overwrite", "overwrite existing files", false)
  .action(async (components: string[], opts) => {
    await addComponents(components, opts)
  })

program
  .command("list")
  .description("List all components available in the registry.")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (opts) => {
    const url = `${opts.registry.replace(/\/$/, "")}/r/index.json`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Could not fetch ${url} (HTTP ${res.status})`)
    const items = (await res.json()) as { name: string; description: string }[]
    for (const item of items) {
      console.log(`${item.name.padEnd(16)} ${item.description}`)
    }
  })

program.parseAsync().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
