import { CHANGE_LIMITS } from "./change-plan.ts"
import { PROJECT_SNAPSHOT_SCHEMA } from "./project-context-schema.ts"
const text = { type: "string", minLength: 1, maxLength: 512 }
const path = { type: "string", minLength: 1, maxLength: CHANGE_LIMITS.pathLength }
const digest = { type: "string", pattern: "^[a-f0-9]{64}$" }
const content = { type: "string", maxLength: CHANGE_LIMITS.fileBytes }
const version = { type: "string", minLength: 1, maxLength: 128, pattern: "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }
const array = (items: Record<string, unknown>, maxItems: number) => ({ type: "array", items, maxItems })
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false })
/** Schemas expose structural bounds; the shared validator enforces UTF-8/path/hash semantics. */
export const CHANGE_INPUT_SCHEMA = object({
  schemaVersion: { const: 1 }, snapshot: PROJECT_SNAPSHOT_SCHEMA, registryVersion: version,
  candidates: { ...array(object({ path, content, reason: text }), CHANGE_LIMITS.operations), minItems: 1 },
  missingFiles: array(path, CHANGE_LIMITS.operations),
}, ["snapshot", "candidates"])
export const CHANGE_PLAN_SCHEMA = object({
  schemaVersion: { const: 1 }, id: digest, appRoot: path, registryVersion: version,
  operations: array({ oneOf: [
    object({ path, kind: { const: "create" }, beforeSha256: { type: "null" }, afterSha256: digest, content, reason: text }),
    object({ path, kind: { const: "update" }, beforeSha256: digest, afterSha256: digest, content, reason: text }),
  ] }, CHANGE_LIMITS.operations),
  dependencies: array(object({ name: { type: "string", minLength: 1, maxLength: 214 }, before: text, after: text }, ["name", "after"]), 1024),
  conflicts: array(object({ path, reason: text }), 2048),
  verification: array(object({ kind: { enum: ["static", "runtime"] }, check: text }), 16),
  unsupported: array(text, 2048),
})
