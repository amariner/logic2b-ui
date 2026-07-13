import {
  fetchItem,
  type FetchLike,
  type RegistryFile,
  type RegistryItem,
} from "./registry.ts"

/**
 * Turn a registry file path into a project-relative target path, mirroring
 * the CLI's targetPath() with its default aliases (`@/*` → `<srcDir>/*`).
 * Registry file paths look like: "ui/button.tsx", "blocks/login-01/x.tsx",
 * "charts/chart-area-01.tsx", "hooks/use-mobile.ts", "lib/utils.ts",
 * "theme.css".
 */
export function planPath(srcDir: string, file: RegistryFile): string {
  const root = srcDir === "" || srcDir === "." ? "" : `${srcDir.replace(/\/$/, "")}/`
  if (file.path.startsWith("ui/")) return `${root}components/ui/${file.path.slice(3)}`
  if (file.path.startsWith("blocks/")) return `${root}components/${file.path.slice(7)}`
  if (file.path.startsWith("charts/")) return `${root}components/${file.path}`
  if (file.path.startsWith("hooks/")) return `${root}${file.path}`
  if (file.path.startsWith("lib/")) return `${root}${file.path}`
  if (file.path.endsWith(".css")) return `${root}styles/${file.path}`
  return `${root}${file.path}`
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
  items: { name: string; title: string; requested: boolean }[]
  files: { path: string; content: string }[]
  npmDependencies: string[]
  notes: string[]
}

export interface InstallPlanOptions {
  base: string
  fetchImpl?: FetchLike
  /** Project source root the `@/*` alias points at. Default "src";
   *  pass "" (or ".") for projects with no src directory. */
  srcDir?: string
}

/**
 * Resolve registry items into an executable plan: every file to write
 * (project-relative path + full content, registry dependencies included) and
 * the npm dependencies to add. An agent with no shell installs by writing the
 * files and adding the deps to package.json.
 */
export async function buildInstallPlan(
  names: string[],
  { base, fetchImpl, srcDir = "src" }: InstallPlanOptions
): Promise<InstallPlan> {
  const requested = new Set(names)
  const resolved = await resolvePlanGraph(names, (name) =>
    fetchItem(base, name, fetchImpl)
  )

  const files: { path: string; content: string }[] = []
  const seenPaths = new Set<string>()
  const npmDeps = new Set<string>()
  let hasTheme = false

  for (const item of resolved.values()) {
    if (item.type === "registry:style") hasTheme = true
    for (const dep of item.dependencies ?? []) npmDeps.add(dep)
    for (const file of item.files ?? []) {
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
    items: [...resolved.values()].map((item) => ({
      name: item.name,
      title: item.title ?? item.name,
      requested: requested.has(item.name),
    })),
    files,
    npmDependencies: [...npmDeps].sort(),
    notes,
  }
}
