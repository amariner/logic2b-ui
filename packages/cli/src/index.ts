#!/usr/bin/env node
import { Command } from "commander"
import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

import {
  addComponents,
  DEFAULT_ALIASES,
  DEFAULT_REGISTRY,
  detectCssPath,
  fetchItem,
  fetchJson,
  indexUrl,
  loadConfig,
  targetPath,
} from "./lib.ts"

const program = new Command()

program
  .name("logic2b")
  .description("Add logic2b ui components to your project.")
  .version("0.2.0")

program
  .command("init")
  .description("Create components.json, install cn(), and write the logic2b theme.")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())
    const srcDir = existsSync(join(cwd, "src")) ? "src" : "."
    const cssPath = detectCssPath(cwd, srcDir)
    const configPath = join(cwd, "components.json")

    if (!existsSync(configPath)) {
      await writeFile(
        configPath,
        JSON.stringify(
          {
            $schema: "https://ui.logic2b.com/schema.json",
            style: "default",
            tailwind: { css: cssPath, baseColor: "neutral", cssVariables: true },
            aliases: DEFAULT_ALIASES,
            logic2b: { registry: opts.registry },
          },
          null,
          2
        )
      )
      console.log(`✓ created ${configPath} (css: ${cssPath})`)
    } else {
      console.log(`components.json already exists, leaving it untouched.`)
    }

    // Install cn() and the design system so components look like logic2b.
    await addComponents(["utils", "theme"], { registry: opts.registry, cwd })

    const themeTarget = join(dirname(cssPath), "theme.css")
    console.log(
      `\nDesign system installed → ${themeTarget}\n` +
        `  • Fresh project: make ${themeTarget} your app's stylesheet entry.\n` +
        `  • Existing globals.css: it already @imports tailwindcss, so either\n` +
        `    replace your entry with theme.css or copy its :root/.dark tokens over.\n` +
        `  • Dark mode is class-based — toggle ".dark" on <html>.`
    )
  })

program
  .command("add")
  .description("Add one or more components (resolves registry dependencies).")
  .argument("[components...]", "component names, e.g. button card dialog")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL")
  .option("-o, --overwrite", "overwrite existing files", false)
  .option("-a, --all", "add every component in the registry", false)
  .action(async (components: string[], opts) => {
    let names = components
    if (opts.all) {
      const cwd = resolve(opts.cwd ?? process.cwd())
      const config = await loadConfig(cwd, opts.registry)
      const index = (await fetchJson(indexUrl(config.registry))) as {
        name: string
        type: string
      }[]
      names = index.filter((i) => i.type === "registry:ui").map((i) => i.name)
      console.log(`Adding all ${names.length} components…\n`)
    }
    if (names.length === 0) {
      throw new Error("Nothing to add. Pass component names or use --all.")
    }
    await addComponents(names, opts)
  })

program
  .command("diff")
  .description("Show which installed components differ from the registry.")
  .argument("[components...]", "components to check (default: all installed)")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL")
  .action(async (components: string[], opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())
    const config = await loadConfig(cwd, opts.registry)

    let names = components
    if (names.length === 0) {
      const index = (await fetchJson(indexUrl(config.registry))) as {
        name: string
        type: string
      }[]
      names = index.filter((i) => i.type === "registry:ui").map((i) => i.name)
    }

    let changed = 0
    let checked = 0
    for (const name of names) {
      const item = await fetchItem(config.registry, name)
      for (const file of item.files ?? []) {
        const target = targetPath(config, cwd, file)
        if (!existsSync(target)) continue
        checked++
        const local = await readFile(target, "utf8")
        if (local !== file.content) {
          changed++
          console.log(`  ~ ${target}  (differs from registry)`)
        }
      }
    }
    if (checked === 0) {
      console.log("No installed components found to compare.")
    } else if (changed === 0) {
      console.log(`✓ ${checked} file(s) checked — all up to date.`)
    } else {
      console.log(
        `\n${changed} file(s) differ. Run "logic2b add <name> --overwrite" to update.`
      )
    }
  })

program
  .command("list")
  .description("List all components available in the registry.")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (opts) => {
    const items = (await fetchJson(indexUrl(opts.registry))) as {
      name: string
      description: string
    }[]
    for (const item of items) {
      console.log(`${item.name.padEnd(16)} ${item.description}`)
    }
  })

program.parseAsync().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
