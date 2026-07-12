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
import { applyPresetToCss, decodePreset } from "./themes.ts"

const SCAFFOLDERS: Record<string, string> = {
  next: "npx create-next-app@latest my-app --typescript --tailwind --eslint --app",
  vite: "npm create vite@latest my-app -- --template react-ts",
  "react-router": "npx create-react-router@latest my-app",
  tanstack: "npm create @tanstack/start@latest my-app",
  astro: "npm create astro@latest my-app",
  laravel: "composer create-project laravel/laravel my-app",
}

const program = new Command()

program
  .name("logic2b")
  .description("Add logic2b ui components to your project.")
  .version("0.3.0")

program
  .command("init")
  .description("Create components.json, install cn(), and write the logic2b theme.")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .option("-p, --preset <id>", "theme preset id from ui.logic2b.com/create")
  .option("-t, --template <name>", "target framework (next, vite, astro, …)")
  .option("--monorepo", "reserved for template scaffolding", false)
  .action(async (opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())

    // Validate the preset up front — fail before touching any file.
    const preset = opts.preset ? decodePreset(opts.preset) : null
    if (opts.preset && !preset) {
      throw new Error(
        `Invalid preset id "${opts.preset}". Grab one from https://ui.logic2b.com/create (Get Code).`
      )
    }

    // `--template` on an empty directory: full scaffolding is on the roadmap;
    // until then, point to the framework's own scaffolder instead of failing
    // halfway through.
    if (opts.template && !existsSync(join(cwd, "package.json"))) {
      const scaffold = SCAFFOLDERS[opts.template]
      throw new Error(
        `No package.json found — create the ${opts.template} app first, then re-run init inside it:\n\n` +
          (scaffold ? `  ${scaffold}\n  cd my-app\n` : "") +
          `  npx logic2b@latest init${opts.preset ? ` --preset ${opts.preset}` : ""}\n\n` +
          `Tip: on ui.logic2b.com/create, "Copy Prompt" gives an AI assistant the full recipe (scaffold + theme) in one paste.`
      )
    }

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
            tailwind: {
              css: cssPath,
              baseColor: preset?.base ?? "neutral",
              cssVariables: true,
            },
            aliases: DEFAULT_ALIASES,
            logic2b: {
              registry: opts.registry,
              ...(opts.preset ? { preset: opts.preset } : {}),
            },
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

    const themeTarget = join(cwd, dirname(cssPath), "theme.css")
    if (preset) {
      if (existsSync(themeTarget)) {
        const css = await readFile(themeTarget, "utf8")
        await writeFile(themeTarget, applyPresetToCss(css, preset))
        console.log(
          `✓ applied preset — base: ${preset.base}, accent: ${preset.theme}, ` +
            `chart: ${preset.chart}, radius: ${preset.radius}, ` +
            `font: ${preset.font}/${preset.heading}`
        )
      } else {
        console.log(
          `! theme.css not found at ${themeTarget} — preset not applied.`
        )
      }
    }

    console.log(
      `\nDesign system installed → ${join(dirname(cssPath), "theme.css")}\n` +
        `  • Fresh project: make theme.css your app's stylesheet entry.\n` +
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
