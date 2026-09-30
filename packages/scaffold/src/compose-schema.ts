import { BEHAVIOR_STATES } from "./behavior.ts"
import { COMPOSE_LIMITS } from "./compose.ts"
const text = { type: "string", minLength: 1, maxLength: COMPOSE_LIMITS.text }
const strings = (max: number, min = 0) => ({ type: "array", items: text, uniqueItems: true, minItems: min, maxItems: max })
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false })
const array = (items: Record<string, unknown>, maxItems: number) => ({ type: "array", items, maxItems })
const note = { type: "string" }
const notes = { type: "array", items: note }
const version = { type: "string", pattern: "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }
const icon = { enum: ["lucide", "tabler", "phosphor", "hugeicons"] }
export const COMPOSE_INPUT_SCHEMA = object({
  schemaVersion: { const: 1 },
  requirements: { ...array(object({ id: { ...text, pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*$" }, route: { type: "string", maxLength: COMPOSE_LIMITS.route, pattern: "^/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?$" }, task: text, roles: strings(COMPOSE_LIMITS.roles, 1), requiredStates: { ...strings(BEHAVIOR_STATES.length), items: { enum: BEHAVIOR_STATES } }, actions: strings(COMPOSE_LIMITS.actions) }), COMPOSE_LIMITS.requirements), minItems: 1 },
  brief: { type: "string", minLength: 1, maxLength: COMPOSE_LIMITS.brief },
  stack: { enum: ["next", "vite", "astro"] }, locale: { type: "string", minLength: 1, maxLength: 64 },
  version: { type: "string", minLength: 1, maxLength: 64 },
  preset: { type: "string", minLength: 1, maxLength: 256 }, output: { enum: ["metadata", "project"] },
  constraints: object({ mustInclude: strings(COMPOSE_LIMITS.constraints), avoid: strings(COMPOSE_LIMITS.constraints), maxPages: { type: "integer", minimum: 1, maximum: COMPOSE_LIMITS.pages } }, []),
}, ["requirements"])
export const COMPOSE_PLAN_SCHEMA = object({
  schemaVersion: { const: 1 }, registryVersion: version, stack: { enum: ["next", "vite", "astro"] }, locale: note,
  preset: { type: "string", maxLength: 256 },
  project: { anyOf: [{ type: "null" }, object({
    schemaVersion: { const: 1 }, registryVersion: version, framework: { enum: ["next", "vite", "astro"] }, projectName: text, preset: { type: "string", maxLength: 256 }, iconLibrary: icon,
    items: array(object({ name: text, title: note, requested: { type: "boolean" }, version, integrity: note, files: notes }, ["name", "title", "requested", "version", "integrity", "files"]), COMPOSE_LIMITS.items),
    files: array(object({ path: { type: "string", minLength: 1, maxLength: 512 }, content: note }), 512),
    commands: object({ npm: note, pnpm: note, yarn: note, bun: note }), notes,
  }, ["schemaVersion", "registryVersion", "framework", "projectName", "iconLibrary", "items", "files", "commands", "notes"])] },
  coverage: array(object({ requirementId: text, status: { enum: ["covered", "partial", "gap"] }, evidence: notes }), COMPOSE_LIMITS.requirements),
  pages: array(object({ route: note, purpose: text, sections: array(object({
    item: text, role: text, requirementIds: strings(COMPOSE_LIMITS.requirements, 1), why: note, contentSlots: notes,
    states: object(Object.fromEntries(BEHAVIOR_STATES.map(state => [state, { enum: ["built-in", "consumer", "not-applicable", "unknown"] }]))),
    actions: { type: "array", items: object({ name: note, callback: note, responsibility: note }) }, consumer: notes,
    accessibility: object({ status: { enum: ["declared", "unknown"] }, consumer: notes, limitations: notes }),
  }), COMPOSE_LIMITS.requirements * COMPOSE_LIMITS.roles) }), COMPOSE_LIMITS.pages),
  items: strings(COMPOSE_LIMITS.items),
  gaps: { type: "array", items: object({ requirementId: text, need: note, suggestion: note, primitives: strings(COMPOSE_LIMITS.items) }, ["need", "suggestion", "primitives"]) },
  next: object({ install: { anyOf: [{ type: "null" }, object({ items: strings(COMPOSE_LIMITS.items, 1), version, iconLibrary: icon }, ["items", "version"])] } }),
  confidence: { enum: ["high", "medium", "low"] }, notes,
}, ["schemaVersion", "registryVersion", "stack", "locale", "coverage", "pages", "items", "gaps", "next", "confidence", "notes"])
