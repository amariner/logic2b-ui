import { REVIEW_LIMITS, REVIEW_SCOPES, RULES } from "@logic2b/review"

const string = { type: "string" }
const rule = { type: "string", enum: Object.keys(RULES) }
const position = { type: "integer", minimum: 1 }
const count = { type: "integer", minimum: 0, maximum: REVIEW_LIMITS.findings }
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: "object" as const, additionalProperties: false, properties, required,
})
const array = (items: Record<string, unknown>, maxItems: number = REVIEW_LIMITS.findings) => ({ type: "array", items, maxItems })

export const REVIEW_INPUT_SCHEMA = object({
  schemaVersion: { type: "integer", const: 1 },
  files: { type: "array", minItems: 1, maxItems: REVIEW_LIMITS.files, items: object({
    path: { type: "string", maxLength: REVIEW_LIMITS.pathLength, description: "Normalized project-relative .tsx or .jsx path; no private or dependency directories." },
    content: { type: "string", maxLength: REVIEW_LIMITS.sourceBytes, description: "Source data only; at most 256 KiB of UTF-8 source across all files. Never executed." },
    labelContext: { type: "string", enum: ["partial", "complete"], description: "Default partial. Declare complete only if the supplied composition resolves all external and ancestor labeling context; missing accessible names otherwise remain unknown." },
  }, ["path", "content"]) },
  scope: { type: "array", minItems: 1, maxItems: REVIEW_SCOPES.length, uniqueItems: true, items: { type: "string", enum: REVIEW_SCOPES } },
  policy: object({ semanticColors: { type: "boolean", description: "Explicitly enable semantic color design policy. Disabled by default." } }, []),
}, ["files"])

const finding = object({
  rule,
  severity: { type: "string", enum: ["error", "warning", "info"] },
  category: { type: "string", enum: ["defect", "design-policy", "heuristic"] },
  confidence: { type: "string", enum: ["high", "medium", "low"] },
  evidence: array(string),
  file: { type: "string", maxLength: REVIEW_LIMITS.pathLength },
  line: position, column: position, message: string, fix: string, docs: string,
})

export const REVIEW_OUTPUT_SCHEMA = object({
  schemaVersion: { type: "integer", const: 1 },
  summary: object({ errors: count, warnings: count, info: count }),
  findings: array(finding),
  unknowns: array(object({
    file: { type: "string", maxLength: REVIEW_LIMITS.pathLength },
    rule: { type: "string", enum: [...Object.keys(RULES), "parse", "a11y"] },
    line: position, column: position, reason: string,
  })),
  suppressed: array(object({ finding, reason: string })),
  evaluatedRules: { ...array(rule, Object.keys(RULES).length), uniqueItems: true },
  disabledRules: array(object({ rule, reason: string }), Object.keys(RULES).length),
  assumptions: array(string),
  truncated: { type: "boolean" },
})
