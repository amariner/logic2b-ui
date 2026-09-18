export * from "./contract.ts"
export { RULES } from "./rules.ts"
import { REVIEW_LIMITS, validateReview, type ReviewFinding, type ReviewResult, type RuleId } from "./contract.ts"
import { parseReviewFile } from "./parse.ts"
import { reviewTokens } from "./tokens.ts"
import { reviewNames } from "./a11y.ts"
import { RULES } from "./rules.ts"

export function reviewUi(raw: unknown): ReviewResult {
  const request = validateReview(raw)
  const result: ReviewResult = { schemaVersion: 1, summary: { errors: 0, warnings: 0, info: 0 }, findings: [], unknowns: [], suppressed: [], evaluatedRules: [], disabledRules: [], assumptions: ["Static authored JSX is evidence, not a runtime accessibility certificate. CSS, portals, caller ancestors and external component implementations are not evaluated.", "Missing names are defects only when the host explicitly declares complete label context. Do not make that declaration for an unresolved composition."], truncated: false }
  const enabled = (Object.keys(RULES) as RuleId[]).filter(id => request.scope!.includes(RULES[id].scope) && (id !== "L2B-TOK-001" || request.policy?.semanticColors === true))
  for (const id of Object.keys(RULES) as RuleId[]) if (!enabled.includes(id)) result.disabledRules.push({ rule: id, reason: id === "L2B-TOK-001" && request.policy?.semanticColors !== true ? "Semantic color policy was not explicitly enabled." : "Rule scope was not requested." })
  let remaining: number = REVIEW_LIMITS.nodes
  const evaluated = new Set<RuleId>()
  for (const file of request.files) {
    const parsed = parseReviewFile(file, remaining)
    if (parsed.error) { result.unknowns.push({ file: file.path, rule: "parse", ...parsed.error }); if (parsed.error.reason.startsWith("AST node budget")) { result.truncated = true; remaining = 0 } continue }
    remaining -= parsed.nodes.length
    const findings: ReviewFinding[] = []
    if (enabled.includes("L2B-TOK-001")) { const checked = reviewTokens(parsed); findings.push(...checked.findings); result.unknowns.push(...checked.unknowns) }
    if (request.scope!.includes("a11y")) { const checked = reviewNames(parsed); findings.push(...checked.findings); result.unknowns.push(...checked.unknowns) }
    for (const id of enabled) evaluated.add(id)
    const suppressions = parsed.comments.flatMap(comment => {
      const match = String(comment.value).trim().match(/^logic2b-review-disable-next-line (L2B-[A-Z]+-\d{3}) -- (\S.{2,199})$/)
      return match && Object.hasOwn(RULES, match[1]) ? [{ line: file.content.slice(0, comment.end).split(/\r\n?|\n|\u2028|\u2029/).length + 1, rule: match[1], reason: match[2] }] : []
    })
    if (suppressions.length > REVIEW_LIMITS.suppressions) { result.truncated = true; result.unknowns.push({ file: file.path, rule: "parse", line: 1, column: 1, reason: "Suppression limit exceeded; findings in this file were not suppressed." }) }
    for (const finding of findings) {
      const suppression = suppressions.length <= REVIEW_LIMITS.suppressions ? suppressions.find(s => s.line === finding.line && s.rule === finding.rule) : undefined
      if (suppression) result.suppressed.push({ finding, reason: suppression.reason })
      else result.findings.push(finding)
    }
  }
  const order = (a: { file: string; line: number; column: number; rule: string }, b: { file: string; line: number; column: number; rule: string }) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule)
  result.findings.sort(order); result.unknowns.sort(order); result.suppressed.sort((a,b) => order(a.finding,b.finding))
  for (const key of ["findings", "unknowns", "suppressed"] as const) if (result[key].length > REVIEW_LIMITS.findings) { result.truncated = true; result[key].splice(REVIEW_LIMITS.findings) }
  for (const finding of result.findings) result.summary[finding.severity === "error" ? "errors" : finding.severity === "warning" ? "warnings" : "info"]++
  result.evaluatedRules = [...evaluated].sort()
  return result
}
