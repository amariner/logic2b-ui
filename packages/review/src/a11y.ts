import { attribute, attributes, list, literal, node, position, tag, type AstNode, type ParsedFile } from "./parse.ts"
import type { ReviewFinding, ReviewUnknown, RuleId } from "./contract.ts"
import { RULES } from "./rules.ts"
type Name = "named" | "empty" | "unknown"
const combine = (values: Name[]): Name => values.includes("named") ? "named" : values.includes("unknown") ? "unknown" : "empty"
const value = (el: AstNode, key: string) => literal(attribute(el, key)?.value)
const nonempty = (text: string | undefined): Name => text === undefined ? "unknown" : text.trim() ? "named" : "empty"
const native = (el: AstNode) => /^[a-z][a-z0-9]*$/.test(tag(el) ?? "")
function uncertainAttributes(el: AstNode) {
  const attrs = attributes(el)
  const names = attrs.filter(a => a.type === "JSXAttribute").map(a => String(node(a.name)?.name))
  return attrs.some(a => a.type === "JSXSpreadAttribute") || new Set(names).size !== names.length
}
function dynamicVisibility(el: AstNode) {
  return ["hidden", "aria-hidden", "inert"].some(key => {
    const attr = attribute(el, key)
    const expression = node(node(attr?.value)?.expression)
    return attr && attr.value !== null && literal(attr.value) === undefined && expression?.type !== "BooleanLiteral"
  })
}
function hidden(el: AstNode): boolean {
  return ["hidden", "inert"].some(key => {
    const html = attribute(el, key)
    const expression = node(node(html?.value)?.expression)
    return !!(html && (html.value === null || expression?.type === "BooleanLiteral" && expression.value === true || literal(html.value) !== undefined))
  }) || value(el, "aria-hidden") === "true" || node(node(attribute(el, "aria-hidden")?.value)?.expression)?.value === true
}
function text(el: AstNode, reference = false, depth = 0, ignore?: AstNode): Name {
  if (el === ignore) return "empty"
  if (depth > 100) return "unknown"
  if (el.type === "JSXText") return nonempty(String(el.value))
  if (el.type === "JSXExpressionContainer") {
    const expr = node(el.expression)
    if (!expr || ["JSXEmptyExpression", "NullLiteral", "BooleanLiteral"].includes(expr.type)) return "empty"
    const known = literal(expr)
    return known === undefined ? "unknown" : nonempty(known)
  }
  if (el.type === "JSXFragment") return combine(list(el.children).map(child => text(child, reference, depth + 1, ignore)))
  if (el.type !== "JSXElement") return "unknown"
  const name = tag(el)!
  if (!native(el) || uncertainAttributes(el) || dynamicVisibility(el)) return "unknown"
  if (!reference && hidden(el)) return "empty"
  if (attribute(el, "aria-label")) {
    const label = nonempty(value(el, "aria-label"))
    if (label !== "empty") return label
  }
  if (attribute(el, "aria-labelledby")) return "unknown"
  if (name === "img") return nonempty(value(el, "alt"))
  if (["svg", "input", "select", "textarea", "script", "style"].includes(name)) return "unknown"
  if (attribute(el, "dangerouslySetInnerHTML")) return "unknown"
  let result = combine(list(el.children).map(child => text(child, reference, depth + 1, ignore)))
  if (result === "empty" && attribute(el, "children")) result = nonempty(value(el, "children"))
  if (result === "empty" && attribute(el, "title")) result = nonempty(value(el, "title"))
  return result
}
function jsxRoot(el: AstNode, parsed: ParsedFile) {
  let root = el, current = parsed.parents.get(el)
  while (current) {
    if (/Function|ArrowFunction/.test(current.type)) break
    if (["JSXElement", "JSXFragment"].includes(current.type)) root = current
    current = parsed.parents.get(current)
  }
  return root
}
function unconditional(el: AstNode, root: AstNode, parsed: ParsedFile) {
  let current: AstNode | undefined = el
  while (current && current !== root) {
    current = parsed.parents.get(current)
    if (current && !["JSXElement", "JSXFragment", "JSXExpressionContainer"].includes(current.type)) return false
  }
  return current === root
}
/** Absence is a defect only under the host's explicit complete-label-context claim. */
export function reviewNames(parsed: ParsedFile): { findings: ReviewFinding[]; unknowns: ReviewUnknown[] } {
  const findings: ReviewFinding[] = [], unknowns: ReviewUnknown[] = []
  const elements = parsed.nodes.filter(n => n.type === "JSXElement")
  const roots = new Map(elements.map(el => [el, jsxRoot(el, parsed)]))
  // Unresolved siblings can render external labels even with a complete source boundary.
  const uncertainLabelRoots = new Set(elements.filter(el => !native(el) || tag(el) === "label" && (uncertainAttributes(el) || attribute(el, "htmlFor") && value(el, "htmlFor") === undefined)).map(el => roots.get(el)))
  for (const expression of parsed.nodes.filter(n => n.type === "JSXExpressionContainer")) {
    const parent = parsed.parents.get(expression), child = node(expression.expression)
    if (parent && ["JSXElement", "JSXFragment"].includes(parent.type) && child && !["JSXEmptyExpression", "NullLiteral", "BooleanLiteral", "JSXElement", "JSXFragment"].includes(child.type) && literal(child) === undefined) uncertainLabelRoots.add(jsxRoot(expression, parsed))
  }
  const ids = new Map<string, AstNode[]>(), labels = new Map<string, AstNode[]>()
  for (const el of elements) {
    const id = value(el, "id")
    if (id) ids.set(id, [...ids.get(id) ?? [], el])
    if (tag(el) === "label") { const target = value(el, "htmlFor"); if (target) labels.set(target, [...labels.get(target) ?? [], el]) }
  }
  const unknownTags = new Set<string>()
  for (const el of elements) {
    const name = tag(el)!
    if (!native(el)) {
      if (!unknownTags.has(name ?? "namespace")) {
        unknownTags.add(name ?? "namespace")
        unknowns.push({ file: parsed.file.path, rule: "a11y", ...position(el), reason: "Custom component semantics are unresolved; a wrapper name is not evidence of a missing label." })
      }
      continue
    }
    const inputType = value(el, "type")?.toLowerCase() ?? "text"
    let rule: RuleId | undefined
    if (name === "dialog" || ["dialog", "alertdialog"].includes(value(el, "role") ?? "")) rule = "L2B-A11Y-001"
    else if (name === "button" || name === "input" && ["button", "submit", "reset", "image"].includes(inputType)) rule = "L2B-A11Y-003"
    else if (["input", "select", "textarea"].includes(name) && inputType !== "hidden") rule = "L2B-A11Y-002"
    if (!rule || hidden(el) && !uncertainAttributes(el)) continue
    let ancestor = parsed.parents.get(el), hiddenAncestor = false, unresolvedAncestor = false
    while (ancestor) {
      if (/Function|ArrowFunction/.test(ancestor.type)) break
      if (ancestor.type === "JSXElement") {
        const ancestorTag = tag(ancestor)
        if (!native(ancestor) || uncertainAttributes(ancestor) || dynamicVisibility(ancestor)) unresolvedAncestor = true
        else if (hidden(ancestor) || ancestorTag === "template" || attribute(ancestor, "inert")?.value === null || node(node(attribute(ancestor, "inert")?.value)?.expression)?.value === true) hiddenAncestor = true
      }
      ancestor = parsed.parents.get(ancestor)
    }
    if (hiddenAncestor) continue
    const root = roots.get(el)!
    let resolved: Name = "empty", reason = "No accessible name is authored in this resolved label context."
    if (unresolvedAncestor || uncertainAttributes(el) || dynamicVisibility(el) || (attribute(el, "type") && value(el, "type") === undefined) || (attribute(el, "role") && !["dialog", "alertdialog"].includes(value(el, "role") ?? "")) || (attribute(el, "id") && value(el, "id") === undefined)) {
      resolved = "unknown"; reason = "Unresolved ancestors, spreads, duplicate attributes or dynamic semantics may provide or change the accessible name."
    } else {
      const labelledby = attribute(el, "aria-labelledby")
      if (labelledby && value(el, "aria-labelledby") === undefined) resolved = "unknown"
      else if (value(el, "aria-labelledby")?.trim()) {
        const targets = value(el, "aria-labelledby")!.trim().split(/\s+/)
        const names: Name[] = targets.map(id => {
          const candidates = ids.get(id) ?? []
          if (candidates.length !== 1 || roots.get(candidates[0]) !== root || !unconditional(candidates[0], root, parsed)) return "unknown"
          return text(candidates[0], hidden(candidates[0]))
        })
        resolved = names.includes("unknown") ? "unknown" : combine(names)
        reason = "aria-labelledby depends on missing, conditional, duplicate or unresolved label content."
      }
      // HTML-AAM falls back when a resolved relation has no usable text.
      // Missing/dynamic references remain unknown instead of claiming a fallback.
      if (resolved === "empty") {
        if (attribute(el, "aria-label")) resolved = nonempty(value(el, "aria-label"))
        if (resolved === "empty") {
          const associated: Name[] = []
          const id = value(el, "id")
          if (rule !== "L2B-A11Y-001" && id && (ids.get(id)?.length ?? 0) !== 1) associated.push("unknown")
          if (rule !== "L2B-A11Y-001" && id && (labels.get(id)?.length ?? 0) > 0) {
            for (const label of labels.get(id)!) associated.push(roots.get(label) === root && unconditional(label, root, parsed) ? text(label, hidden(label), 0, el) : "unknown")
          }
          let parent = parsed.parents.get(el)
          while (parent && parent !== root) {
            if (rule !== "L2B-A11Y-001" && parent.type === "JSXElement" && tag(parent) === "label") associated.push(attribute(parent, "htmlFor") ? "unknown" : text(parent, hidden(parent), 0, el))
            parent = parsed.parents.get(parent)
          }
          if (rule !== "L2B-A11Y-001" && root !== el && root.type === "JSXElement" && tag(root) === "label") associated.push(attribute(root, "htmlFor") ? "unknown" : text(root, hidden(root), 0, el))
          if (associated.length) resolved = combine(associated)
          if (resolved === "empty" && rule === "L2B-A11Y-003") {
            if (name === "input") {
              if (inputType === "image") resolved = attribute(el, "alt") ? nonempty(value(el, "alt")) : "unknown"
              else if (attribute(el, "value")) resolved = nonempty(value(el, "value"))
              else if (attribute(el, "defaultValue")) resolved = "unknown"
              else if (["submit", "reset"].includes(inputType)) resolved = "named"
              // Image inputs may receive an implementation-defined submit label.
              if (resolved === "empty" && inputType === "image") resolved = "unknown"
            } else {
              resolved = attribute(el, "dangerouslySetInnerHTML") ? "unknown" : combine(list(el.children).map(child => text(child)))
              if (resolved === "empty" && attribute(el, "children")) resolved = nonempty(value(el, "children"))
            }
          }
          if (resolved === "empty" && attribute(el, "title")) resolved = nonempty(value(el, "title"))
          if (resolved === "empty" && (attribute(el, "placeholder") || attribute(el, "aria-placeholder"))) resolved = "unknown"
        }
      }
    }
    if (resolved === "empty" && uncertainLabelRoots.has(root)) {
      resolved = "unknown"; reason = "An unresolved component or label in this JSX tree may provide an external accessible name."
    }
    if (resolved === "named") continue
    if (resolved === "unknown" || parsed.file.labelContext !== "complete") {
      unknowns.push({ file: parsed.file.path, rule, ...position(el), reason: resolved === "unknown" ? reason === "No accessible name is authored in this resolved label context." ? "Dynamic or unresolved content may supply the accessible name." : reason : "No local name was found, but external labels/ancestors are not ruled out. Supply complete label context or verify at runtime." })
    } else findings.push({ rule, severity: "error", category: "defect", confidence: "high", evidence: ["The host explicitly declares complete label context for this file.", `Resolved native ${name} has no name from the supported authored JSX sources.`, "No dynamic name attributes, spreads or unresolved name content were used to infer absence."], file: parsed.file.path, ...position(el), message: "This control has no accessible name within the supplied complete label context.", fix: "Add visible label text, an associated label or an appropriate aria-label/aria-labelledby; verify the result in the consuming app.", docs: RULES[rule].docs })
  }
  return { findings, unknowns }
}
