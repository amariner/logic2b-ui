import { REVIEW_LIMITS, REVIEW_RULES, utf8Bytes, validateReviewRequest, type ReviewFinding, type ReviewRequest, type ReviewResult, type ReviewRule } from './contract.ts'
import { AnalysisLimitError, attribute, isNative, isNode, literal, nodes, parseSource, spend, stringValue, type Element, type Node, type Parsed } from './parse.ts'
export * from './contract.ts'

type Name = 'present' | 'empty' | 'unknown'
type Visibility = 'visible' | 'hidden' | 'unknown'
const merge = (values: Name[]): Name => values.includes('unknown') ? 'unknown' : values.includes('present') ? 'present' : 'empty'
const valueName = (value: unknown): Name => typeof value === 'string' || typeof value === 'number' ? String(value).trim() ? 'present' : 'empty' : value === null || typeof value === 'boolean' ? 'empty' : 'unknown'
const location = (node: Node) => ({ line: node.loc?.start.line ?? 1, column: (node.loc?.start.column ?? 0) + 1 })
const a11yRules = REVIEW_RULES.filter(rule => rule.category === 'defect').map(rule => rule.id)
const limitations = [
  'Source-only JSX/TSX inspection; no source execution, filesystem access, network access, DOM, CSS cascade or browser verification.',
  'Native HTML semantics only. Custom/imported components and wrappers are unresolved; their accessibility metadata does not prove rendered behavior.',
  'Labels and aria-labelledby targets are resolved only within a directly connected static JSX tree. Dynamic values, separate render scopes and external references remain unknown.',
  'Only accessible-name rules and the explicitly enabled semantic color policy are evaluated. Focus, keyboard, contrast, state coverage and runtime behavior require separate checks.',
  'An empty findings list is not an accessibility certificate. Unknowns and reasoned suppressions remain part of the review evidence.',
]
const visibilityCache = new WeakMap<Element, Visibility>()
function ownVisibility(element: Element): Visibility {
  const cached = visibilityCache.get(element)
  if (cached) return cached
  const value = computeVisibility(element)
  visibilityCache.set(element, value)
  return value
}
function computeVisibility(element: Element): Visibility {
  if (element.tag === 'template') return 'hidden'
  if (element.spread) return 'unknown'
  const classes = stringValue(attribute(element, 'className'))
  if (classes?.split(/\s+/).some(token => /(?:^|:)(?:hidden|invisible)$/.test(token))) return 'unknown'
  for (const name of ['hidden', 'aria-hidden', 'inert']) {
    const value = attribute(element, name)
    if (value.kind === 'unknown') return 'unknown'
    if (value.kind === 'value' && (value.value === true || (name === 'aria-hidden' ? value.value === 'true' : typeof value.value === 'string'))) return 'hidden'
  }
  const style = element.attrs.get('style')
  if (style) {
    const attr = style[0], expression = isNode(attr.value) && attr.value.type === 'JSXExpressionContainer' ? attr.value.expression : undefined
    if (style.length !== 1 || !isNode(expression) || expression.type !== 'ObjectExpression') return 'unknown'
    for (const property of nodes(expression.properties)) {
      if (property.type !== 'ObjectProperty' || property.computed) return 'unknown'
      const key = property.key as Node, name = key.type === 'Identifier' ? key.name : key.value
      if (!['display', 'visibility', 'contentVisibility'].includes(String(name))) continue
      const value = literal(property.value)
      if (value.kind !== 'value') return 'unknown'
      if (value.value === 'none' || value.value === 'hidden' || value.value === 'collapse') return 'hidden'
    }
  }
  return 'visible'
}
const contextVisibilityCache = new WeakMap<Element, Visibility>()
function contextVisibility(element: Element): Visibility {
  const cached = contextVisibilityCache.get(element)
  if (cached) return cached
  const own = ownVisibility(element)
  const parent = element.enclosing ? contextVisibility(element.enclosing) : 'visible'
  const value = own === 'hidden' || parent === 'hidden' ? 'hidden' : own === 'unknown' || parent === 'unknown' || !isNative(element) || element.attrs.has('ref') || element.attributeValue ? 'unknown' : 'visible'
  contextVisibilityCache.set(element, value)
  return value
}
function explicitName(element: Element, parsed: Parsed, visited: Set<Element>): Name | undefined {
  spend(parsed)
  if (visited.size > REVIEW_LIMITS.astDepth) return 'unknown'
  const refs = attribute(element, 'aria-labelledby')
  if (refs.kind === 'unknown') return 'unknown'
  if (refs.kind === 'value' && refs.value !== null) {
    if (typeof refs.value !== 'string') return 'unknown'
    const ids = refs.value.trim().split(/\s+/).filter(Boolean)
    if (ids.length) {
      const scope = parsed.byScope.get(element.scope) ?? []
      const targets: Name[] = []
      for (const id of ids) {
        spend(parsed, scope.length * 2)
        const matches = scope.filter(candidate => stringValue(attribute(candidate, 'id')) === id)
        // A matching static target is not unique if another id is dynamic or spread.
        if (matches.length !== 1 || scope.some(candidate => attribute(candidate, 'id').kind === 'unknown')) return 'unknown'
        const target = matches[0]
        if (visited.has(target) || !isNative(target) || contextHasWrapper(target)) return 'unknown'
        const next = new Set(visited); next.add(target)
        targets.push(textContent(target, parsed, next, true))
      }
      return merge(targets)
    }
  }
  const label = attribute(element, 'aria-label')
  if (label.kind === 'unknown') return 'unknown'
  if (label.kind === 'value' && typeof label.value !== 'string' && label.value !== null) return 'unknown'
  if (label.kind === 'value' && typeof label.value === 'string' && label.value.trim()) return 'present'
  return undefined
}
const wrapperCache = new WeakMap<Element, boolean>()
function contextHasWrapper(element: Element): boolean {
  const cached = wrapperCache.get(element)
  if (cached !== undefined) return cached
  const value = !isNative(element) || element.attrs.has('is') || (element.enclosing ? contextHasWrapper(element.enclosing) : false)
  wrapperCache.set(element, value)
  return value
}
function textContent(element: Element, parsed: Parsed, visited: Set<Element>, allowHidden = false): Name {
  spend(parsed)
  if (!isNative(element) || element.spread) return 'unknown'
  if (element.attrs.has('dangerouslySetInnerHTML') || element.attrs.has('children') || element.attrs.has('ref')) return 'unknown'
  if (!allowHidden) {
    const visibility = ownVisibility(element)
    if (visibility === 'unknown') return 'unknown'
    if (visibility === 'hidden') return 'empty'
  }
  const explicit = explicitName(element, parsed, visited)
  if (explicit !== undefined) return explicit
  if (element.tag === 'img') {
    const alt = attribute(element, 'alt')
    return alt.kind === 'unknown' ? 'unknown' : alt.kind === 'absent' ? 'unknown' : valueName(alt.value)
  }
  // Embedded controls, SVG naming and CSS-generated content require DOM semantics.
  if (['svg', 'input', 'select', 'textarea', 'iframe', 'object', 'canvas'].includes(element.tag)) return 'unknown'
  if (['script', 'style', 'template'].includes(element.tag)) return 'empty'
  const values = element.children.map(child => childText(child, parsed, visited, allowHidden))
  const contents = merge(values)
  return contents === 'empty' ? titleName(element) : contents
}
function childText(node: Node, parsed: Parsed, visited: Set<Element>, allowHidden: boolean): Name {
  spend(parsed)
  if (node.type === 'JSXText') return valueName(node.value)
  if (node.type === 'JSXFragment') return merge(nodes(node.children).map(child => childText(child, parsed, visited, allowHidden)))
  if (node.type === 'JSXExpressionContainer') {
    if (isNode(node.expression) && node.expression.type === 'JSXEmptyExpression') return 'empty'
    const value = literal(node.expression)
    return value.kind === 'value' ? valueName(value.value) : 'unknown'
  }
  if (node.type === 'JSXElement') {
    const info = parsed.byNode.get(node)
    if (!info || visited.has(info)) return 'unknown'
    const next = new Set(visited); next.add(info)
    return textContent(info, parsed, next, allowHidden)
  }
  return 'unknown'
}
function titleName(element: Element): Name {
  const title = attribute(element, 'title')
  return title.kind === 'unknown' ? 'unknown' : title.kind === 'absent' ? 'empty' : valueName(title.value)
}
function formName(element: Element, parsed: Parsed): Name {
  const explicit = explicitName(element, parsed, new Set([element]))
  if (explicit !== undefined) return explicit
  const scope = parsed.byScope.get(element.scope) ?? []
  const scopedLabels = parsed.labelsByScope.get(element.scope) ?? []
  spend(parsed, scopedLabels.length)
  const id = attribute(element, 'id')
  if (id.kind === 'unknown') return 'unknown'
  if (id.kind === 'value' && typeof id.value === 'number') return 'unknown'
  const idText = stringValue(id)
  const labels: Element[] = []
  for (const candidate of scopedLabels) {
    const target = attribute(candidate, 'htmlFor')
    if (target.kind === 'unknown') return 'unknown'
    if (idText && stringValue(target) === idText) labels.push(candidate)
  }
  let parent = element.enclosing
  while (parent) {
    spend(parsed)
    if (parent.tag === 'label') {
      // A label with htmlFor labels that target, rather than any nested control.
      const target = attribute(parent, 'htmlFor')
      if (target.kind === 'unknown') return 'unknown'
      if (target.kind === 'absent' || target.kind === 'value' && (target.value === null || target.value === false) || (idText && stringValue(target) === idText)) labels.push(parent)
      break
    }
    parent = parent.enclosing
  }
  if (labels.length) {
    const name = merge(labels.map(label => {
      spend(parsed, scope.length)
      if (label.scope !== element.scope || contextHasWrapper(label) || ownVisibility(label) === 'unknown') return 'unknown'
      const labelable = scope.filter(candidate => candidate !== element && ['input', 'select', 'textarea', 'button', 'meter', 'progress', 'output'].includes(candidate.tag) && isWithin(candidate, label, parsed))
      if (labelable.length || label.children.some(child => child.type === 'JSXExpressionContainer' && literal(child.expression).kind !== 'value' && (child.expression as Node).type !== 'JSXEmptyExpression')) return 'unknown'
      return labelText(label, element, parsed)
    }))
    return name === 'empty' && idText ? 'unknown' : name
  }
  const title = titleName(element)
  if (title !== 'empty') return title
  if (element.tag === 'input' || element.tag === 'textarea') {
    for (const name of ['placeholder', 'aria-placeholder']) {
      const placeholder = attribute(element, name)
      if (placeholder.kind === 'unknown') return 'unknown'
      if (placeholder.kind === 'value' && valueName(placeholder.value) === 'present') return 'unknown'
    }
  }
  // An id may be referenced by a label in another component/file or render scope.
  if (idText) return 'unknown'
  return 'empty'
}
function isWithin(element: Element, ancestor: Element, parsed: Parsed): boolean {
  let parent = element.parent
  while (parent) { spend(parsed); if (parent === ancestor) return true; parent = parent.parent }
  return false
}
function labelText(label: Element, target: Element, parsed: Parsed): Name {
  if (label.attrs.has('children') || label.attrs.has('dangerouslySetInnerHTML') || label.attrs.has('ref')) return 'unknown'
  const explicit = explicitName(label, parsed, new Set([label, target]))
  if (explicit !== undefined) return explicit
  const visit = (node: Node): Name => {
    spend(parsed)
    if (node === target.node) return 'empty'
    if (node.type === 'JSXElement') {
      const info = parsed.byNode.get(node)!
      if (!isWithin(target, info, parsed)) return textContent(info, parsed, new Set([info]))
      if (!isNative(info) || ownVisibility(info) === 'unknown') return 'unknown'
      if (ownVisibility(info) === 'hidden') return 'empty'
      if (info.attrs.has('children') || info.attrs.has('dangerouslySetInnerHTML')) return 'unknown'
      const explicit = explicitName(info, parsed, new Set([label, target, info]))
      if (explicit !== undefined) return explicit
      return merge(info.children.map(visit))
    }
    if (node.type === 'JSXFragment') return merge(nodes(node.children).map(visit))
    return childText(node, parsed, new Set([label, target]), false)
  }
  if (ownVisibility(label) === 'hidden') return 'unknown'
  const contents = merge(label.children.map(visit))
  return contents === 'empty' && titleName(label) !== 'empty' ? 'unknown' : contents
}
function checkName(element: Element, rule: ReviewRule, parsed: Parsed): Name {
  if (element.spread || element.attrs.has('ref') || contextHasWrapper(element) || contextVisibility(element) === 'unknown') return 'unknown'
  const explicit = explicitName(element, parsed, new Set([element]))
  if (explicit !== undefined) return explicit
  if (rule === 'L2B-A11Y-002') return formName(element, parsed)
  if (rule === 'L2B-A11Y-001') return titleName(element)
  if (element.tag === 'input') {
    const type = stringValue(attribute(element, 'type'))?.toLowerCase()
    if (type === 'submit' || type === 'reset') {
      const value = attribute(element, 'value')
      // Localized defaults apply when value is absent; empty/dynamic values vary.
      return value.kind === 'absent' || value.kind === 'value' && valueName(value.value) === 'present' ? 'present' : 'unknown'
    }
    const value = attribute(element, type === 'image' ? 'alt' : 'value')
    if (value.kind === 'unknown') return 'unknown'
    if (value.kind === 'value' && valueName(value.value) === 'present') return 'present'
    if (type === 'image') return 'unknown' // Browser fallback and external labels vary.
    return formName(element, parsed)
  }
  const contents = textContent(element, parsed, new Set([element]))
  return contents === 'empty' ? formName(element, parsed) : contents
}
function targetRule(element: Element): ReviewRule | 'unknown' | undefined {
  const role = attribute(element, 'role')
  if (role.kind === 'unknown') return 'unknown'
  const roles = stringValue(role)?.trim().split(/\s+/)
  if (roles?.some(value => value === 'dialog' || value === 'alertdialog')) return roles.length === 1 ? 'L2B-A11Y-001' : 'unknown'
  if (roles?.some(Boolean) && ['dialog', 'button', 'input', 'textarea', 'select', 'meter', 'progress', 'output'].includes(element.tag)) return 'unknown'
  if (element.tag === 'dialog') return 'L2B-A11Y-001'
  if (element.tag === 'button') return 'L2B-A11Y-003'
  if (element.tag === 'input') {
    const type = attribute(element, 'type')
    if (type.kind === 'unknown') return 'unknown'
    const value = stringValue(type)?.toLowerCase()
    if (value === 'hidden') return undefined
    return value && ['button', 'submit', 'reset', 'image'].includes(value) ? 'L2B-A11Y-003' : 'L2B-A11Y-002'
  }
  if (['select', 'textarea'].includes(element.tag)) return 'L2B-A11Y-002'
  return undefined
}
const colorUtilities = /(?:^|:)(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|divide|decoration|placeholder|accent|caret|fill|stroke|from|via|to|shadow)-(?:black|white|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/[^\s]+)?$/
const hardcodedColor = /(?:#[0-9a-f]{3,8}\b|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\s*\()/i
const colorProperties = /^(?:color|background|backgroundColor|border(?:Top|Right|Bottom|Left)?Color|outlineColor|textDecorationColor|fill|stroke|boxShadow|textShadow|caretColor|accentColor)$/
const namedColors = /^(?:black|white|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|maroon|navy|teal|lime|aqua|fuchsia|olive)$/i
function tokenPolicy(element: Element): 'violation' | 'unknown' | 'pass' {
  let unknown = element.spread, violation = false
  const classes = attribute(element, 'className')
  if (classes.kind === 'unknown') unknown = true
  if (classes.kind === 'value') {
    if (typeof classes.value !== 'string' && classes.value !== null && classes.value !== false) unknown = true
    if (typeof classes.value === 'string') violation ||= classes.value.split(/\s+/).some(token => colorUtilities.test(token) || /(?:^|:)(?:bg|text|border(?:-[trblxyse])?|ring|outline|fill|stroke|from|via|to)-\[/.test(token) && (hardcodedColor.test(token) || /\[(?:[a-z]+:)?(?:red|blue|white|black)\]/i.test(token)))
  }
  const style = element.attrs.get('style')
  if (style) {
    const value = style[0].value
    const expression = isNode(value) && value.type === 'JSXExpressionContainer' ? value.expression : undefined
    if (style.length !== 1 || !isNode(expression) || expression.type !== 'ObjectExpression') unknown = true
    else {
      let styleViolation = false, unsafe = false
      const keys = new Set<string>()
      for (const property of nodes(expression.properties)) {
        if (property.type !== 'ObjectProperty' || property.computed) { unsafe = true; continue }
        const key = property.key as Node, name = String(key.type === 'Identifier' ? key.name : key.value)
        if (keys.has(name)) unsafe = true
        keys.add(name)
        if (!colorProperties.test(name)) continue
        const color = literal(property.value)
        if (color.kind !== 'value') unknown = true
        else if (typeof color.value === 'string') {
          // Color-like text in a URL is an asset reference, not a CSS color.
          if (/url\s*\(/i.test(color.value)) unknown = true
          else styleViolation ||= hardcodedColor.test(color.value) || namedColors.test(color.value.trim())
        }
      }
      if (unsafe) unknown = true
      else violation ||= styleViolation
    }
  }
  // Spreads/duplicates can override a literal; do not report a proven policy violation.
  if (element.spread || (element.attrs.get('className')?.length ?? 0) > 1 || (style?.length ?? 0) > 1) return 'unknown'
  return violation ? 'violation' : unknown ? 'unknown' : 'pass'
}
/** Deterministic, synchronous and source-only. Every public caller shares validation. */
export function reviewUi(request: ReviewRequest): ReviewResult {
  validateReviewRequest(request)
  const evaluatedRules: ReviewRule[] = [...a11yRules, ...(request.policy?.semanticColors === true ? ['L2B-TOK-001' as const] : [])]
  const result: ReviewResult = { schemaVersion: 1, engineVersion: '1', summary: { errors: 0, warnings: 0, info: 0 }, findings: [], unknowns: [], suppressed: [], evaluatedRules, limitations: [...limitations] }
  let remainingSteps: number = REVIEW_LIMITS.analysisSteps
  const bound = () => {
    if (result.findings.length + result.unknowns.length + result.suppressed.length > REVIEW_LIMITS.findings) throw new Error('Review exceeds the 512-entry result budget; split files into smaller reviews or simplify the source.')
  }
  for (const file of request.files) {
    const unknown = (rule: ReviewRule, node: Node | undefined, reason: string) => { result.unknowns.push({ rule, file: file.path, ...(node ? location(node) : { line: 1, column: 1 }), reason }); bound() }
    if (remainingSteps <= 0) {
      for (const rule of evaluatedRules) unknown(rule, undefined, 'Review exhausted its shared static analysis work budget; submit this file in a smaller review.')
      continue
    }
    const finding = (rule: ReviewRule, element: Element, message: string, evidence: string[]) => {
      const definition = REVIEW_RULES.find(item => item.id === rule)!
      const value: ReviewFinding = { rule, severity: definition.severity, category: definition.category, confidence: 'high', file: file.path, ...location(element.node), message, evidence, fix: definition.fix, docs: definition.docs }
      const suppression = request.suppressions?.find(item => item.file === file.path && item.rule === rule && item.line === value.line)
      if (suppression) result.suppressed.push({ finding: value, reason: suppression.reason })
      else { result.findings.push(value); result.summary[value.severity === 'error' ? 'errors' : value.severity === 'warning' ? 'warnings' : 'info']++ }
      bound()
    }
    let parsed: Parsed
    try { parsed = parseSource(file.content, file.path) }
    catch { for (const rule of evaluatedRules) unknown(rule, undefined, 'Source could not be parsed within the JSX/TSX syntax and complexity limits; simplify the file or verify its syntax.'); continue }
    parsed.remainingSteps = remainingSteps
    const start = { findings: result.findings.length, unknowns: result.unknowns.length, suppressed: result.suppressed.length }
    try {
    let customReported = false
    for (const element of parsed.elements) {
      spend(parsed)
      if (!isNative(element)) {
        if (!customReported) { for (const rule of a11yRules) unknown(rule, element.node, 'Custom or imported component semantics are unresolved in this file; inspect their implementation and verify rendered behavior.'); customReported = true }
      } else if (contextVisibility(element) !== 'hidden') {
        const rule = targetRule(element)
        if (rule === 'unknown') for (const id of a11yRules) unknown(id, element.node, 'Dynamic role, type or spread attributes prevent determining the applicable native semantics.')
        else if (rule) {
          const name = checkName(element, rule, parsed)
          if (name === 'unknown') unknown(rule, element.node, 'Accessible name depends on dynamic content, wrappers, ambiguous labels, hidden state or references outside this static JSX tree.')
          else if (name === 'empty') finding(rule, element, 'This native control has no accessible name in the resolved static markup.', ['Native element and applicable naming semantics are statically known.', 'Resolved naming attributes, local labels and applicable text content provide no nonempty accessible name.'])
        }
      }
      if (request.policy?.semanticColors === true) {
        const policy = tokenPolicy(element)
        if (policy === 'unknown') unknown('L2B-TOK-001', element.node, 'Dynamic className/style or spread attributes prevent complete semantic color policy review.')
        else if (policy === 'violation') finding('L2B-TOK-001', element, 'A recognized literal hardcoded color violates the explicitly enabled semantic color policy.', ['semanticColors policy is explicitly enabled.', 'A literal className or style color uses a recognized fixed color instead of a semantic token.'])
      }
    }
    } catch (error) {
      if (!(error instanceof AnalysisLimitError)) throw error
      // A partial analysis must never masquerade as a complete file review.
      result.findings.splice(start.findings); result.unknowns.splice(start.unknowns); result.suppressed.splice(start.suppressed)
      result.summary = { errors: 0, warnings: 0, info: 0 }
      for (const finding of result.findings) result.summary[finding.severity === 'error' ? 'errors' : finding.severity === 'warning' ? 'warnings' : 'info']++
      for (const rule of evaluatedRules) unknown(rule, undefined, 'Source exceeds the static analysis work budget; simplify naming references or split the file into smaller reviews.')
    }
    remainingSteps = Math.max(0, parsed.remainingSteps)
  }
  if (utf8Bytes(JSON.stringify(result)) > REVIEW_LIMITS.outputBytes) throw new Error('Review exceeds the 512 KiB response budget; split the input into smaller reviews.')
  return result
}
