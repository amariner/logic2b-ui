import {
  buildAgentRulesPlan,
  validateRulePrecondition,
} from "@logic2b/scaffold/rules"
import { webcrypto } from "node:crypto"
import { registryKind, type RegistryIndexItem } from "./core"

// Extension hosts use Node's standard WebCrypto even when its global is absent.
if (globalThis.crypto === undefined) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true })

export type WorkspaceAgentRulesOptions = Omit<Parameters<typeof buildAgentRulesPlan>[0], "currentFiles">
export type WorkspaceAgentRulesPlan = Awaited<ReturnType<typeof buildAgentRulesPlan>>
export type WorkspaceAgentRulesFile = WorkspaceAgentRulesPlan["files"][number]

export interface AgentRulesWorkspace {
  read(path: string): Promise<string | null>
  apply(files: WorkspaceAgentRulesFile[]): Promise<boolean>
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function parse(text: string | null, label: string): Record<string, unknown> {
  if (text === null) return {}
  let value: unknown
  try { value = JSON.parse(text.replace(/^\ufeff/, "")) } catch { throw new Error(`${label} must contain valid JSON before generating agent rules.`) }
  if (!object(value)) throw new Error(`${label} must contain a JSON object.`)
  return value
}

export function projectAgentRulesEnabled(configText: string): boolean {
  const config = parse(configText, "components.json")
  const logic = object(config.logic2b) ? config.logic2b : {}
  if (logic.agentRules !== undefined && typeof logic.agentRules !== "boolean") throw new Error("components.json logic2b.agentRules must be a boolean.")
  return logic.agentRules !== false
}

/** Select only project metadata; no source, package scripts or registry URLs enter the plan. */
export function agentRulesOptionsFromProject(
  configText: string,
  manifestText: string | null,
  packageText: string | null,
  catalog: RegistryIndexItem[] = [],
): WorkspaceAgentRulesOptions {
  const config = parse(configText, "components.json")
  const logic = object(config.logic2b) ? config.logic2b : {}
  const namedRegistries = object(config.registries) ? config.registries : {}
  const isLogic2b = typeof logic.registry === "string"
    || config.$schema === "https://ui.logic2b.com/schema.json"
    || typeof namedRegistries["@logic2b"] === "string"
  if (!isLogic2b) throw new Error("This workspace does not declare a logic2b registry in components.json.")
  const manifest = parse(manifestText, ".logic2b/manifest.json")
  if (manifestText !== null && manifest.schemaVersion !== 1) throw new Error("Unsupported logic2b install manifest schemaVersion.")
  const pkg = parse(packageText, "package.json")
  const dependencies = Object.assign({}, ...[pkg.peerDependencies, pkg.devDependencies, pkg.dependencies].filter(object)) as Record<string, unknown>
  const frameworks = (["next", "vite", "astro"] as const).filter((name) => dependencies[name] !== undefined)
  const stack = frameworks.length === 1 ? frameworks[0] : frameworks.length > 1 ? "unknown" : dependencies.react !== undefined ? "react" : "unknown"
  const byName = new Map(catalog.map((item) => [item.name, registryKind(item)]))
  const items = manifest.items === undefined ? {} : manifest.items
  if (!object(items)) throw new Error("logic2b install manifest items must be an object.")
  const inventory = Object.keys(items).sort().map((name) => {
    const item = items[name]
    if (!object(item) || !Array.isArray(item.files) || item.files.some((file) => typeof file !== "string")) throw new Error("logic2b install manifest items must declare their file paths.")
    const paths = item.files as string[]
    const inferred = paths.some((path) => path.startsWith("ui/")) ? "component" : paths.some((path) => path.startsWith("charts/")) ? "chart" : paths.some((path) => path.startsWith("blocks/")) ? "block" : "other"
    return { name, kind: byName.get(name) ?? inferred }
  })
  const registry = object(manifest.registry) ? manifest.registry : {}
  const configVersion = typeof logic.version === "string" && /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(logic.version) ? logic.version : undefined
  return {
    stack,
    ...(typeof logic.preset === "string" ? { preset: logic.preset } : {}),
    ...(typeof config.iconLibrary === "string" ? { iconLibrary: config.iconLibrary } : {}),
    ...(typeof registry.resolvedVersion === "string" ? { registryVersion: registry.resolvedVersion } : configVersion ? { registryVersion: configVersion } : {}),
    inventory,
    inventoryKind: "installed",
    availableTools: [],
  }
}

/** Read only files selected by the shared generator; unrelated editor formats remain untouched. */
export async function prepareWorkspaceAgentRules(
  workspace: AgentRulesWorkspace,
  options: WorkspaceAgentRulesOptions,
): Promise<WorkspaceAgentRulesPlan> {
  const scope = await buildAgentRulesPlan(options)
  const currentFiles: Array<{ path: string; content: string }> = []
  for (const file of scope.files) {
    const content = await workspace.read(file.path)
    if (content !== null) currentFiles.push({ path: file.path, content })
  }
  return buildAgentRulesPlan({ ...options, currentFiles })
}

/** All stale checks finish before any workspace mutation is requested. */
export async function applyWorkspaceAgentRules(
  workspace: AgentRulesWorkspace,
  plan: WorkspaceAgentRulesPlan,
): Promise<number> {
  const changed = plan.files.filter((file) => file.action !== "unchanged")
  for (const file of plan.files) await validateRulePrecondition((await workspace.read(file.path)) ?? undefined, file.precondition)
  if (changed.length === 0) return 0
  if (!(await workspace.apply(changed))) throw new Error("VS Code could not apply every agent rules edit. Check the affected files before retrying.")
  return changed.length
}
