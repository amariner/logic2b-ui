/** Versioned, additive behavior metadata. Nested to avoid the registry's existing content URL field. */
export const BEHAVIOR_STATES = ["loading", "empty", "no-results", "error", "success", "submitting", "validation-error", "permission-denied", "unsaved-changes", "offline", "partial"] as const
export const BEHAVIOR_INTENTS = ["browse-customers", "filter-customers", "create-customer", "edit-customer"] as const
export interface RegistryBehavior {
  schemaVersion: 1
  states: Record<typeof BEHAVIOR_STATES[number], { support: "built-in" | "consumer" | "not-applicable"; how: string; transition: string }>
  content: { key: string; path: string; type: "text"; sample: string; guidance?: string }[]
  intents: (typeof BEHAVIOR_INTENTS[number])[]
  actions: { name: string; callback: string; responsibility: string }[]
  journey: { before: string[]; after: string[] }
  responsive: { viewports: ("mobile" | "tablet" | "desktop")[]; strategy: string; touchTargets: "44px" }
  consumer: string[]
}
const text = { type: "string", minLength: 1 }
const strings = { type: "array", items: text }
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false })
export const BEHAVIOR_SCHEMA = object({
  schemaVersion: { const: 1 },
  states: object(Object.fromEntries(BEHAVIOR_STATES.map(name => [name, object({ support: { enum: ["built-in", "consumer", "not-applicable"] }, how: text, transition: text })]))),
  content: { type: "array", minItems: 1, items: object({ key: text, path: text, type: { const: "text" }, sample: text, guidance: text }, ["key", "path", "type", "sample"]) },
  intents: { type: "array", minItems: 1, uniqueItems: true, items: { enum: BEHAVIOR_INTENTS } },
  actions: { type: "array", items: object({ name: text, callback: text, responsibility: text }) },
  journey: object({ before: strings, after: strings }),
  responsive: object({ viewports: { type: "array", minItems: 1, uniqueItems: true, items: { enum: ["mobile", "tablet", "desktop"] } }, strategy: text, touchTargets: { const: "44px" } }),
  consumer: { ...strings, minItems: 1 },
})

/** Validate only the fixed schema subset above; never evaluate caller schemas/source. */
export function assertRegistryBehavior(value: unknown): asserts value is RegistryBehavior {
  const visit = (value: unknown, schema: Record<string, unknown>, location: string): void => {
    const fail = () => { throw new Error(`Invalid behavior contract at ${location}; expected schemaVersion 1 and its declared fields.`) }
    if ("const" in schema && value !== schema.const) fail()
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) fail()
    if (schema.type === "string" && (typeof value !== "string" || value.length < Number(schema.minLength ?? 0))) fail()
    if (schema.type === "array") {
      if (!Array.isArray(value) || value.length < Number(schema.minItems ?? 0)) return fail()
      if (schema.uniqueItems && new Set(value).size !== value.length) fail()
      for (const entry of value) visit(entry, schema.items as Record<string, unknown>, `${location}[]`)
    }
    if (schema.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) return fail()
      const data = value as Record<string, unknown>
      const properties = schema.properties as Record<string, Record<string, unknown>>
      if ((schema.required as string[]).some(key => !Object.hasOwn(data, key))) fail()
      if (schema.additionalProperties === false && Object.keys(data).some(key => !Object.hasOwn(properties, key))) fail()
      for (const [key, child] of Object.entries(properties)) if (Object.hasOwn(data, key)) visit(data[key], child, `${location}.${key}`)
    }
  }
  visit(value, BEHAVIOR_SCHEMA, "behavior")
}
