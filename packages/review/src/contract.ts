/** Public source and result budgets. Byte limits are UTF-8, not JS string length. */
export const REVIEW_LIMITS = Object.freeze({ files: 64, path: 256, fileBytes: 128 * 1024, totalBytes: 256 * 1024, suppressions: 256, findings: 512, outputBytes: 512 * 1024, astNodes: 50000, astDepth: 256, analysisSteps: 250000 })
export const REVIEW_RULES = [
  { id: 'L2B-A11Y-001', severity: 'error', category: 'defect', title: 'Dialog accessible name', description: 'Native dialogs and literal dialog roles need a provable accessible name.', fix: 'Give the dialog aria-label or aria-labelledby pointing to its title.', docs: 'https://ui.logic2b.com/docs/review#l2b-a11y-001' },
  { id: 'L2B-A11Y-002', severity: 'error', category: 'defect', title: 'Form-control accessible name', description: 'Native input, select and textarea controls need an accessible name.', fix: 'Add a native label associated by htmlFor/id or wrap the control in a label; aria-label is also supported.', docs: 'https://ui.logic2b.com/docs/review#l2b-a11y-002' },
  { id: 'L2B-A11Y-003', severity: 'error', category: 'defect', title: 'Button accessible name', description: 'Native buttons need nonempty accessible text or another naming mechanism.', fix: 'Add visible text, a visually hidden text span, or an aria-label describing the action.', docs: 'https://ui.logic2b.com/docs/review#l2b-a11y-003' },
  { id: 'L2B-TOK-001', severity: 'warning', category: 'design-policy', title: 'Semantic color policy', description: 'When semanticColors is explicitly enabled, recognized literal hardcoded colors violate that project policy.', fix: 'Use a semantic color utility such as bg-primary or text-muted-foreground, or a CSS variable from the project theme.', docs: 'https://ui.logic2b.com/docs/review#l2b-tok-001' },
] as const
export type ReviewRule = typeof REVIEW_RULES[number]['id']
export type ReviewSeverity = 'error' | 'warning' | 'info'
export interface ReviewRequest { schemaVersion: 1; files: Array<{ path: string; content: string }>; policy?: { semanticColors?: boolean }; suppressions?: Array<{ file: string; rule: ReviewRule; line: number; reason: string }> }
export interface ReviewFinding { rule: ReviewRule; severity: ReviewSeverity; category: 'defect' | 'design-policy'; confidence: 'high'; evidence: string[]; file: string; line: number; column: number; message: string; fix: string; docs: string }
export interface ReviewUnknown { rule: ReviewRule; file: string; line: number; column: number; reason: string }
export interface ReviewResult { schemaVersion: 1; engineVersion: '1'; summary: { errors: number; warnings: number; info: number }; findings: ReviewFinding[]; unknowns: ReviewUnknown[]; suppressed: Array<{ finding: ReviewFinding; reason: string }>; evaluatedRules: ReviewRule[]; limitations: string[] }
export const utf8Bytes = (value: string) => new TextEncoder().encode(value).byteLength
const ruleIds = REVIEW_RULES.map(rule => rule.id)
function fail(message: string): never { throw new Error(message) }
function record(value: unknown, allowed: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label} must be a JSON object.`)
  const result = value as Record<string, unknown>
  if (Object.keys(result).some(key => !allowed.includes(key))) fail(`${label} contains unsupported fields.`)
  return result
}
function path(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value || value.length > REVIEW_LIMITS.path || /[\\:\u0000-\u001f\u007f]/.test(value) || value.startsWith('/') || value.split('/').some(part => !part || part === '.' || part === '..') || !/\.(tsx|jsx)$/.test(value)) fail('Review paths must be safe relative .tsx/.jsx paths of at most 256 characters, without traversal, backslashes or control characters.')
}
/** Accepts JSON-shaped input only. Source is never evaluated, imported or fetched. */
export function validateReviewRequest(value: unknown): asserts value is ReviewRequest {
  const input = record(value, ['schemaVersion', 'files', 'policy', 'suppressions'], 'Review request')
  if (input.schemaVersion !== 1) fail('Unsupported review schemaVersion; use 1.')
  if (!Array.isArray(input.files) || !input.files.length || input.files.length > REVIEW_LIMITS.files) fail('Review files must contain between 1 and 64 files; split larger reviews.')
  const names = new Set<string>(), folded = new Set<string>(); let total = 0
  for (const value of input.files) {
    const file = record(value, ['path', 'content'], 'Review file'); path(file.path)
    if (folded.has(file.path.toLowerCase())) fail('Review file paths must be unique, including case-insensitive collisions.')
    names.add(file.path); folded.add(file.path.toLowerCase())
    if (typeof file.content !== 'string') fail('Review file content must be a string.')
    const size = utf8Bytes(file.content)
    if (size > REVIEW_LIMITS.fileBytes) fail('Review file exceeds 128 KiB UTF-8; supply a smaller source file.')
    total += size
  }
  if (total > REVIEW_LIMITS.totalBytes) fail('Review source exceeds 256 KiB UTF-8; split the review into smaller batches.')
  if (input.policy !== undefined) {
    const policy = record(input.policy, ['semanticColors'], 'Review policy')
    if (policy.semanticColors !== undefined && typeof policy.semanticColors !== 'boolean') fail('semanticColors policy must be a boolean.')
  }
  if (input.suppressions !== undefined) {
    if (!Array.isArray(input.suppressions) || input.suppressions.length > REVIEW_LIMITS.suppressions) fail('Review suppressions must be an array of at most 256 entries.')
    const seen = new Set<string>()
    for (const value of input.suppressions) {
      const suppression = record(value, ['file', 'rule', 'line', 'reason'], 'Review suppression'); path(suppression.file)
      if (!names.has(suppression.file)) fail('Suppression file must be included in this review.')
      if (!ruleIds.includes(suppression.rule as ReviewRule)) fail('Suppression rule must be a supported L2B rule id.')
      if (!Number.isSafeInteger(suppression.line) || (suppression.line as number) < 1) fail('Suppression line must be a positive integer.')
      if (typeof suppression.reason !== 'string' || suppression.reason.length < 12 || suppression.reason.length > 512 || /[\u0000-\u001f\u007f]/.test(suppression.reason) || suppression.reason.trim().split(/\s+/).length < 3 || (suppression.reason.match(/\p{L}/gu)?.length ?? 0) < 8) fail('Suppression reason must explain the exception in at least 3 words and 12–512 characters.')
      const key = JSON.stringify([suppression.file, suppression.rule, suppression.line])
      if (seen.has(key)) fail('Duplicate suppression for the same file, rule and line.'); seen.add(key)
    }
  }
}
const pathSchema = { type: 'string', minLength: 1, maxLength: 256, pattern: '^(?!/)(?!.*[\\\\:\\u0000-\\u001f\\u007f])(?!.*(?:^|/)(?:\\.|\\.\\.)(?:/|$))(?!.*//).+\\.(tsx|jsx)$' }
const ruleSchema = { type: 'string', enum: ruleIds }
const locationSchema = { file: pathSchema, line: { type: 'integer', minimum: 1 }, column: { type: 'integer', minimum: 1 } }
const reasonSchema = { type: 'string', minLength: 12, maxLength: 512 }
export const REVIEW_INPUT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['schemaVersion', 'files'], properties: {
    schemaVersion: { const: 1 }, files: { type: 'array', minItems: 1, maxItems: 64, items: { type: 'object', additionalProperties: false, required: ['path', 'content'], properties: { path: pathSchema, content: { type: 'string', maxLength: 131072 } } } },
    policy: { type: 'object', additionalProperties: false, properties: { semanticColors: { type: 'boolean' } } },
    suppressions: { type: 'array', maxItems: 256, items: { type: 'object', additionalProperties: false, required: ['file', 'rule', 'line', 'reason'], properties: { file: pathSchema, rule: ruleSchema, line: { type: 'integer', minimum: 1 }, reason: reasonSchema } } },
  },
} as const
const findingSchema = { type: 'object', additionalProperties: false, required: ['rule', 'severity', 'category', 'confidence', 'evidence', 'file', 'line', 'column', 'message', 'fix', 'docs'], properties: { rule: ruleSchema, severity: { enum: ['error', 'warning', 'info'] }, category: { enum: ['defect', 'design-policy'] }, confidence: { const: 'high' }, evidence: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', maxLength: 512 } }, ...locationSchema, message: { type: 'string', maxLength: 512 }, fix: { type: 'string', maxLength: 512 }, docs: { type: 'string', maxLength: 256 } } }
export const REVIEW_RESULT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['schemaVersion', 'engineVersion', 'summary', 'findings', 'unknowns', 'suppressed', 'evaluatedRules', 'limitations'], properties: {
    schemaVersion: { const: 1 }, engineVersion: { const: '1' },
    summary: { type: 'object', additionalProperties: false, required: ['errors', 'warnings', 'info'], properties: { errors: { type: 'integer', minimum: 0 }, warnings: { type: 'integer', minimum: 0 }, info: { type: 'integer', minimum: 0 } } },
    findings: { type: 'array', maxItems: 512, items: findingSchema },
    unknowns: { type: 'array', maxItems: 512, items: { type: 'object', additionalProperties: false, required: ['rule', 'file', 'line', 'column', 'reason'], properties: { rule: ruleSchema, ...locationSchema, reason: { type: 'string', maxLength: 512 } } } },
    suppressed: { type: 'array', maxItems: 512, items: { type: 'object', additionalProperties: false, required: ['finding', 'reason'], properties: { finding: findingSchema, reason: reasonSchema } } },
    evaluatedRules: { type: 'array', maxItems: 4, uniqueItems: true, items: ruleSchema },
    limitations: { type: 'array', maxItems: 16, items: { type: 'string', maxLength: 512 } },
  },
} as const
