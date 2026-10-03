import { parse } from "@babel/parser"
import { REVIEW_LIMITS, type ReviewFile } from "./contract.ts"
export interface AstNode {
  type: string
  start: number
  end: number
  loc?: { start: { line: number; column: number }; end?: { line: number; column: number } }
  [key: string]: unknown
}
export interface ParsedFile {
  file: ReviewFile
  nodes: AstNode[]
  parents: Map<AstNode, AstNode>
  comments: AstNode[]
  work: WorkBudget
  error?: { line: number; column: number; reason: string }
}
// Internal safeguards; public source limits and result contracts stay unchanged.
export const MAX_AST_DEPTH = 256
export const MAX_REVIEW_WORK = 250000
export interface WorkBudget { remaining: number }
export class ReviewWorkLimitError extends Error {}
export function spend(parsed: ParsedFile, amount = 1): void {
  parsed.work.remaining -= amount
  if (parsed.work.remaining < 0) throw new ReviewWorkLimitError("Static analysis work budget exceeded.")
}
export function node(value: unknown): AstNode | undefined {
  return value && typeof value === "object" && "type" in value && typeof value.type === "string" ? value as AstNode : undefined
}
export const list = (value: unknown): AstNode[] => Array.isArray(value) ? value.map(node).filter((item): item is AstNode => !!item) : []
export const position = (value: AstNode) => ({ line: value.loc?.start.line ?? 1, column: (value.loc?.start.column ?? 0) + 1 })
/** Parse source as data; no transform, imports, filesystem resolution or execution. */
export function parseReviewFile(file: ReviewFile, budget: number = REVIEW_LIMITS.nodes, work: WorkBudget = { remaining: MAX_REVIEW_WORK }): ParsedFile {
  const result: ParsedFile = { file, nodes: [], parents: new Map(), comments: [], work }
  if (budget <= 0) { result.error = { line: 1, column: 1, reason: "AST node budget exceeded; this file was not reviewed." }; return result }
  try {
    const ast = parse(file.content, { sourceType: "unambiguous", plugins: file.path.endsWith(".tsx") ? ["typescript", "jsx"] : ["jsx"], errorRecovery: false, attachComment: false })
    result.comments = (ast.comments ?? []) as unknown as AstNode[]
    const stack = [{ value: ast.program as unknown as AstNode, parent: undefined as AstNode | undefined, depth: 0 }]
    while (stack.length) {
      const { value, parent, depth } = stack.pop()!
      if (result.nodes.length >= budget || depth > MAX_AST_DEPTH) {
        result.error = { ...position(value), reason: depth > MAX_AST_DEPTH ? "AST depth budget exceeded; this file was not reviewed." : "AST node budget exceeded; this file was not reviewed." }
        result.nodes = []; result.parents.clear(); return result
      }
      result.nodes.push(value)
      if (parent) result.parents.set(value, parent)
      for (const [key, child] of Object.entries(value)) {
        if (["loc", "extra", "comments", "leadingComments", "trailingComments", "innerComments"].includes(key)) continue
        const children = Array.isArray(child) ? list(child) : node(child) ? [node(child)!] : []
        for (let i = children.length - 1; i >= 0; i--) stack.push({ value: children[i], parent: value, depth: depth + 1 })
      }
    }
    result.nodes.sort((a,b) => a.start - b.start || a.end - b.end)
  } catch (error) {
    const loc = (error as { loc?: { line?: number; column?: number } }).loc
    result.error = { line: loc?.line ?? 1, column: (loc?.column ?? 0) + 1, reason: "Source could not be parsed as supported TSX/JSX; no rules were evaluated for this file." }
    result.nodes = []; result.parents.clear()
  }
  return result
}
const tagCache = new WeakMap<AstNode, string | null>()
export function tag(element: AstNode): string | undefined {
  const cached = tagCache.get(element)
  if (cached !== undefined) return cached ?? undefined
  const opening = node(element.openingElement)
  const name = node(opening?.name)
  const result = name?.type === "JSXIdentifier" ? String(name.name) : undefined
  tagCache.set(element, result ?? null)
  return result
}
const attributesCache = new WeakMap<AstNode, AstNode[]>()
const attributeIndex = new WeakMap<AstNode, Map<string, AstNode>>()
export function attributes(element: AstNode) {
  const cached = attributesCache.get(element)
  if (cached) return cached
  const result = list(node(element.openingElement)?.attributes)
  attributesCache.set(element, result)
  return result
}
export function attribute(element: AstNode, name: string): AstNode | undefined {
  let index = attributeIndex.get(element)
  if (!index) {
    index = new Map()
    for (const attr of attributes(element)) {
      const key = node(attr.name)?.name
      if (typeof key === "string" && !index.has(key)) index.set(key, attr)
    }
    attributeIndex.set(element, index)
  }
  return index.get(name)
}
export function literal(value: unknown, depth = 0): string | undefined {
  if (depth > 100) return undefined
  const n = node(value)
  if (!n) return undefined
  if (n.type === "JSXExpressionContainer" || ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "ParenthesizedExpression"].includes(n.type)) return literal(n.expression, depth + 1)
  if (["StringLiteral", "NumericLiteral"].includes(n.type)) return String(n.value)
  if (n.type === "TemplateLiteral" && list(n.expressions).length === 0) return list(n.quasis).map(q => (q.value as { cooked: string }).cooked).join("")
  return undefined
}
