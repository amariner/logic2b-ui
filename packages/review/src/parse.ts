import { parse } from '@babel/parser'
import { REVIEW_LIMITS } from './contract.ts'
/** Structural AST view avoids importing a second runtime visitor/type package. */
export interface Node { type: string; loc?: { start: { line: number; column: number } }; [key: string]: unknown }
export interface Element { node: Node; tag: string; parent?: Element; enclosing?: Element; scope: Node; attrs: Map<string, Node[]>; spread: boolean; children: Node[]; attributeValue: boolean }
export interface Parsed { elements: Element[]; byNode: Map<Node, Element>; byScope: Map<Node, Element[]>; labelsByScope: Map<Node, Element[]>; remainingSteps: number }
export class AnalysisLimitError extends Error {}
export function spend(parsed: Parsed, steps = 1): void {
  parsed.remainingSteps -= steps
  if (parsed.remainingSteps < 0) throw new AnalysisLimitError('Review analysis complexity limit.')
}
export function isNode(value: unknown): value is Node { return !!value && typeof value === 'object' && typeof (value as Node).type === 'string' }
export const nodes = (value: unknown): Node[] => Array.isArray(value) ? value.filter(isNode) : []
export function parseSource(content: string, path: string): Parsed {
  const ast = parse(content, { sourceType: 'unambiguous', plugins: path.endsWith('.tsx') ? ['jsx', 'typescript'] : ['jsx'], attachComment: false, errorRecovery: false }) as unknown as Node
  const elements: Element[] = [], byNode = new Map<Node, Element>(), byScope = new Map<Node, Element[]>(), labelsByScope = new Map<Node, Element[]>()
  const stack: Array<{ node: Node; depth: number; parent?: Element; enclosing?: Element; scope?: Node; attributeValue?: boolean }> = [{ node: ast, depth: 0 }]
  let count = 0
  while (stack.length) {
    const frame = stack.pop()!; const { node } = frame
    if (++count > REVIEW_LIMITS.astNodes || frame.depth > REVIEW_LIMITS.astDepth) throw new Error('Review parser complexity limit.')
    let current = frame.enclosing, staticParent = frame.parent, scope = frame.scope
    if (node.type === 'JSXElement') {
      const opening = node.openingElement as Node, name = opening.name as Node
      const tag = name.type === 'JSXIdentifier' ? String(name.name) : '<component>'
      const attrs = new Map<string, Node[]>(); let spread = false
      for (const attr of nodes(opening.attributes)) {
        if (attr.type === 'JSXSpreadAttribute') { spread = true; continue }
        const name = attr.name as Node
        const key = name.type === 'JSXIdentifier' ? String(name.name) : '<namespace>'
        const attributes = attrs.get(key) ?? []
        attributes.push(attr); attrs.set(key, attributes)
      }
      scope ??= node
      const info: Element = { node, tag, attrs, spread, children: nodes(node.children), scope, attributeValue: frame.attributeValue === true, ...(staticParent ? { parent: staticParent } : {}), ...(current ? { enclosing: current } : {}) }
      elements.push(info); byNode.set(node, info)
      const scopedElements = byScope.get(scope) ?? []
      scopedElements.push(info); byScope.set(scope, scopedElements)
      if (tag === 'label') { const labels = labelsByScope.get(scope) ?? []; labels.push(info); labelsByScope.set(scope, labels) }
      current = info; staticParent = info
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'comments' || key === 'tokens') continue
      const children = Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []
      const staticEdge = (node.type === 'JSXElement' || node.type === 'JSXFragment') && key === 'children'
      for (let index = children.length - 1; index >= 0; index--) stack.push({ node: children[index], depth: frame.depth + 1, attributeValue: frame.attributeValue || node.type === 'JSXAttribute' || node.type === 'JSXSpreadAttribute', ...(current ? { enclosing: current } : {}), ...(staticEdge ? { parent: staticParent, scope: scope ?? node } : {}) })
    }
  }
  elements.sort((a, b) => (a.node.loc?.start.line ?? 0) - (b.node.loc?.start.line ?? 0) || (a.node.loc?.start.column ?? 0) - (b.node.loc?.start.column ?? 0))
  return { elements, byNode, byScope, labelsByScope, remainingSteps: REVIEW_LIMITS.analysisSteps }
}
export type Literal = { kind: 'absent' } | { kind: 'unknown' } | { kind: 'value'; value: string | boolean | number | null }
export function literal(node: unknown): Literal {
  if (!isNode(node)) return { kind: 'unknown' }
  if (['StringLiteral', 'BooleanLiteral', 'NumericLiteral'].includes(node.type)) return { kind: 'value', value: node.value as string | boolean | number }
  if (node.type === 'NullLiteral') return { kind: 'value', value: null }
  if (node.type === 'TemplateLiteral' && nodes(node.expressions).length === 0) {
    const quasis = nodes(node.quasis)
    return { kind: 'value', value: String((quasis[0]?.value as { cooked?: string } | undefined)?.cooked ?? '') }
  }
  return { kind: 'unknown' }
}
export function attribute(element: Element, name: string): Literal {
  const attrs = element.attrs.get(name)
  if (!attrs) return element.spread ? { kind: 'unknown' } : { kind: 'absent' }
  if (attrs.length !== 1 || element.spread) return { kind: 'unknown' }
  const value = attrs[0].value
  if (value === null) return { kind: 'value', value: true }
  if (isNode(value) && value.type === 'JSXExpressionContainer') return literal(value.expression)
  return literal(value)
}
export const stringValue = (value: Literal) => value.kind === 'value' && typeof value.value === 'string' ? value.value : undefined
const nativeCache = new WeakMap<Element, boolean>()
export function isNative(element: Element): boolean {
  const cached = nativeCache.get(element)
  if (cached !== undefined) return cached
  const value = /^[a-z][a-z0-9]*$/.test(element.tag)
  nativeCache.set(element, value)
  return value
}
