import { attribute, attributes, list, literal, node, position, type AstNode, type ParsedFile } from "./parse.ts"
import type { ReviewFinding, ReviewUnknown } from "./contract.ts"
import { RULES } from "./rules.ts"
const COLOR = /^(?:(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|shadow|divide|decoration|placeholder|accent|caret|fill|stroke|from|via|to)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)|black|white)(?:\/[\d.]+)?$)/
const COLOR_PROPERTY = /^(?:color|background(?:Color)?|border(?:Top|Right|Bottom|Left|Inline|Block)?Color|outlineColor|fill|stroke|caretColor|accentColor|textDecorationColor|boxShadow|textShadow)$/
const NAMED_COLOR = /(?:^|[\s,])(?:black|silver|gray|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|orange|rebeccapurple)(?=$|[\s,/])/i
/** Ignore strings and URL fragments; neither is evidence of a rendered color. */
function cssTokens(value: string): string {
  let result = "", quote = "", urlDepth = 0, comment = false
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (comment) { if (char === "*" && value[i + 1] === "/") { comment = false; i++ }; result += " "; continue }
    if (!quote && char === "/" && value[i + 1] === "*") { comment = true; i++; result += " "; continue }
    if (quote) { if (char === "\\") i++; else if (char === quote) quote = ""; result += " "; continue }
    if (char === '"' || char === "'") { quote = char; result += " "; continue }
    if (urlDepth) { if (char === "(") urlDepth++; if (char === ")") urlDepth--; result += " "; continue }
    if (value.slice(i, i + 4).toLowerCase() === "url(") { urlDepth = 1; i += 3; result += " "; continue }
    result += char
  }
  return result
}
function hasLiteralColor(value: string): boolean {
  const tokens = cssTokens(value)
  if (/(?:^|[^\w-])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})(?![\w-])/i.test(tokens) || NAMED_COLOR.test(tokens)) return true
  // hsl(var(--primary)) and rgb(var(--brand) / .5) are semantic references.
  // Unknown/malformed CSS functions are not high-confidence policy findings.
  return /\b(?:oklch|oklab|rgb|rgba|hsl|hsla|hwb|lab|lch)\(\s*[-+\d.][\d.eE+%\s,\/-]*\)/i.test(tokens) || /\bcolor\(\s*(?:srgb(?:-linear)?|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz(?:-d50|-d65)?)\s+[-+\d.][\d.eE+%\s,\/-]*\)/i.test(tokens)
}
function utilityCandidates(text: string) {
  return text.split(/\s+/).map(token => {
    // Variants may contain colons inside brackets. Only strip top-level variants.
    let depth = 0, last = -1
    for (let i = 0; i < token.length; i++) { if (token[i] === "[") depth++; if (token[i] === "]") depth--; if (token[i] === ":" && depth === 0) last = i }
    return token.slice(last + 1).replace(/^!|!$/g, "")
  })
}
const propertyName = (property: AstNode) => {
  const key = node(property.key)
  return property.computed ? undefined : key?.type === "Identifier" ? String(key.name) : literal(key)
}
export function reviewTokens(parsed: ParsedFile): { findings: ReviewFinding[]; unknowns: ReviewUnknown[] } {
  const findings: ReviewFinding[] = [], unknowns: ReviewUnknown[] = []
  const report = (at: AstNode, value: string) => findings.push({ rule: "L2B-TOK-001", severity: "error", category: "design-policy", confidence: "high", evidence: ["The host explicitly enabled semanticColors.", `Literal color in a JSX className/style: ${value.slice(0, 96)}`], file: parsed.file.path, ...position(at), message: "A literal color bypasses this project's semantic token policy.", fix: "Use an appropriate semantic utility or CSS variable; preserve intentional theme overrides in the stylesheet.", docs: RULES["L2B-TOK-001"].docs })
  const unknown = (at: AstNode) => unknowns.push({ file: parsed.file.path, rule: "L2B-TOK-001", ...position(at), reason: "Dynamic, overridden or unsupported styling was not evaluated; inspect its resolved values or stylesheet." })
  for (const element of parsed.nodes.filter(n => n.type === "JSXElement")) {
    const attrs = attributes(element)
    const unresolved = (key: string) => attrs.some(attr => attr.type === "JSXSpreadAttribute") || attrs.filter(attr => node(attr.name)?.name === key).length > 1
    const className = attribute(element, "className")
    if (className) {
      const value = literal(className.value)
      if (value === undefined || unresolved("className")) unknown(className)
      else for (const utility of utilityCandidates(value)) {
        const arbitrary = utility.match(/^(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|shadow|divide|decoration|placeholder|accent|caret|fill|stroke|from|via|to)-\[(.+)\](?:\/[\d.]+)?$/)
        if (COLOR.test(utility) || arbitrary && hasLiteralColor(arbitrary[1].replace(/_/g, " "))) report(className, utility)
      }
    }
    const style = attribute(element, "style")
    if (style) {
      const expression = node(node(style.value)?.expression)
      if (expression?.type !== "ObjectExpression" || unresolved("style")) { unknown(style); continue }
      const properties = list(expression.properties), keys = properties.map(propertyName)
      if (properties.some(property => property.type !== "ObjectProperty") || keys.includes(undefined) || new Set(keys).size !== keys.length) { unknown(style); continue }
      for (const property of properties) {
        const name = propertyName(property)!
        if (!COLOR_PROPERTY.test(name)) continue
        const value = literal(property.value)
        if (value === undefined) unknown(property)
        else if (hasLiteralColor(value)) report(property, `${name}: ${value}`)
        else if (!/^(?:var\(--[a-z0-9-]+\)|(?:hsl|rgb)a?\(var\(--[a-z0-9-]+\)(?:\s*\/\s*[\d.%]+)?\)|transparent|currentcolor|inherit|initial|unset|revert|none)$/i.test(value)) unknown(property)
      }
    }
  }
  return { findings, unknowns }
}
