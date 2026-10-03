export * from "./contract.ts"
export { RULES } from "./rules.ts"
import { REVIEW_LIMITS, validateReview, type ReviewFinding, type ReviewResult, type ReviewUnknown, type RuleId } from "./contract.ts"
import { MAX_REVIEW_WORK, ReviewWorkLimitError, parseReviewFile, spend } from "./parse.ts"
import { reviewTokens } from "./tokens.ts"
import { reviewNames } from "./a11y.ts"
import { RULES } from "./rules.ts"

export function reviewUi(raw: unknown): ReviewResult {
  const request = validateReview(raw)
  const result: ReviewResult = { schemaVersion: 1, summary: { errors: 0, warnings: 0, info: 0 }, findings: [], unknowns: [], suppressed: [], evaluatedRules: [], disabledRules: [], assumptions: ["Static authored JSX is evidence, not a runtime accessibility certificate. CSS, portals, caller ancestors and external component implementations are not evaluated.", "Missing names are defects only when the host explicitly declares complete label context. Do not make that declaration for an unresolved composition."], truncated: false }
  const enabled = (Object.keys(RULES) as RuleId[]).filter(id => request.scope!.includes(RULES[id].scope) && (id !== "L2B-TOK-001" || request.policy?.semanticColors === true))
  for (const id of Object.keys(RULES) as RuleId[]) if (!enabled.includes(id)) result.disabledRules.push({ rule: id, reason: id === "L2B-TOK-001" && request.policy?.semanticColors !== true ? "Semantic color policy was not explicitly enabled." : "Rule scope was not requested." })
  let remaining: number = REVIEW_LIMITS.nodes
  const work = { remaining: MAX_REVIEW_WORK }
  const evaluated = new Set<RuleId>()
  for (const file of request.files) {
    if (work.remaining <= 0) { result.truncated = true; result.unknowns.push({ file: file.path, rule: "parse", line: 1, column: 1, reason: "Shared static analysis work budget exhausted; submit this file in a smaller review." }); continue }
    const parsed = parseReviewFile(file, remaining, work)
    if (parsed.error) { result.unknowns.push({ file: file.path, rule: "parse", ...parsed.error }); if (parsed.error.reason.startsWith("AST")) result.truncated = true; if (parsed.error.reason.startsWith("AST node budget")) remaining = 0; continue }
    remaining -= parsed.nodes.length
    const findings: ReviewFinding[] = []
    const unknowns: ReviewUnknown[] = []
    const suppressions: Array<{ line: number; rule: string; reason: string }> = []
    try {
      if (enabled.includes("L2B-TOK-001")) { const checked = reviewTokens(parsed); findings.push(...checked.findings); unknowns.push(...checked.unknowns) }
      if (request.scope!.includes("a11y")) { const checked = reviewNames(parsed); findings.push(...checked.findings); unknowns.push(...checked.unknowns) }
      for (const comment of parsed.comments) {
        spend(parsed, Math.max(1, Math.ceil(String(comment.value).length / 64)))
        const match = String(comment.value).trim().match(/^logic2b-review-disable-next-line (L2B-[A-Z0-9]+-\d{3}) -- (\S.{2,199})$/)
        if (match && Object.hasOwn(RULES, match[1])) suppressions.push({ line: (comment.loc?.end?.line ?? comment.loc?.start.line ?? 1) + 1, rule: match[1], reason: match[2] })
        if (suppressions.length > REVIEW_LIMITS.suppressions) break
      }
    } catch (error) {
      if (!(error instanceof ReviewWorkLimitError)) throw error
      result.truncated = true
      result.unknowns.push({ file: file.path, rule: "parse", line: 1, column: 1, reason: "Static analysis work budget exceeded; partial findings for this file were discarded. Simplify the source or review fewer files." })
      continue
    }
    for (const id of enabled) evaluated.add(id)
    result.unknowns.push(...unknowns)
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
