import { parse } from "@babel/parser"
import { REVIEW_LIMITS, type ReviewFile } from "./contract.ts"
export interface AstNode {
  type: string
  start: number
  end: number
  loc?: { start: { line: number; column: number } }
  [key: string]: unknown
}
export interface ParsedFile {
  file: ReviewFile
  nodes: AstNode[]
  parents: Map<AstNode, AstNode>
  comments: AstNode[]
  error?: { line: number; column: number; reason: string }
}
export function node(value: unknown): AstNode | undefined {
  return value && typeof value === "object" && "type" in value && typeof value.type === "string" ? value as AstNode : undefined
}
export const list = (value: unknown): AstNode[] => Array.isArray(value) ? value.map(node).filter((item): item is AstNode => !!item) : []
export const position = (value: AstNode) => ({ line: value.loc?.start.line ?? 1, column: (value.loc?.start.column ?? 0) + 1 })
/** Parse source as data; no transform, imports, filesystem resolution or execution. */
export function parseReviewFile(file: ReviewFile, budget: number = REVIEW_LIMITS.nodes): ParsedFile {
  const result: ParsedFile = { file, nodes: [], parents: new Map(), comments: [] }
  if (budget <= 0) { result.error = { line: 1, column: 1, reason: "AST node budget exceeded; this file was not reviewed." }; return result }
  try {
    const ast = parse(file.content, { sourceType: "unambiguous", plugins: file.path.endsWith(".tsx") ? ["typescript", "jsx"] : ["jsx"], errorRecovery: false, attachComment: false })
    result.comments = (ast.comments ?? []) as unknown as AstNode[]
    const stack = [{ value: ast.program as unknown as AstNode, parent: undefined as AstNode | undefined }]
    while (stack.length) {
      const { value, parent } = stack.pop()!
      if (result.nodes.length >= budget) {
        result.error = { ...position(value), reason: "AST node budget exceeded; this file was not reviewed." }
        result.nodes = []; result.parents.clear(); return result
      }
      result.nodes.push(value)
      if (parent) result.parents.set(value, parent)
      for (const [key, child] of Object.entries(value)) {
        if (["loc", "extra", "comments", "leadingComments", "trailingComments", "innerComments"].includes(key)) continue
        const children = Array.isArray(child) ? list(child) : node(child) ? [node(child)!] : []
        for (let i = children.length - 1; i >= 0; i--) stack.push({ value: children[i], parent: value })
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
export function tag(element: AstNode): string | undefined {
  const opening = node(element.openingElement)
  const name = node(opening?.name)
  return name?.type === "JSXIdentifier" ? String(name.name) : undefined
}
export function attributes(element: AstNode) {
  return list(node(element.openingElement)?.attributes)
}
export function attribute(element: AstNode, name: string): AstNode | undefined {
  return attributes(element).find(attr => node(attr.name)?.name === name)
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
