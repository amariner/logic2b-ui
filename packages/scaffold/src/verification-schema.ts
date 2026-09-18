import { VERIFICATION_LIMITS as LIMITS } from "./verification.ts"
const text = (maxLength = 512, minLength = 1) => ({ type: "string", minLength, maxLength })
const id = { type: "string", pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$" }
const digest = { type: "string", pattern: "^[a-f0-9]{64}$" }
const path = text(LIMITS.pathLength)
const integer = (minimum: number, maximum: number) => ({ type: "integer", minimum, maximum })
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false })
const array = (items: Record<string, unknown>, maxItems: number, minItems = 0) => ({ type: "array", items, minItems, maxItems })
const status = { enum: ["pass", "fail", "skipped", "unknown"] }
const kind = { enum: ["static", "browser-measured", "human-reviewed"] }
const selector = { oneOf: [object({ by: { const: "role" }, role: { ...text(32), pattern: "^[a-z]+$" }, name: text(256) }, ["by", "role"]), object({ by: { enum: ["label", "text", "test-id"] }, value: text(256) })] }
const check = (properties: Record<string, unknown>, required?: string[]) => object({ type: { const: "check" }, id, ...properties }, required ? ["type", "id", ...required] : undefined)
const step = { oneOf: [
  object({ type: { const: "action" }, action: { const: "click" }, target: selector }),
  object({ type: { const: "action" }, action: { enum: ["fill", "select", "press"] }, target: selector, value: text(2048, 0) }),
  object({ type: { const: "action" }, action: { const: "text-scale" }, value: integer(100, 300) }),
  check({ assertion: { enum: ["visible", "hidden", "enabled", "disabled", "focused"] }, target: selector }),
  check({ assertion: { enum: ["text", "value", "accessible-description"] }, target: selector, expected: text(2048, 0) }),
  check({ assertion: { const: "attribute" }, target: selector, name: { ...text(128), pattern: "^[a-zA-Z_:][a-zA-Z0-9_.:-]*$" }, expected: { anyOf: [text(2048, 0), { type: "null" }] } }),
  check({ assertion: { const: "count" }, target: selector, expected: integer(0, 10000) }),
  check({ assertion: { const: "order" }, target: selector, expected: array(text(2048, 0), 128) }),
  check({ assertion: { enum: ["overflow", "screenshot"] } }),
  check({ assertion: { const: "axe" }, disabledRules: { ...array(id, 64), uniqueItems: true } }, ["assertion"]),
] }
/** Schemas declare structural bounds; shared validation adds cross-reference and hash semantics. */
export const VERIFICATION_SUITE_SCHEMA = object({
  schemaVersion: { const: 1 }, projectFiles: { ...array(path, LIMITS.projectFiles, 1), uniqueItems: true }, planId: digest,
  viewports: array(object({ id, width: integer(240, 3840), height: integer(240, 3840) }), LIMITS.viewports, 1),
  scenarios: array(object({ id, route: text(512), steps: array(step, LIMITS.steps, 1) }), LIMITS.scenarios, 1),
}, ["schemaVersion", "projectFiles", "viewports", "scenarios"])
const resultProperties = { scenarioId: id, viewportId: id, checkId: id, kind, status, reason: text(), evidenceIds: { ...array(id, 16), uniqueItems: true } }
const run = object({ scenarioId: id, viewportId: id, status, reason: text(), failedStep: integer(0, LIMITS.steps - 1) }, ["scenarioId", "viewportId", "status", "reason"])
export const VERIFICATION_REPORT_SCHEMA = object({
  schemaVersion: { const: 1 }, origin: text(), suite: VERIFICATION_SUITE_SCHEMA, suiteSha256: digest,
  project: object({ scope: { const: "selected-files" }, fingerprint: digest, files: array(object({ path, sha256: digest }), LIMITS.projectFiles, 1), servedSourceBinding: { const: "unverified" } }),
  tools: array(object({ name: text(128), version: text(128) }), LIMITS.tools),
  runs: array(run, LIMITS.scenarios * LIMITS.viewports), checks: array(object(resultProperties), LIMITS.checks),
  evidence: array(object({ id, kind: { enum: ["log", "screenshot", "axe", "human-note", "static-result"] }, reference: text(1024), sha256: digest, tool: text(128) }), LIMITS.evidence),
  notes: array(text(), LIMITS.notes),
})
const counts = object({ pass: integer(0, LIMITS.checks), fail: integer(0, LIMITS.checks), skipped: integer(0, LIMITS.checks), unknown: integer(0, LIMITS.checks) })
export const VERIFICATION_SUMMARY_SCHEMA = object({
  schemaVersion: { const: 1 }, origin: text(), status, suiteSha256: digest, projectFingerprint: digest, planId: digest,
  expectedChecks: integer(1, LIMITS.checks), reportedChecks: integer(0, LIMITS.checks), counts, runCounts: counts,
  viewports: VERIFICATION_SUITE_SCHEMA.properties.viewports, tools: VERIFICATION_REPORT_SCHEMA.properties.tools, evidence: VERIFICATION_REPORT_SCHEMA.properties.evidence,
  runs: array(run, LIMITS.scenarios * LIMITS.viewports, 1),
  checks: array(object({ ...resultProperties, route: text(), assertion: { enum: ["visible", "hidden", "enabled", "disabled", "focused", "text", "value", "accessible-description", "attribute", "count", "order", "overflow", "screenshot", "axe"] }, disabledRules: { ...array(id, 64), uniqueItems: true } }, [...Object.keys(resultProperties), "route", "assertion"]), LIMITS.checks, 1),
  limitations: array(text(), 16, 1),
}, ["schemaVersion", "origin", "status", "suiteSha256", "projectFingerprint", "expectedChecks", "reportedChecks", "counts", "runCounts", "viewports", "tools", "evidence", "runs", "checks", "limitations"])
