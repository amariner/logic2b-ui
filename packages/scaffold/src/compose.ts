import { assertRegistryBehavior, BEHAVIOR_STATES, type RegistryBehavior } from "./behavior.ts"
import { CUSTOMER_COMPOSITION } from "./compose-templates.ts"

export const COMPOSE_LIMITS = { requirements: 24, roles: 8, actions: 16, pages: 6, items: 128, constraints: 32, text: 128, route: 256, brief: 2000, bytes: 65536 } as const
export type ComposeState = typeof BEHAVIOR_STATES[number]
export interface ComposeRequirement {
  id: string
  route: string
  /** An explicit intent, not prose interpreted by a model. */
  task: string
  roles: string[]
  requiredStates: ComposeState[]
  actions: string[]
}
export interface ComposeRequest {
  schemaVersion?: 1
  requirements: ComposeRequirement[]
  brief?: string
  stack?: "next" | "vite" | "astro"
  locale?: string
  constraints?: { mustInclude?: string[]; avoid?: string[]; maxPages?: number }
  version?: string
}
export interface ComposeItem {
  name: string
  type: string
  categories?: string[]
  registryDependencies?: string[]
  behavior?: RegistryBehavior
  accessibility?: { consumer: string[]; limitations?: string[] }
}
export interface ComposePlan {
  schemaVersion: 1
  registryVersion: string
  stack: "next" | "vite" | "astro"
  locale: string
  coverage: { requirementId: string; status: "covered" | "partial" | "gap"; evidence: string[] }[]
  pages: { route: string; purpose: string; sections: {
    item: string; role: string; requirementIds: string[]; why: string
    contentSlots: string[]
    states: Record<ComposeState, "built-in" | "consumer" | "not-applicable" | "unknown">
    actions: { name: string; callback: string; responsibility: string }[]
    consumer: string[]; accessibility: { status: "declared" | "unknown"; consumer: string[]; limitations: string[] }
  }[] }[]
  items: string[]
  gaps: { requirementId?: string; need: string; suggestion: string; primitives: string[] }[]
  next: { install: { items: string[]; version: string } | null }
  confidence: "high" | "medium" | "low"
  notes: string[]
}
export class ComposeInputError extends Error {
  constructor(message: string) { super(message); this.name = "ComposeInputError" }
}
function fail(where: string, expected: string): never { throw new ComposeInputError(`Invalid composition ${where}: ${expected}.`) }
function object(value: unknown, where: string, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(where, "expected an object")
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !allowed.includes(key))) fail(where, "unsupported fields")
  return data
}
function text(value: unknown, where: string, max: number = COMPOSE_LIMITS.text): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value) || /[\uD800-\uDFFF]/u.test(value)) fail(where, `expected nonempty text up to ${max} characters without control characters`)
  return value.trim()
}
function strings(value: unknown, where: string, max: number, min = 0): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(where, `expected ${min}–${max} entries`)
  const values = (value as unknown[]).map(entry => text(entry, where))
  if (new Set(values).size !== values.length) fail(where, "duplicate entries")
  return values
}
const itemName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Validate before registry I/O. Never echo private brief or requirement values. */
export function validateComposeRequest(value: unknown): ComposeRequest {
  const data = object(value, "request", ["schemaVersion", "requirements", "brief", "stack", "locale", "constraints", "version"])
  let serialized: string
  try { serialized = JSON.stringify(value) } catch { return fail("request", "expected JSON data") }
  if (new TextEncoder().encode(serialized).length > COMPOSE_LIMITS.bytes) fail("request", "above 65536-byte input limit")
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1) fail("schemaVersion", "expected 1")
  if (!Array.isArray(data.requirements) || !data.requirements.length || data.requirements.length > COMPOSE_LIMITS.requirements) fail("requirements", "expected 1–24 requirements")
  const requirements = (data.requirements as unknown[]).map((entry, index): ComposeRequirement => {
    const at = `requirements[${index}]`
    const row = object(entry, at, ["id", "route", "task", "roles", "requiredStates", "actions"])
    const id = text(row.id, `${at}.id`)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) fail(`${at}.id`, "expected a stable identifier")
    const route = text(row.route, `${at}.route`, COMPOSE_LIMITS.route)
    if (!/^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)?$/.test(route)) fail(`${at}.route`, "expected / or a static absolute route without traversal, queries or encoded segments")
    const requiredStates = strings(row.requiredStates, `${at}.requiredStates`, BEHAVIOR_STATES.length)
    if (requiredStates.some(state => !BEHAVIOR_STATES.includes(state as ComposeState))) fail(`${at}.requiredStates`, "unsupported state")
    return { id, route, task: text(row.task, `${at}.task`), roles: strings(row.roles, `${at}.roles`, COMPOSE_LIMITS.roles, 1), requiredStates: requiredStates as ComposeState[], actions: strings(row.actions, `${at}.actions`, COMPOSE_LIMITS.actions) }
  })
  if (new Set(requirements.map(row => row.id)).size !== requirements.length) fail("requirements", "duplicate ids")
  const stack = data.stack ?? "vite"
  if (!["next", "vite", "astro"].includes(stack as string)) fail("stack", "expected next, vite or astro")
  const locale = data.locale === undefined ? "en" : text(data.locale, "locale", 64)
  try { if (Intl.getCanonicalLocales(locale).length !== 1) fail("locale", "expected a BCP 47 language tag") } catch { fail("locale", "expected a BCP 47 language tag") }
  const constraints = data.constraints === undefined ? {} : object(data.constraints, "constraints", ["mustInclude", "avoid", "maxPages"])
  const mustInclude = strings(constraints.mustInclude ?? [], "constraints.mustInclude", COMPOSE_LIMITS.constraints)
  const avoid = strings(constraints.avoid ?? [], "constraints.avoid", COMPOSE_LIMITS.constraints)
  if ([...mustInclude, ...avoid].some(name => !itemName.test(name))) fail("constraints", "expected item names or category identifiers")
  const candidateRoots = CUSTOMER_COMPOSITION.filter(template => requirements.some(row => template.intents.some(intent => intent === row.task) && row.roles.some(role => template.roles.some(candidate => candidate === role)))).map(template => template.item)
  if (new Set([...mustInclude, ...candidateRoots]).size > COMPOSE_LIMITS.constraints) fail("constraints.mustInclude", "at most 32 total candidate roots, including matched blocks, can be passed to install_plan")
  const maxPages = constraints.maxPages ?? COMPOSE_LIMITS.pages
  if (!Number.isInteger(maxPages) || Number(maxPages) < 1 || Number(maxPages) > COMPOSE_LIMITS.pages) fail("constraints.maxPages", "expected 1–6")
  return { schemaVersion: 1, requirements, stack: stack as ComposeRequest["stack"], locale, constraints: { mustInclude, avoid, maxPages: Number(maxPages) }, ...(data.brief !== undefined ? { brief: text(data.brief, "brief", COMPOSE_LIMITS.brief) } : {}), ...(data.version !== undefined ? { version: text(data.version, "version", 64) } : {}) }
}

/** Only explicit supported intents select candidates; prose never supplies coverage. */
export function composeCandidates(request: ComposeRequest): string[] {
  const input = validateComposeRequest(request)
  return [...new Set([...CUSTOMER_COMPOSITION.filter(template => input.requirements.some(row => template.intents.some(intent => intent === row.task) && row.roles.some(role => template.roles.some(candidate => candidate === role)))).map(template => template.item), ...(input.constraints?.mustInclude ?? [])])].sort()
}

function assertComposeItem(item: ComposeItem): void {
  if (typeof item.name !== "string" || item.name.length > COMPOSE_LIMITS.text || !itemName.test(item.name) || typeof item.type !== "string") throw new Error("Composition registry item has an invalid name or type.")
  for (const values of [item.categories, item.registryDependencies]) {
    if (values !== undefined && (!Array.isArray(values) || values.length > COMPOSE_LIMITS.items || values.some(value => typeof value !== "string" || value.length > COMPOSE_LIMITS.text || !itemName.test(value)))) throw new Error("Composition registry categories/dependencies must be bounded identifier arrays (at most 128 items).")
  }
  if (item.behavior !== undefined) assertRegistryBehavior(item.behavior)
  if (item.accessibility !== undefined && (!Array.isArray(item.accessibility.consumer) || item.accessibility.consumer.some(note => typeof note !== "string") || (item.accessibility.limitations !== undefined && (!Array.isArray(item.accessibility.limitations) || item.accessibility.limitations.some(note => typeof note !== "string"))))) throw new Error("Composition accessibility responsibilities are malformed.")
}

/** Bounded loader shared by adapters. The caller's one immutable client verifies
 * each payload, including dependencies. This function has no ambient I/O. */
export async function loadComposeItems(request: ComposeRequest, index: { name: string }[], getItem: (name: string) => Promise<ComposeItem>): Promise<ComposeItem[]> {
  const available = new Set(index.map(item => item.name))
  const queue = composeCandidates(request).filter(name => available.has(name))
  const loaded = new Map<string, ComposeItem>()
  let bytes = 0
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const name = queue[cursor]
    if (loaded.has(name)) continue
    if (loaded.size >= COMPOSE_LIMITS.items) throw new Error("Composition dependency graph exceeds 128 items; narrow the requirements.")
    const item = await getItem(name)
    bytes += new TextEncoder().encode(JSON.stringify(item)).length
    if (bytes > 4 * 1024 * 1024) throw new Error("Composition registry graph exceeds 4 MiB; narrow the requirements.")
    if (item.name !== name) throw new Error("Composition registry payload has a mismatched name.")
    assertComposeItem(item)
    loaded.set(name, { name: item.name, type: item.type, categories: item.categories, registryDependencies: item.registryDependencies, behavior: item.behavior, accessibility: item.accessibility })
    for (const dep of item.registryDependencies ?? []) {
      if (!available.has(dep)) throw new Error("Composition registry dependency is absent from the selected immutable release.")
      queue.push(dep)
    }
  }
  return [...loaded.values()]
}

/** Pure metadata validator/planner. A covered requirement is static declared
 * support, never evidence that the consumer has wired or tested the UI. */
export function buildComposePlan(raw: unknown, registryVersion: string, registryItems: ComposeItem[]): ComposePlan {
  const request = validateComposeRequest(raw)
  if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(registryVersion)) throw new Error("Composition requires an exact registry version.")
  if (registryItems.length > COMPOSE_LIMITS.items || new Set(registryItems.map(item => item.name)).size !== registryItems.length) throw new Error("Composition registry graph is too large or contains duplicate names.")
  for (const item of registryItems) assertComposeItem(item)
  const byName = new Map(registryItems.map(item => [item.name, item]))
  const avoid = new Set(request.constraints!.avoid)
  const plan: ComposePlan = { schemaVersion: 1, registryVersion, stack: request.stack!, locale: request.locale!, coverage: [], pages: [], items: [], gaps: [], next: { install: null }, confidence: "low", notes: [
    "This slice supports explicit customer intents and list/primary-form roles. Brief text is not interpreted; locale is recorded, not translated.",
    "Coverage describes registry metadata, not consumer runtime verification. Wire callbacks, data, persistence, authorization, routing and content; inspect existing projects before applying changes.",
    "No proposal preview, composed route source or scaffold equivalence is available. Stack records the requested target; framework build compatibility remains unverified by this plan.",
  ] }
  const roots = new Set<string>()
  const closure = (name: string, seen = new Set<string>()): string[] => {
    if (seen.has(name)) return []
    const item = byName.get(name)
    if (!item) throw new Error("Composition dependency payload is missing; load the complete verified graph.")
    seen.add(name)
    return [name, ...(item.registryDependencies ?? []).flatMap(dep => closure(dep, seen))]
  }
  const forbidden = (name: string) => closure(name).some(dep => { const item = byName.get(dep)!; return avoid.has(dep) || item.categories?.some(category => avoid.has(category)) })
  const gap = (need: string, requirementId?: string) => plan.gaps.push({ ...(requirementId ? { requirementId } : {}), need, suggestion: "Supply consumer source and runtime checks, or revise the explicit requirement. No substitute is inferred.", primitives: [] })
  for (const row of request.requirements) {
    let page = plan.pages.find(page => page.route === row.route)
    if (!page && plan.pages.length >= request.constraints!.maxPages!) {
      gap(`Route ${row.route} exceeds maxPages`, row.id)
      plan.coverage.push({ requirementId: row.id, status: "gap", evidence: ["No page allocated: explicit page limit."] })
      continue
    }
    if (!page) { page = { route: row.route, purpose: row.task, sections: [] }; plan.pages.push(page) }
    const evidence: string[] = []
    const selected: ComposeItem[] = []
    let incomplete = false
    for (const role of row.roles) {
      const template = CUSTOMER_COMPOSITION.find(candidate => candidate.roles.some(value => value === role) && candidate.intents.some(value => value === row.task))
      const item = template && byName.get(template.item)
      if (!item || item.type !== "registry:block" || !item.behavior?.intents.some(intent => intent === row.task) || forbidden(item.name)) {
        gap(`Intent ${row.task}, role ${role}: no eligible block with declared support`, row.id); incomplete = true; continue
      }
      selected.push(item); roots.add(item.name)
      evidence.push(`${item.name}: behavior.intents declares ${row.task}; mapped role ${role}.`)
      const existing = page.sections.find(section => section.item === item.name && section.role === role)
      if (existing) existing.requirementIds.push(row.id)
      else page.sections.push({ item: item.name, role, requirementIds: [row.id], why: `Explicit ${row.task} intent and ${role} role`, contentSlots: item.behavior.content.map(slot => slot.key), states: Object.fromEntries(BEHAVIOR_STATES.map(state => [state, item.behavior!.states[state].support])) as ComposePlan["pages"][number]["sections"][number]["states"], actions: item.behavior.actions, consumer: item.behavior.consumer, accessibility: { status: item.accessibility ? "declared" : "unknown", consumer: item.accessibility?.consumer ?? [], limitations: item.accessibility?.limitations ?? [] } })
    }
    for (const state of row.requiredStates) {
      // Every selected role must handle the required state, not just its neighbor.
      for (const item of selected) {
        const support = item.behavior!.states[state].support
        evidence.push(`${item.name}: state ${state} is ${support}; ${item.behavior!.states[state].how}`)
        if (support !== "built-in") { incomplete = true; gap(`${item.name}: required state ${state} is ${support}`, row.id) }
      }
    }
    for (const action of row.actions) {
      const providers = selected.flatMap(item => item.behavior!.actions.filter(declared => declared.name === action).map(declared => ({ item, declared })))
      if (!providers.length) { gap(`Action ${action} has no declared callback`, row.id); incomplete = true }
      for (const { item, declared } of providers) evidence.push(`${item.name}: action ${action} uses ${declared.callback}; consumer responsibility: ${declared.responsibility}`)
      // A declared callback still requires consumer integration.
      if (providers.length) { gap(`Action ${action} requires consumer callback wiring`, row.id); incomplete = true }
    }
    plan.coverage.push({ requirementId: row.id, status: !selected.length ? "gap" : incomplete ? "partial" : "covered", evidence })
  }
  for (const name of request.constraints!.mustInclude!) {
    if (!byName.has(name) || forbidden(name)) gap(`mustInclude ${name} is absent or conflicts with avoid`)
    else { roots.add(name); if (!plan.pages.some(page => page.sections.some(section => section.item === name))) gap(`mustInclude ${name} is installable but has no assigned role or coverage`) }
  }
  plan.items = [...new Set([...roots].flatMap(name => closure(name)))].sort()
  // Constraint failures do not yield an executable installation suggestion.
  const constraintFailure = plan.gaps.some(entry => !entry.requirementId && entry.need.includes("absent or conflicts"))
  if (roots.size && !constraintFailure) plan.next.install = { items: [...roots].sort(), version: registryVersion }
  plan.confidence = plan.coverage.some(row => row.status === "gap") || constraintFailure ? "low" : plan.gaps.length ? "medium" : "high"
  if (new TextEncoder().encode(JSON.stringify(plan)).length > 4 * 1024 * 1024) throw new Error("Composition plan exceeds the 4 MiB output limit; narrow the requirements.")
  return plan
}
