import {
  createRegistryClient,
  type FetchLike,
  type RegistryFile,
  type RegistryItem,
} from "./registry.ts"
import { scaffoldRegistryPath, transformIconItems } from "@logic2b/scaffold"
import { ICON_LIBRARIES, type IconLibrary } from "@logic2b/tokens"

/**
 * Turn a registry file path into a project-relative target path, mirroring
 * the CLI's targetPath() with its default aliases (`@/*` → `<srcDir>/*`).
 * Registry file paths look like: "ui/button.tsx", "blocks/login-01/x.tsx",
 * "charts/chart-area-01.tsx", "hooks/use-mobile.ts", "lib/utils.ts",
 * "theme.css".
 */
export function planPath(srcDir: string, file: RegistryFile): string {
  return scaffoldRegistryPath(srcDir, file.path)
}

/** Breadth-first resolution of items and their registry dependencies. */
export async function resolvePlanGraph(
  names: string[],
  getItem: (name: string) => Promise<RegistryItem>
): Promise<Map<string, RegistryItem>> {
  const resolved = new Map<string, RegistryItem>()
  const queue = [...names]
  while (queue.length > 0) {
    const name = queue.shift()!
    if (resolved.has(name)) continue
    const item = await getItem(name)
    resolved.set(name, item)
    queue.push(...(item.registryDependencies ?? []))
  }
  return resolved
}

export interface InstallPlan {
  registry: string
  requestedVersion?: string
  registryVersion?: string
  items: {
    name: string
    title: string
    requested: boolean
    version?: string
    integrity?: string
    files?: string[]
  }[]
  files: { path: string; content: string }[]
  /** Raw registry sources retained for scaffold update snapshots. */
  snapshots: { path: string; content: string }[]
  npmDependencies: string[]
  iconLibrary: IconLibrary
  notes: string[]
}

export interface InstallPlanOptions {
  base: string
  fetchImpl?: FetchLike
  /** Exact registry semver, semver range or published channel. */
  version?: string
  /** Project source root the `@/*` alias points at. Default "src";
   *  pass "" (or ".") for projects with no src directory. */
  srcDir?: string
  /** Icon implementation to substitute for the registry's canonical Lucide imports. */
  iconLibrary?: IconLibrary
}

/**
 * Resolve registry items into an executable plan: every file to write
 * (project-relative path + full content, registry dependencies included) and
 * the npm dependencies to add. An agent with no shell installs by writing the
 * files and adding the deps to package.json.
 */
export async function buildInstallPlan(
  names: string[],
  { base, fetchImpl, srcDir = "src", version, iconLibrary = "lucide" }: InstallPlanOptions
): Promise<InstallPlan> {
  if (!(iconLibrary in ICON_LIBRARIES)) {
    throw new Error(`Unknown icon library "${iconLibrary}".`)
  }
  const requested = new Set(names)
  const client = await createRegistryClient(base, version, fetchImpl)
  const resolved = transformIconItems(
    await resolvePlanGraph(names, (name) => client.getItem(name)),
    iconLibrary,
  )

  const files: { path: string; content: string }[] = []
  const seenPaths = new Set<string>()
  const snapshots: { path: string; content: string }[] = []
  const seenSnapshotPaths = new Set<string>()
  const npmDeps = new Set<string>()
  let hasTheme = false

  for (const item of resolved.values()) {
    if (item.type === "registry:style") hasTheme = true
    for (const dep of item.dependencies ?? []) npmDeps.add(dep)
    for (const file of item.files ?? []) {
      if (!seenSnapshotPaths.has(file.path)) {
        seenSnapshotPaths.add(file.path)
        snapshots.push({ path: file.path, content: file.content })
      }
      const path = planPath(srcDir, file)
      if (seenPaths.has(path)) continue
      seenPaths.add(path)
      files.push({ path, content: file.content })
    }
  }

  const aliasRoot = srcDir === "" || srcDir === "." ? "./" : `./${srcDir.replace(/\/$/, "")}/`
  const notes = [
    `Write each file at its "path" (relative to the project root), creating directories as needed.`,
    `Imports use the "@/*" alias — ensure tsconfig.json maps "@/*" to "${aliasRoot}*" (compilerOptions.paths).`,
    npmDeps.size > 0
      ? `Add the npm dependencies to package.json and install them: ${[...npmDeps].sort().join(", ")}.`
      : "No extra npm dependencies are required.",
    "Components assume React 19 + Tailwind CSS v4 and the logic2b theme tokens.",
  ]
  if (!hasTheme) {
    notes.push(
      'If the project does not have the logic2b theme yet, plan the "theme" item too (it writes theme.css with every token the components consume) and import it from your global stylesheet.'
    )
  } else {
    notes.push(
      "Import the theme stylesheet from your app entry (e.g. `@import \"./styles/theme.css\";`); dark mode toggles with the `dark` class on <html>."
    )
  }

  return {
    registry: base,
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
      ...(item.version ? { version: item.version } : {}),
      ...(item.integrity ? { integrity: item.integrity } : {}),
      files: (item.files ?? []).map((file) => file.path).sort(),
    })),
    files,
    snapshots,
    npmDependencies: [...npmDeps].sort(),
    iconLibrary,
    notes,
  }
}
