import { buildScaffoldPlan, scaffoldRegistryPath, type ScaffoldInstallPlan, type ScaffoldPlan } from "./index.ts"
import { COMPOSE_LIMITS, validateComposeRequest, type ComposeItem, type ComposePlan, type ComposeRequest } from "./compose.ts"
import { customerScreenSource } from "./compose-screen.ts"

export interface CompositionAsset extends ComposeItem {
  version?: string
  integrity?: string
  dependencies?: string[]
  files?: { path: string; type: string; content: string }[]
}
export interface CompositionProjectPlan {
  schemaVersion: 1
  registryVersion: string
  framework: "next" | "vite" | "astro"
  projectName: string
  preset?: string
  iconLibrary: ScaffoldPlan["iconLibrary"]
  items: ScaffoldPlan["items"]
  files: { path: string; content: string }[]
  commands: ScaffoldPlan["commands"]
  notes: string[]
}
const json = (value: unknown) => JSON.stringify(value)
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length
class CompositionProjectUnsupported extends Error {}

/** A one-client resolver: adapters cache verified assets; no second channel
 * selection occurs when the framework shell asks for theme/install files. */
async function resolveAssets(names: string[], srcDir: string, plan: ComposePlan, request: ComposeRequest, getItem: (name: string) => Promise<CompositionAsset>): Promise<ScaffoldInstallPlan> {
  const resolved = new Map<string, CompositionAsset>()
  const queue = [...names]
  let total = 0
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const name = queue[cursor]
    if (resolved.has(name)) continue
    if (resolved.size >= COMPOSE_LIMITS.items) throw new Error("Composition project exceeds 128 dependency items.")
    const item = await getItem(name)
    if (item.name !== name || !item.integrity || !item.version) throw new Error("Composition project needs exact verified item versions and integrity.")
    total += bytes(item)
    if (total > 4 * 1024 * 1024) throw new Error("Composition project assets exceed 4 MiB.")
    if (request.constraints!.avoid!.includes(name) || item.categories?.some(category => request.constraints!.avoid!.includes(category))) throw new CompositionProjectUnsupported("A required composition project foundation conflicts with avoid. Use metadata output or revise the constraint.")
    resolved.set(name, item)
    if (item.registryDependencies && (item.registryDependencies.length > COMPOSE_LIMITS.items || item.registryDependencies.some(dep => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dep)))) throw new Error("Composition project dependencies are malformed or exceed their limit.")
    queue.push(...(item.registryDependencies ?? []))
  }
  const files = new Map<string, string>()
  const snapshots = new Map<string, string>()
  const dependencies = new Set<string>()
  for (const item of resolved.values()) {
    for (const dep of item.dependencies ?? []) dependencies.add(dep)
    for (const file of item.files ?? []) {
      if (!file.path || file.path.length > 256 || file.path.split("/").some(part => !part || part === "." || part === "..") || /[\\\u0000]/.test(file.path) || typeof file.content !== "string") throw new Error("Composition project source paths/content are malformed.")
      const path = scaffoldRegistryPath(srcDir, file.path)
      if (files.has(path) && files.get(path) !== file.content) throw new Error("Composition registry items disagree on shared source bytes.")
      files.set(path, file.content); snapshots.set(file.path, file.content)
    }
  }
  if (!files.has(scaffoldRegistryPath(srcDir, "theme.css"))) throw new Error("Composition project theme foundation is missing.")
  return { registryVersion: plan.registryVersion, requestedVersion: request.version ?? plan.registryVersion,
    items: [...resolved.values()].map(item => ({ name: item.name, title: item.name, requested: names.includes(item.name), version: item.version, integrity: item.integrity, files: (item.files ?? []).map(file => file.path).sort() })),
    files: [...files].map(([path, content]) => ({ path, content })), snapshots: [...snapshots].map(([path, content]) => ({ path, content })), npmDependencies: [...dependencies].sort() }
}

/** Export source only for fully grounded roles/states and supported local demo
 * callbacks. Production wiring gaps remain in the original metadata plan. */
export async function addCompositionProject(raw: unknown, plan: ComposePlan, { base, getItem }: { base: string; getItem: (name: string) => Promise<CompositionAsset> }): Promise<ComposePlan> {
  const request = validateComposeRequest(raw)
  if (request.output !== "project") return plan
  const unsupported = plan.gaps.some(gap => !gap.requirementId || !/^Action .+ requires consumer callback wiring$/.test(gap.need))
  const language = new Intl.Locale(plan.locale).language
  const privateRoute = plan.pages.some(page => page.route.split("/").some(part => part.startsWith("_")))
  if (!plan.next.install || unsupported || !["en", "es"].includes(language) || privateRoute) {
    plan.project = null
    plan.gaps.push({ need: "Project output requires grounded customer roles/states, English or Spanish, and routes without private underscore segments", suggestion: "Resolve unsupported requirements/constraints or use metadata output. Only local demo callbacks are supplied; no missing role or state is invented.", primitives: [] })
    plan.confidence = "low"
    return plan
  }
  const allItems = new Set(plan.pages.flatMap(page => page.sections.map(section => section.item)))
  const title = language === "es" ? "Gestión de clientes" : "Customer management"
  // Reuse the existing minimal framework shell. The resolver supplies the
  // grounded roots + theme, so no authentication block is installed. Auth
  // starter metadata and its entry component are replaced below.
  let shell: ScaffoldPlan
  try {
    shell = await buildScaffoldPlan({ base, framework: plan.stack, starter: "auth", name: "logic2b-customers", preset: plan.preset, version: plan.registryVersion,
      resolveInstallPlan: (_names, options) => resolveAssets([...plan.next.install!.items, "theme"], options.srcDir, plan, request, getItem) })
  } catch (error) {
    if (!(error instanceof CompositionProjectUnsupported)) throw error
    plan.project = null; plan.confidence = "low"
    plan.gaps.push({ need: error.message, suggestion: "Provide the missing project foundation or request metadata output for an existing app.", primitives: [] })
    return plan
  }
  const files = new Map(shell.files.map(file => [file.path, file.content]))
  const root = plan.stack === "next" ? "" : "src/"
  const config = { pages: plan.pages.map(page => ({ route: page.route, list: page.sections.some(section => section.item === "admin-customers-01"), form: page.sections.some(section => section.item === "customer-edit-01") })), language, title }
  const configSource = `export const composition = ${JSON.stringify(config, null, 2)} as const\n`
  files.set(`${root}components/composition-config.ts`, configSource)
  files.set(`${root}components/composition-screen.tsx`, customerScreenSource({ list: allItems.has("admin-customers-01"), form: allItems.has("customer-edit-01"), language }))
  files.delete(`${root}components/starter-page.tsx`)
  const pageSource = (route: string) => `import { CompositionScreen } from "@/components/composition-screen"\nimport { composition } from "@/components/composition-config"\n\nexport default function Page() {\n  const page = composition.pages.find(page => page.route === ${json(route)})!\n  return <CompositionScreen showList={page.list} showForm={page.form} />\n}\n`
  if (plan.stack === "next") {
    files.delete("app/page.tsx")
    files.set("app/layout.tsx", `import "../styles/theme.css"\n\nexport const metadata = { title: ${json(title)} }\nexport default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {\n  return <html lang=${json(plan.locale)} className="dark"><body>{children}</body></html>\n}\n`)
    for (const page of plan.pages) files.set(`app${page.route === "/" ? "" : page.route}/page.tsx`, pageSource(page.route))
  } else if (plan.stack === "astro") {
    files.delete("src/pages/index.astro")
    for (const page of plan.pages) files.set(`src/pages${page.route === "/" ? "" : page.route}/index.astro`, `---\nimport { CompositionScreen } from "@/components/composition-screen"\nimport { composition } from "@/components/composition-config"\nimport "@/styles/theme.css"\nconst page = composition.pages.find(page => page.route === ${json(page.route)})!\n---\n<!doctype html>\n<html lang=${json(plan.locale)} class="dark"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width" /><title>${title}</title></head><body><CompositionScreen showList={page.list} showForm={page.form} client:load /></body></html>\n`)
  } else {
    files.set("src/main.tsx", `import { StrictMode } from "react"\nimport { createRoot } from "react-dom/client"\nimport { CompositionScreen } from "@/components/composition-screen"\nimport { composition } from "@/components/composition-config"\nimport "@/styles/theme.css"\n\nconst route = window.location.pathname.replace(/\\/$/, "") || "/"\nconst page = composition.pages.find(page => page.route === route)\ncreateRoot(document.getElementById("root")!).render(<StrictMode>{page ? <CompositionScreen showList={page.list} showForm={page.form} /> : <main><h1>404</h1><a href={composition.pages[0].route}>${language === "es" ? "Ir a clientes" : "Open customers"}</a></main>}</StrictMode>)\n`)
    files.set("index.html", files.get("index.html")!.replace('lang="en"', `lang=${json(plan.locale)}`).replace("logic2b starter", title))
  }
  files.set("README.md", `# ${title}\n\nRoutes: ${plan.pages.map(page => page.route).join(", ")}\nRegistry: ${plan.registryVersion}\n\nThis is a synthetic local demo. Customer data resets on reload and is independent on each route. Create/edit works within a route containing both roles; list-only routes are read-only. Replace local demo callbacks with server persistence, data fetching and authorization. Navigation between routes uses full page loads; no backend or shared cross-route store is supplied. Build and browser checks must run separately. Vite hosting requires a history fallback to index.html.\n\nInspect AGENTS.md and DESIGN.md before modifying components. Keep customized files and update snapshots; use incremental change plans in existing apps.\n`)
  files.set("composition-plan.json", `${JSON.stringify(plan, null, 2)}\n`)
  if (files.size > 512) throw new Error("Composition project exceeds 512 files; narrow the requirements.")
  plan.project = { schemaVersion: 1, registryVersion: plan.registryVersion, framework: plan.stack, projectName: shell.projectName, ...(shell.preset ? { preset: shell.preset } : {}), iconLibrary: shell.iconLibrary, items: shell.items, files: [...files].map(([path, content]) => ({ path, content })), commands: shell.commands,
    notes: ["Materialize only into a new project directory. This plan never builds, installs or executes sources.", "Source contains only declared customer roles plus the shared theme/framework foundation; unknown requirements suppress project output.", "Demo callbacks are local only, with no persistence or server authorization. Metadata callback gaps remain partial. Data is independent per route and resets on reload.", "Use same-route list/form roles for the interactive customer journey. List-only routes are read-only; route-to-route integration remains consumer work.", "Vite requires a history-fallback host for direct route access. Next and Astro have static route entries."] }
  if (bytes(plan) > 4 * 1024 * 1024) throw new Error("Composition project plan exceeds 4 MiB output; narrow the requirements.")
  return plan
}
