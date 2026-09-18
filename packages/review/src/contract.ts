export const REVIEW_LIMITS = { files: 64, sourceBytes: 256 * 1024, pathLength: 256, nodes: 50000, findings: 512, suppressions: 128 } as const
export const REVIEW_SCOPES = ["tokens", "a11y"] as const
export type ReviewScope = typeof REVIEW_SCOPES[number]
export type RuleId = "L2B-TOK-001" | "L2B-A11Y-001" | "L2B-A11Y-002" | "L2B-A11Y-003"
export interface ReviewFile {
  path: string
  content: string
  /** Explicit evidence boundary, not inferred from supplying one file. */
  labelContext?: "partial" | "complete"
}
export interface ReviewRequest {
  schemaVersion?: 1
  files: ReviewFile[]
  scope?: ReviewScope[]
  policy?: { semanticColors?: boolean }
}
export interface ReviewFinding {
  rule: RuleId
  severity: "error" | "warning" | "info"
  category: "defect" | "design-policy" | "heuristic"
  confidence: "high" | "medium" | "low"
  evidence: string[]
  file: string
  line: number
  column: number
  message: string
  fix: string
  docs: string
}
export interface ReviewUnknown { file: string; rule: RuleId | "parse" | "a11y"; line: number; column: number; reason: string }
export interface ReviewResult {
  schemaVersion: 1
  summary: { errors: number; warnings: number; info: number }
  findings: ReviewFinding[]
  unknowns: ReviewUnknown[]
  suppressed: { finding: ReviewFinding; reason: string }[]
  evaluatedRules: RuleId[]
  disabledRules: { rule: RuleId; reason: string }[]
  assumptions: string[]
  truncated: boolean
}
export class ReviewInputError extends Error { override name = "ReviewInputError" }
const fail = (message: string): never => { throw new ReviewInputError(message) }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
const bytes = (text: string) => new TextEncoder().encode(text).length
export function validateReview(raw: unknown): ReviewRequest {
  if (!object(raw) || (raw.schemaVersion !== undefined && raw.schemaVersion !== 1)) return fail("Expected a version-1 review request.")
  if (Object.keys(raw).some(key => !["schemaVersion", "files", "scope", "policy"].includes(key))) return fail("Unsupported review request field.")
  if (!Array.isArray(raw.files) || raw.files.length < 1 || raw.files.length > REVIEW_LIMITS.files) return fail("Review requires 1–64 explicit TSX/JSX files.")
  let total = 0
  const paths = new Set<string>()
  const files = raw.files.map(file => {
    if (!object(file) || typeof file.path !== "string" || typeof file.content !== "string") return fail("Each review file needs a relative path and source string.")
    if (Object.keys(file).some(key => !["path", "content", "labelContext"].includes(key))) return fail("Unsupported review file field.")
    const path = file.path
    if (path.length > REVIEW_LIMITS.pathLength || !/\.(?:tsx|jsx)$/.test(path) || /[\\\x00-\x1f\x7f:]/.test(path) || path.startsWith("/") || path.split("/").some(part => ["", ".", "..", ".git", "node_modules", ".env"].includes(part))) return fail("Review paths must be normalized project-relative TSX/JSX paths outside private/dependency directories.")
    if (paths.has(path)) return fail("Duplicate review path.")
    paths.add(path)
    if (file.content.length > REVIEW_LIMITS.sourceBytes) return fail("Review source exceeds the 256 KiB total limit.")
    total += bytes(file.content)
    if (total > REVIEW_LIMITS.sourceBytes) return fail("Review source exceeds the 256 KiB total limit.")
    if (file.labelContext !== undefined && file.labelContext !== "complete" && file.labelContext !== "partial") return fail("labelContext must be partial or complete.")
    return { path, content: file.content, labelContext: file.labelContext as ReviewFile["labelContext"] }
  })
  if (raw.scope !== undefined && !Array.isArray(raw.scope)) return fail("Review scope must be an array.")
  const scope = raw.scope ?? [...REVIEW_SCOPES]
  if (!Array.isArray(scope) || scope.length < 1 || scope.length > REVIEW_SCOPES.length || new Set(scope).size !== scope.length || scope.some(value => !REVIEW_SCOPES.includes(value))) return fail("Choose distinct supported review scopes: tokens, a11y.")
  let policy: ReviewRequest["policy"]
  if (raw.policy !== undefined) {
    if (!object(raw.policy) || Object.keys(raw.policy).some(key => key !== "semanticColors") || (raw.policy.semanticColors !== undefined && typeof raw.policy.semanticColors !== "boolean")) return fail("Review policy only accepts an explicit semanticColors boolean.")
    policy = { semanticColors: raw.policy.semanticColors as boolean | undefined }
  }
  return { schemaVersion: 1, files, scope: scope as ReviewScope[], policy }
}
