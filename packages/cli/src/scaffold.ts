import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { lstat, mkdir, readdir, realpath, writeFile } from "node:fs/promises"
import { dirname, resolve, sep } from "node:path"

import {
  buildScaffoldPlan as composeScaffoldPlan,
  scaffoldRegistryPath,
  type ScaffoldFramework,
  type ScaffoldInstallPlan,
  type ScaffoldPlan,
  type ScaffoldStarter,
} from "@logic2b/scaffold"

import {
  createRegistryClient,
  detectPackageManager,
  resolveGraph,
  type FetchLike,
  type PackageManager,
} from "./lib.ts"

export interface CliScaffoldOptions {
  cwd: string
  registry: string
  registryVersion?: string
  framework: ScaffoldFramework
  starter: ScaffoldStarter
  name?: string
  preset?: string
  monorepo?: boolean
  install?: boolean
  packageManager?: PackageManager
  fetchImpl?: FetchLike
  agentRules?: boolean
}

export interface CliScaffoldResult {
  plan: ScaffoldPlan
  packageManager: PackageManager
  installed: boolean
  filesWritten: number
}

async function resolveCliInstallPlan(
  names: string[],
  options: {
    base: string
    srcDir: string
    version?: string
    fetchImpl?: FetchLike
  },
): Promise<ScaffoldInstallPlan> {
  const requested = new Set(names)
  const client = await createRegistryClient(
    options.base,
    options.version,
    options.fetchImpl,
  )
  const resolved = await resolveGraph(names, (name) => client.getItem(name))
  const paths = new Set<string>()
  const snapshotPaths = new Set<string>()
  const files: { path: string; content: string }[] = []
  const snapshots: { path: string; content: string }[] = []
  const npmDependencies = new Set<string>()

  for (const item of resolved.values()) {
    for (const dependency of item.dependencies ?? []) {
      npmDependencies.add(dependency)
    }
    for (const file of item.files ?? []) {
      if (!snapshotPaths.has(file.path)) {
        snapshotPaths.add(file.path)
        snapshots.push({ path: file.path, content: file.content })
      }
      const path = scaffoldRegistryPath(options.srcDir, file.path)
      if (paths.has(path)) continue
      paths.add(path)
      files.push({ path, content: file.content })
    }
  }

  return {
    ...(client.requestedVersion
      ? { requestedVersion: client.requestedVersion }
      : {}),
    ...(client.resolvedVersion
      ? { registryVersion: client.resolvedVersion }
      : {}),
    items: [...resolved.values()].map((item) => ({
      name: item.name,
      title: item.title ?? item.name,
      requested: requested.has(item.name),
      ...(item._registry?.itemVersion
        ? { version: item._registry.itemVersion }
        : {}),
      ...(item._registry?.integrity
        ? { integrity: item._registry.integrity }
        : {}),
      ...(item.behavior ? { behavior: item.behavior } : {}),
      files: (item.files ?? []).map((file) => file.path).sort(),
    })),
    files,
    snapshots,
    npmDependencies: [...npmDependencies].sort(),
  }
}

export async function buildCliScaffoldPlan(
  options: Omit<CliScaffoldOptions, "cwd" | "monorepo" | "install" | "packageManager">,
): Promise<ScaffoldPlan> {
  return composeScaffoldPlan({
    base: options.registry,
    framework: options.framework,
    starter: options.starter,
    name: options.name,
    preset: options.preset,
    version: options.registryVersion,
    agentRules: options.agentRules,
    availableRuleTools: ["cli:inspect", "cli:add", "cli:update"],
    resolveInstallPlan: (names, installOptions) =>
      resolveCliInstallPlan(names, {
        ...installOptions,
        fetchImpl: options.fetchImpl,
      }),
  })
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function projectFiles(
  plan: ScaffoldPlan,
  monorepo: boolean,
  packageManager: PackageManager = "pnpm",
  packageManagerVersion = "11.10.0",
): { path: string; content: string }[] {
  if (!monorepo) return plan.files

  const rootFiles = [
    {
      path: "package.json",
      content: json({
        name: `${plan.projectName}-workspace`,
        private: true,
        version: "0.0.0",
        packageManager: `${packageManager}@${packageManagerVersion}`,
        workspaces: ["apps/*", "packages/*"],
        scripts: {
          dev: "turbo run dev",
          build: "turbo run build",
          typecheck: "turbo run typecheck",
        },
        devDependencies: { turbo: "2.10.3" },
      }),
    },
    {
      path: "pnpm-workspace.yaml",
      content:
        'packages:\n  - "apps/*"\n  - "packages/*"\nallowBuilds:\n  esbuild: true\n',
    },
    {
      path: "turbo.json",
      content: json({
        $schema: "https://turbo.build/schema.json",
        tasks: {
          build: { dependsOn: ["^build"], outputs: ["dist/**", ".next/**"] },
          typecheck: { dependsOn: ["^typecheck"] },
          dev: { cache: false, persistent: true },
        },
      }),
    },
    {
      path: ".gitignore",
      content: "node_modules\n.turbo\n.env\n.env.local\n",
    },
    {
      path: "README.md",
      content:
        `# ${plan.projectName}\n\n` +
        "A logic2b ui workspace. The generated application lives in `apps/web`.\n",
    },
  ]
  return [
    ...rootFiles,
    ...plan.files.map((file) => ({
      path: `apps/web/${file.path}`,
      content: file.content,
    })),
  ]
}

export function packageManagerInstallCommand(
  packageManager: PackageManager,
): [string, ...string[]] {
  if (packageManager === "yarn") return ["yarn"]
  return [packageManager, "install"]
}

export function packageManagerDevCommand(
  packageManager: PackageManager,
): string {
  if (packageManager === "yarn") return "yarn dev"
  if (packageManager === "bun") return "bun run dev"
  return `${packageManager} run dev`
}

const FALLBACK_PACKAGE_MANAGER_VERSIONS: Record<PackageManager, string> = {
  npm: "11.5.1",
  pnpm: "11.10.0",
  yarn: "4.9.2",
  bun: "1.2.23",
}

function packageManagerVersion(packageManager: PackageManager): string {
  const result = spawnSync(packageManager, ["--version"], {
    encoding: "utf8",
  })
  const version = result.status === 0 ? result.stdout.trim() : ""
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)
    ? version
    : FALLBACK_PACKAGE_MANAGER_VERSIONS[packageManager]
}

async function assertScaffoldTarget(cwd: string): Promise<void> {
  if (!existsSync(cwd)) return
  const stat = await lstat(cwd)
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Scaffolding requires a regular empty directory, not a symlink or file.")
  const entries = await readdir(cwd)
  const conflicts = entries.filter((entry) => entry !== ".git")
  if (conflicts.length > 0) {
    throw new Error(
      `Scaffolding requires an empty directory. ${cwd} already contains: ${conflicts.slice(0, 5).join(", ")}${conflicts.length > 5 ? ", …" : ""}`,
    )
  }
}

async function createSafeParents(root: string, path: string): Promise<void> {
  let current = root
  for (const segment of path.split("/").slice(0, -1)) {
    current = resolve(current, segment)
    try { await mkdir(current) } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error }
    const stat = await lstat(current)
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Scaffold output paths cannot traverse symlinks or non-directory files.")
  }
}

function safeTarget(cwd: string, path: string): string {
  const root = resolve(cwd)
  const target = resolve(root, path)
  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error(`Unsafe scaffold path "${path}".`)
  }
  return target
}

export async function scaffoldProject(
  options: CliScaffoldOptions,
): Promise<CliScaffoldResult> {
  const cwd = resolve(options.cwd)
  await assertScaffoldTarget(cwd)
  const packageManager =
    options.packageManager ??
    detectPackageManager(existsSync(cwd) ? cwd : dirname(cwd))
  const plan = await buildCliScaffoldPlan(options)
  const files = projectFiles(
    plan,
    options.monorepo === true,
    packageManager,
    packageManagerVersion(packageManager),
  )

  const targets = new Set<string>()
  for (const file of files) {
    const target = safeTarget(cwd, file.path)
    if (targets.has(target)) {
      throw new Error(`Scaffold generated "${file.path}" more than once.`)
    }
    targets.add(target)
  }

  // Registry resolution can take time: reject files that appeared since the first check.
  await assertScaffoldTarget(cwd)
  await mkdir(cwd, { recursive: true })
  const root = await realpath(cwd)
  const rootStat = await lstat(root)
  for (const file of files) {
    const currentRoot = await lstat(root)
    if (currentRoot.isSymbolicLink() || !currentRoot.isDirectory() || currentRoot.dev !== rootStat.dev || currentRoot.ino !== rootStat.ino || await realpath(root) !== root) throw new Error("Scaffold project root changed while writing; retry.")
    const target = safeTarget(root, file.path)
    await createSafeParents(root, file.path)
    await writeFile(target, file.content, { flag: "wx" })
  }

  let installed = false
  if (options.install !== false) {
    const [command, ...args] = packageManagerInstallCommand(packageManager)
    console.log(`\nInstalling workspace dependencies with ${packageManager}…\n`)
    const result = spawnSync(command, args, { cwd, stdio: "inherit" })
    installed = result.status === 0
    if (!installed) {
      console.log(
        `\n! ${packageManager} install did not complete. The project was generated; run "${[command, ...args].join(" ")}" inside it when ready.`,
      )
    }
  }

  return { plan, packageManager, installed, filesWritten: files.length }
}
