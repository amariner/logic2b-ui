#!/usr/bin/env node
import { Command } from "commander"
import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import {
  SCAFFOLD_FRAMEWORKS,
  SCAFFOLD_STARTERS,
  type ScaffoldFramework,
  type ScaffoldStarter,
} from "@logic2b/scaffold"

import {
  addComponents,
  createRegistryClient,
  updateComponents,
  DEFAULT_ALIASES,
  DEFAULT_REGISTRY,
  detectCssPath,
  installedItemNames,
  loadConfig,
  readInstallManifest,
  targetPath,
  type PackageManager,
} from "./lib.ts"
import {
  packageManagerInstallCommand,
  packageManagerDevCommand,
  scaffoldProject,
} from "./scaffold.ts"
import { applyPresetToCss, decodePreset } from "@logic2b/tokens"
import { PACKAGE_VERSION } from "./version.ts"
import { REGISTRY_VERSION } from "@logic2b/registry/version"

const program = new Command()

program
  .name("logic2b")
  .description("Add logic2b ui components to your project.")
  .version(PACKAGE_VERSION)

program
  .command("init")
  .description("Create components.json, install cn(), and write the logic2b theme.")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .option("--registry-version <range>", "registry semver, range or channel", REGISTRY_VERSION)
  .option("-p, --preset <id>", "theme preset id from ui.logic2b.com/create")
  .option("-t, --template <name>", "create a complete next, vite or astro project")
  .option("--starter <name>", "starter composition (marketing, dashboard or auth)")
  .option("--name <name>", "generated package name (defaults to the target directory)")
  .option("--package-manager <name>", "npm, pnpm, yarn or bun")
  .option("--no-install", "skip installing npm dependencies")
  .option("--monorepo", "create a Turbo workspace with the app in apps/web", false)
  .action(async (opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())

    // Validate the preset up front — fail before touching any file.
    const preset = opts.preset ? decodePreset(opts.preset) : null
    if (opts.preset && !preset) {
      throw new Error(
        `Invalid preset id "${opts.preset}". Grab one from https://ui.logic2b.com/create (Get Code).`
      )
    }

    if (opts.template) {
      if (!SCAFFOLD_FRAMEWORKS.includes(opts.template)) {
        throw new Error(
          `Unknown template "${opts.template}". Choose: ${SCAFFOLD_FRAMEWORKS.join(", ")}.`,
        )
      }
      const starter = opts.starter ?? "marketing"
      if (!SCAFFOLD_STARTERS.includes(starter)) {
        throw new Error(
          `Unknown starter "${starter}". Choose: ${SCAFFOLD_STARTERS.join(", ")}.`,
        )
      }
      const packageManagers = ["npm", "pnpm", "yarn", "bun"] as const
      if (
        opts.packageManager &&
        !packageManagers.includes(opts.packageManager)
      ) {
        throw new Error(
          `Unknown package manager "${opts.packageManager}". Choose: ${packageManagers.join(", ")}.`,
        )
      }

      const result = await scaffoldProject({
        cwd,
        registry: opts.registry,
        registryVersion: opts.registryVersion,
        framework: opts.template as ScaffoldFramework,
        starter: starter as ScaffoldStarter,
        name: opts.name,
        preset: opts.preset,
        monorepo: opts.monorepo,
        install: opts.install,
        packageManager: opts.packageManager as PackageManager | undefined,
      })
      const appDir = opts.monorepo ? join(cwd, "apps/web") : cwd
      const installCommand = packageManagerInstallCommand(
        result.packageManager,
      ).join(" ")
      const nextCommands = [
        ...(!result.installed ? [installCommand] : []),
        packageManagerDevCommand(result.packageManager),
      ]
        .map((command) => `  ${command}`)
        .join("\n")
      console.log(
        `\n✓ created ${result.plan.framework}/${result.plan.starter.name} at ${appDir}` +
          `\n✓ ${result.filesWritten} files; registry ${result.plan.registryVersion ?? "latest"}` +
          `\n\nNext: cd "${cwd}"\n${nextCommands}`,
      )
      return
    }

    if (opts.monorepo || opts.starter || opts.name || opts.packageManager) {
      throw new Error(
        "--monorepo, --starter, --name and --package-manager require --template.",
      )
    }

    // Resolve the immutable registry snapshot before touching the project.
    const registryClient = await createRegistryClient(
      opts.registry,
      opts.registryVersion,
    )

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
            iconLibrary: preset?.iconLibrary ?? "lucide",
            logic2b: {
              registry: opts.registry,
              version: registryClient.resolvedVersion ?? opts.registryVersion,
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
    await addComponents(["utils", "theme"], {
      registry: opts.registry,
      registryVersion: opts.registryVersion,
      cwd,
      install: opts.install,
      client: registryClient,
    })

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
  .option("--registry-version <range>", "registry semver, range or channel")
  .option("-o, --overwrite", "overwrite existing files", false)
  .option("-a, --all", "add every component in the registry", false)
  .option("--no-install", "skip installing npm dependencies")
  .action(async (components: string[], opts) => {
    let names = components
    if (opts.all) {
      const cwd = resolve(opts.cwd ?? process.cwd())
      const config = await loadConfig(cwd, opts.registry, opts.registryVersion)
      const client = await createRegistryClient(
        config.registry,
        config.registryVersion,
      )
      names = client.index
        .filter((item) => item.type === "registry:ui")
        .map((item) => item.name)
      console.log(`Adding all ${names.length} components…\n`)
    }
    if (names.length === 0) {
      throw new Error("Nothing to add. Pass component names or use --all.")
    }
    await addComponents(names, opts)
  })

program
  .command("update")
  .description("Pull registry changes into installed components (3-way merge, keeps local edits).")
  .argument("[components...]", "components to update (default: all installed)")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL")
  .option("--registry-version <range>", "registry semver, range or channel")
  .option("--no-install", "skip installing npm dependencies")
  .action(async (components: string[], opts) => {
    let names = components
    if (names.length === 0) {
      const cwd = resolve(opts.cwd ?? process.cwd())
      names = await installedItemNames(cwd)
      if (names.length === 0) {
        const config = await loadConfig(cwd, opts.registry, opts.registryVersion)
        const client = await createRegistryClient(
          config.registry,
          config.registryVersion,
        )
        names = client.index
          .filter((item) => item.type === "registry:ui")
          .map((item) => item.name)
        console.log(
          "No .logic2b/manifest.json found; checking legacy installed UI items."
        )
      }
    }
    await updateComponents(names, opts)
  })

program
  .command("diff")
  .description("Show which installed components differ from the registry.")
  .argument("[components...]", "components to check (default: all installed)")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL")
  .option("--registry-version <range>", "registry semver, range or channel")
  .action(async (components: string[], opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())
    const config = await loadConfig(cwd, opts.registry, opts.registryVersion)
    const client = await createRegistryClient(
      config.registry,
      config.registryVersion,
    )

    let names = components
    if (names.length === 0) {
      names = await installedItemNames(cwd)
      if (names.length === 0) {
        names = client.index
          .filter((item) => item.type === "registry:ui")
          .map((item) => item.name)
      }
    }

    let changed = 0
    let checked = 0
    for (const name of names) {
      const item = await client.getItem(name)
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
        `\n${changed} file(s) differ. Run "logic2b update <name>" for a safe three-way merge.`
      )
    }
  })

program
  .command("list")
  .description("List all components available in the registry.")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .option("--registry-version <range>", "registry semver, range or channel")
  .action(async (opts) => {
    const client = await createRegistryClient(
      opts.registry,
      opts.registryVersion,
    )
    for (const item of client.index) {
      console.log(`${item.name.padEnd(16)} ${item.description}`)
    }
    if (client.resolvedVersion) {
      console.log(`\nRegistry ${client.resolvedVersion} (${client.requestedVersion}).`)
    }
  })

program
  .command("status")
  .description("Show the installed registry lock and the version selected now.")
  .option("-c, --cwd <path>", "working directory")
  .option("-r, --registry <url>", "registry base URL")
  .option("--registry-version <range>", "registry semver, range or channel")
  .action(async (opts) => {
    const cwd = resolve(opts.cwd ?? process.cwd())
    const installed = await readInstallManifest(cwd)
    if (!installed) {
      console.log("No .logic2b/manifest.json found. Run logic2b init or add first.")
      return
    }
    const hasConfig = existsSync(join(cwd, "components.json"))
    const config = await loadConfig(cwd, opts.registry, opts.registryVersion)
    const registry =
      opts.registry ?? (hasConfig ? config.registry : installed.registry.url)
    const requested =
      opts.registryVersion ??
      config.registryVersion ??
      installed.registry.requestedVersion
    const client = await createRegistryClient(
      registry,
      requested,
    )
    console.log(`Registry: ${client.registry}`)
    console.log(`Requested: ${requested ?? "latest (unversioned)"}`)
    console.log(`Installed: ${installed.registry.resolvedVersion ?? "unversioned"}`)
    console.log(`Selected now: ${client.resolvedVersion ?? "latest (unversioned)"}`)
    console.log(`Tracked items: ${Object.keys(installed.items).length}`)
    if (
      client.resolvedVersion &&
      installed.registry.resolvedVersion &&
      client.resolvedVersion !== installed.registry.resolvedVersion
    ) {
      console.log('Update available. Run "logic2b update" after reviewing changelogs.')
    } else {
      console.log("✓ registry selection matches the installed lock.")
    }
  })

program.parseAsync().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
