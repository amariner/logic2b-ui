/** Bounded behavior evidence shared by registry, MCP and install adapters. */
export const BEHAVIOR_STATES = ["idle", "loading", "empty", "no-results", "error", "success", "submitting", "validation-error", "permission-denied", "unsaved", "offline", "partial"] as const
export type BehaviorState = typeof BEHAVIOR_STATES[number]
export const BEHAVIOR_INTENTS = ["browse-customers", "filter-customers", "create-customer", "edit-customer", "recover-request"] as const
export interface RegistryBehavior {
  schemaVersion: 1
  states: Record<BehaviorState, { support: "built-in" | "consumer" | "not-applicable"; how: string; transitions?: BehaviorState[]; preserves?: string[] }>
  content: { key: string; type: "text"; path: string; sample: string; maxLength?: number; guidance?: string }[]
  actions: { name: string; props: string[]; consumer: string[] }[]
  intents: typeof BEHAVIOR_INTENTS[number][]
  journey: { before?: string[]; after?: string[] }
  responsive: { viewports: ("mobile" | "tablet" | "desktop")[]; strategy: string; touchTargets: "44px" | "24px" }
  consumer: string[]
}
type Schema = { type?: string; const?: unknown; enum?: readonly unknown[]; pattern?: string; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; minItems?: number; maxItems?: number; uniqueItems?: boolean; items?: Schema; properties?: Record<string, Schema>; required?: readonly string[]; additionalProperties?: boolean }
const text: Schema = { type: "string", minLength: 1, maxLength: 2048 }
const identifier: Schema = { type: "string", pattern: "^[A-Za-z][A-Za-z0-9._-]*$", minLength: 1, maxLength: 128 }
const list = (items: Schema, maxItems = 32, minItems = 0): Schema => ({ type: "array", items, maxItems, minItems, uniqueItems: true })
const object = (properties: Record<string, Schema>, required: string[] = Object.keys(properties)): Schema => ({ type: "object", properties, required, additionalProperties: false })
const state = object({ support: { enum: ["built-in", "consumer", "not-applicable"] }, how: text, transitions: list({ enum: BEHAVIOR_STATES }, 12), preserves: list(text) }, ["support", "how"])
export const BEHAVIOR_SCHEMA: Schema = object({
  schemaVersion: { const: 1 },
  states: object(Object.fromEntries(BEHAVIOR_STATES.map((name) => [name, state]))),
  content: list(object({ key: identifier, type: { const: "text" }, path: { type: "string", pattern: "^content\\.[A-Za-z][A-Za-z0-9]*(?:\\.[A-Za-z][A-Za-z0-9]*)*$", maxLength: 256 }, sample: text, maxLength: { type: "integer", minimum: 1, maximum: 10000 }, guidance: text }, ["key", "type", "path", "sample"]), 64, 1),
  actions: list(object({ name: identifier, props: list(identifier, 16, 1), consumer: list(text, 16, 1) }), 16, 1),
  intents: list({ enum: BEHAVIOR_INTENTS }, 16, 1),
  journey: object({ before: list(identifier), after: list(identifier) }, []),
  responsive: object({ viewports: list({ enum: ["mobile", "tablet", "desktop"] }, 3, 1), strategy: text, touchTargets: { enum: ["44px", "24px"] } }),
  consumer: list(text, 32, 1),
})

function check(value: unknown, schema: Schema, path: string): void {
  const fail = (reason: string): never => { throw new Error(`Invalid behavior contract at ${path}: ${reason}. Use supported schemaVersion 1.`) }
  if ("const" in schema && value !== schema.const) fail("unsupported constant or schema version")
  if (schema.enum && !schema.enum.includes(value)) fail("unsupported value")
  if (schema.type === "string") {
    if (typeof value !== "string") fail("expected text")
    const text = value as string
    if ((schema.minLength !== undefined && text.trim().length < schema.minLength) || (schema.maxLength !== undefined && text.length > schema.maxLength) || (schema.pattern && !new RegExp(schema.pattern).test(text))) fail("text is empty, oversized or has an unsupported format")
  } else if (schema.type === "integer") {
    if (!Number.isSafeInteger(value) || (schema.minimum !== undefined && (value as number) < schema.minimum) || (schema.maximum !== undefined && (value as number) > schema.maximum)) fail("integer is out of bounds")
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) fail("expected a list")
    const values = value as unknown[]
    if ((schema.minItems !== undefined && values.length < schema.minItems) || (schema.maxItems !== undefined && values.length > schema.maxItems)) fail("list count is out of bounds")
    if (schema.uniqueItems && new Set(values.map((v) => JSON.stringify(v))).size !== values.length) fail("duplicate list entries")
    values.forEach((entry, index) => check(entry, schema.items!, `${path}[${index}]`))
  } else if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) fail("expected an object")
    const entries = value as Record<string, unknown>
    for (const name of schema.required ?? []) if (!Object.hasOwn(entries, name)) fail("required property is missing")
    for (const name of Object.keys(entries)) {
      const property = Object.hasOwn(schema.properties ?? {}, name) ? schema.properties![name] : undefined
      if (!property) fail("unsupported property")
      check(entries[name], property!, `${path}.${name}`)
    }
  }
}
export function validateBehavior(value: unknown): RegistryBehavior {
  check(value, BEHAVIOR_SCHEMA, "behavior")
  const contract = value as RegistryBehavior
  for (const name of ["key", "path"] as const) if (new Set(contract.content.map((slot) => slot[name])).size !== contract.content.length) throw new Error(`Invalid behavior contract: duplicate content ${name}.`)
  if (new Set(contract.actions.map((action) => action.name)).size !== contract.actions.length) throw new Error("Invalid behavior contract: duplicate action name.")
  return contract
}
