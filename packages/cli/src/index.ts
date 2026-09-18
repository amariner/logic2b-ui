#!/usr/bin/env node
import { reviewLocalFiles } from "./review.ts"
import { verifyLocal, readVerificationArtifact } from "./verify.ts"
import { planLocalChange, applyLocalChange, recoverLocalChange, listChangeTransactions, readChangeArtifact, writeChangeArtifact, type ChangeResult } from "./change.ts"
import { REVIEW_SCOPES, type ReviewScope } from "@logic2b/review"
import { generateLocalRules, refreshLocalRules } from "./rules.ts"
import { RULE_FORMATS, type RuleFormat } from "@logic2b/scaffold/rules"
import { inspectLocalProject } from "./inspect.ts"
import type { HostCapabilities } from "@logic2b/scaffold/project-context"
import { Command } from "commander"
import { existsSync } from "node:fs"
import { lstat, readFile, writeFile } from "node:fs/promises"
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

program.command("verify")
  .description("Check a running local application with a bounded declarative browser suite; save local evidence.")
  .argument("<suite.json>", "declarative verification suite, never JavaScript")
  .option("-c, --cwd <path>", "application directory with explicitly installed browser tools")
  .requiredOption("--url <origin>", "HTTP(S) loopback origin of the already running application")
  .requiredOption("--output <directory>", "new evidence directory; parent must exist")
  .option("--timeout <ms>", "per-step timeout (50–30000 ms)", "5000")
  .option("--budget <ms>", "total scenario budget (1000–300000 ms)", "120000")
  .option("--browser-executable <path>", "existing Chromium executable; defaults to the Playwright browser")
  .option("--app-unavailable <reason>", "record skipped checks when an explicit build/start prerequisite failed; no browser runs")
  .option("--json", "print the report and its evidence summary")
  .action(async (suitePath: string, opts) => {
    process.exitCode = 2
    const value = await verifyLocal({ cwd: resolve(opts.cwd ?? process.cwd()), suite: await readVerificationArtifact(suitePath), url: opts.url, output: opts.output, timeoutMs: Number(opts.timeout), budgetMs: Number(opts.budget), browserExecutable: opts.browserExecutable ?? process.env.PLAYWRIGHT_CHROMIUM_PATH, appUnavailable: opts.appUnavailable })
    console.log(opts.json ? JSON.stringify(value, null, 2) : [`${value.summary.status}: ${value.summary.expectedChecks} declared browser checks`, `${value.summary.counts.pass} pass, ${value.summary.counts.fail} fail, ${value.summary.counts.skipped} skipped, ${value.summary.counts.unknown} unknown`, `Evidence: ${resolve(opts.output)}`, ...value.summary.limitations].join("\n"))
    process.exitCode = value.summary.status === "pass" ? 0 : value.summary.status === "fail" ? 1 : 2
  })

const change = program.command("change").description("Plan, apply and recover bounded changes while preserving local edits.")
change.command("plan")
  .argument("<request>", "JSON containing candidates and optional exact registryVersion")
  .option("-c, --cwd <path>", "workspace directory")
  .option("--app-root <path>", "selected application relative to the workspace")
  .option("--output <path>", "write full plan to a new file; refuses an existing file")
  .option("--json", "print the complete versioned plan")
  .action(async (requestPath: string, opts) => {
    process.exitCode = 2
    const raw = await readChangeArtifact(requestPath)
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some(key => !["schemaVersion", "registryVersion", "candidates"].includes(key))) throw new Error("Local change request accepts only schemaVersion, registryVersion and candidates. Context is collected locally.")
    const input = raw as { schemaVersion?: unknown; registryVersion?: string; candidates: { path: string; content: string; reason: string }[] }
    if (input.schemaVersion !== undefined && input.schemaVersion !== 1) throw new Error("Unsupported local change schemaVersion; expected 1.")
    const plan = await planLocalChange({ cwd: resolve(opts.cwd ?? process.cwd()), appRoot: opts.appRoot, candidates: input.candidates, registryVersion: input.registryVersion })
    if (opts.output) await writeChangeArtifact(opts.output, plan)
    if (opts.json) console.log(JSON.stringify(plan, null, 2))
    else console.log([`Plan ${plan.id} · registry ${plan.registryVersion} · app ${plan.appRoot}`, ...plan.operations.map(op => `${op.kind} ${op.path}\n  ${op.beforeSha256 ?? "missing"} → ${op.afterSha256}\n  ${op.reason}`), ...plan.conflicts.map(item => `Conflict ${item.path}: ${item.reason}`), ...plan.unsupported.map(reason => `Unsupported: ${reason}`), `${plan.dependencies.length} dependency changes; installation not run.`, opts.output ? `Full plan saved to ${opts.output}.` : "Use --json or --output <new-file> to inspect the full content before applying."].join("\n"))
    process.exitCode = plan.conflicts.length || plan.unsupported.length ? 1 : 0
  })
function printChange(value: ChangeResult, json: boolean) {
  console.log(json ? JSON.stringify(value, null, 2) : [`${value.status}: plan ${value.id}`, ...(value.transactionId ? [`Transaction: ${value.transactionId}`] : []), ...value.conflicts.map(item => `${item.path}: ${item.reason}`), ...value.notes].join("\n"))
  process.exitCode = ["conflict", "interrupted"].includes(value.status) ? 1 : 0
}
change.command("apply")
  .argument("<plan>", "reviewed plan JSON file")
  .option("-c, --cwd <path>", "workspace directory containing plan.appRoot")
  .option("--dry-run", "validate all preconditions without writing files")
  .option("--json", "print a versioned application result")
  .action(async (planPath: string, opts) => {
    process.exitCode = 2
    printChange(await applyLocalChange({ cwd: resolve(opts.cwd ?? process.cwd()), plan: await readChangeArtifact(planPath), dryRun: opts.dryRun }), opts.json)
  })
change.command("recover")
  .argument("<transaction-id>", "transaction UUID returned by apply/status")
  .option("-c, --cwd <path>", "workspace directory")
  .option("--app-root <path>", "selected application relative to the workspace")
  .option("--dry-run", "inspect recovery preconditions without writing files")
  .option("--json", "print a versioned recovery result")
  .action(async (id: string, opts) => {
    process.exitCode = 2
    printChange(await recoverLocalChange({ cwd: resolve(opts.cwd ?? process.cwd()), appRoot: opts.appRoot, id, dryRun: opts.dryRun }), opts.json)
  })
change.command("status")
  .option("-c, --cwd <path>", "workspace directory")
  .option("--app-root <path>", "selected application relative to the workspace")
  .option("--json", "print the local transaction inventory")
  .action(async opts => {
    process.exitCode = 2
    const value = await listChangeTransactions(resolve(opts.cwd ?? process.cwd()), opts.appRoot)
    console.log(opts.json ? JSON.stringify(value, null, 2) : [...value.transactions.map(item => `${item.id} ${item.state}${item.active ? " (active)" : ""}: ${item.fileCount} files, plan ${item.planId}`), ...value.issues.map(issue => `Inspect ${issue.path}${issue.active ? " (active)" : ""}: ${issue.reason}`)].join("\n") || "No change transactions.")
    process.exitCode = value.issues.length ? 1 : 0
  })

program
  .command("review")
  .description("Review explicit TSX/JSX sources, reporting demonstrated findings and unresolved context.")
  .argument("<paths...>", "source files or directories within the application")
  .option("-c, --cwd <path>", "application directory")
  .option("--json", "emit the versioned review result")
  .option("--semantic-colors", "enforce the project's explicitly selected semantic color policy")
  .option("--complete-label-context", "assert that selected JSX contains the complete label/ancestor context (never use for unresolved compositions)")
  .option("--scope <list>", "comma-separated tokens,a11y", "tokens,a11y")
  .option("--fail-on <severity>", "error or warning", "error")
  .action(async (paths: string[], opts) => {
    process.exitCode = 2
    const scope = String(opts.scope).split(",")
    if (!scope.length || new Set(scope).size !== scope.length || scope.some(name => !REVIEW_SCOPES.includes(name as ReviewScope))) throw new Error("--scope must contain distinct tokens,a11y values.")
    if (!["error", "warning"].includes(opts.failOn)) throw new Error("--fail-on must be error or warning.")
    const result = await reviewLocalFiles({ cwd: resolve(opts.cwd ?? process.cwd()), paths, semanticColors: opts.semanticColors, completeLabelContext: opts.completeLabelContext, scope: scope as ReviewScope[] })
    if (opts.json) console.log(JSON.stringify(result, null, 2))
    else console.log([
      ...result.findings.map(f => `${f.file}:${f.line}:${f.column} ${f.severity} ${f.rule}: ${f.message}`),
      ...result.unknowns.map(f => `${f.file}:${f.line}:${f.column} unknown ${f.rule}: ${f.reason}`),
      `${result.summary.errors} errors, ${result.summary.warnings} warnings; ${result.unknowns.length} unresolved contexts; ${result.suppressed.length} reasoned suppressions.`,
      `Evaluated rules: ${result.evaluatedRules.join(", ") || "none"}.`,
      ...result.disabledRules.map(rule => `Disabled ${rule.rule}: ${rule.reason}`),
      ...result.assumptions,
      ...(result.truncated ? ["Review was truncated; select a smaller source set."] : []),
    ].join("\n"))
    process.exitCode = result.truncated || result.unknowns.some(f => f.rule === "parse") ? 2 : result.summary.errors > 0 || opts.failOn === "warning" && result.summary.warnings > 0 ? 1 : 0
  })

program
  .command("rules")
  .description("Generate managed agent instructions without overwriting project rules.")
  .option("-c, --cwd <path>", "application directory")
  .option("-p, --preset <id>", "preset reference for the generated documentation (does not change CSS)")
  .option("--format <formats>", "comma-separated agents,claude,cursor,copilot", "agents")
  .action(async opts => {
    const formats = String(opts.format).split(",")
    if (formats.some(format => !RULE_FORMATS.includes(format as RuleFormat)) || new Set(formats).size !== formats.length) throw new Error("--format must contain distinct values from agents,claude,cursor,copilot.")
    const result = await generateLocalRules({ cwd: resolve(opts.cwd ?? process.cwd()), formats: formats as RuleFormat[], preset: opts.preset })
    for (const file of result) console.log(`✓ ${file.action} ${file.path}`)
  })

program
  .command("inspect")
  .description("Inspect existing project configuration and installed file hashes without writes or network access.")
  .option("-c, --cwd <path>", "workspace directory")
  .option("--app-root <path>", "application directory relative to the workspace")
  .option("--file <path...>", "explicit source files to hash, relative to the selected app")
  .option("--capabilities <list>", "host-supplied scope: none or comma-separated file-writes,dependency-install,browser")
  .option("--details <mode>", "summary or full (inventory and evidence)", "summary")
  .option("--json", "emit the versioned inspection result as JSON", false)
  .action(async opts => {
    if (!["summary", "full"].includes(opts.details)) throw new Error("--details must be summary or full.")
    let capabilities: HostCapabilities | undefined
    if (opts.capabilities !== undefined) {
      const names = opts.capabilities === "none" ? [] : String(opts.capabilities).split(",")
      if (names.some(name => !["file-writes", "dependency-install", "browser"].includes(name)) || new Set(names).size !== names.length) throw new Error("Invalid --capabilities; use none or file-writes,dependency-install,browser.")
      capabilities = { fileWrites: names.includes("file-writes"), dependencyInstall: names.includes("dependency-install"), browser: names.includes("browser") }
    }
    const result = await inspectLocalProject({ cwd: resolve(opts.cwd ?? process.cwd()), appRoot: opts.appRoot, files: opts.file, capabilities }, opts.details)
    if (opts.json) console.log(JSON.stringify(result, null, 2))
    else console.log([`Framework: ${result.summary.framework.name}`, `Source root: ${result.summary.sourceRoot ?? "unknown"}`, `Installed items: ${result.summary.installedItems}; modified files: ${result.summary.modifiedFiles}; unresolved files: ${result.summary.unresolvedFiles}`, ...result.unknowns.map(note => `Unknown: ${note}`), ...result.guidance, ...(result.context ? [JSON.stringify(result.context, null, 2)] : ["Use --json --details full for confirmed aliases, inventory hashes and evidence."])].join("\n"))
  })

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
  .option("--no-agent-rules", "skip generating or refreshing agent instructions")
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
        agentRules: opts.agentRules,
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

    if (preset && existsSync(join(cwd, "components.json"))) {
      const configStat = await lstat(join(cwd, "components.json"))
      if (!configStat.isFile() || configStat.nlink !== 1 || configStat.size > 128 * 1024) throw new Error("Applying a preset requires a bounded regular components.json file, not a symbolic or hard link.")
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
      agentRules: false,
    })

    const themeTarget = join(cwd, dirname(cssPath), "theme.css")
    if (preset) {
      if (existsSync(themeTarget)) {
        const css = await readFile(themeTarget, "utf8")
        await writeFile(themeTarget, applyPresetToCss(css, preset))
        // Track the preset actually applied so future rules do not describe stale tokens.
        const recordedConfig = JSON.parse(await readFile(configPath, "utf8"))
        recordedConfig.logic2b = { ...recordedConfig.logic2b, preset: opts.preset }
        await writeFile(configPath, JSON.stringify(recordedConfig, null, 2) + "\n")
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

    if (opts.agentRules !== false && opts.registry.replace(/\/$/, "") === DEFAULT_REGISTRY) await refreshLocalRules(cwd)

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
  .option("--no-agent-rules", "skip generating or refreshing agent instructions")
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
  .option("--no-agent-rules", "skip generating or refreshing agent instructions")
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
  process.exit(process.exitCode ?? 1)
})
