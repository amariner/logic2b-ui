import ts from "typescript"
import { validateBehavior, type RegistryBehavior } from "@logic2b/scaffold/behavior"

const MAX_SOURCE_BYTES = 1_000_000
type PropsDeclaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration

function exportedNames(source: ts.SourceFile): Map<string, string> {
  const names = new Map<string, string>()
  for (const statement of source.statements) {
    const exported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    if (exported) {
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) names.set(declaration.name.text, declaration.name.text)
        }
      } else if ((ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name) {
        names.set(statement.name.text, statement.name.text)
      }
    }
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const entry of statement.exportClause.elements) names.set(entry.name.text, (entry.propertyName ?? entry.name).text)
    }
  }
  return names
}

function unwrap(expression: ts.Expression): ts.Expression {
  while (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isTypeAssertionExpression(expression) || ts.isParenthesizedExpression(expression)) expression = expression.expression
  return expression
}

function literalKey(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined
}

function contentValue(expression: ts.Expression, segments: string[]): string | undefined {
  const value = unwrap(expression)
  if (segments.length === 0) return ts.isStringLiteralLike(value) ? value.text : undefined
  if (!ts.isObjectLiteralExpression(value)) return undefined
  const properties = new Map<string, ts.Expression>()
  for (const property of value.properties) {
    // Spreads, computed keys, accessors and duplicate keys can replace an
    // apparent literal at runtime. They are not source evidence for a slot.
    if (!ts.isPropertyAssignment(property)) return undefined
    const key = literalKey(property.name)
    if (key === undefined || properties.has(key)) return undefined
    properties.set(key, property.initializer)
  }
  const child = properties.get(segments[0])
  return child ? contentValue(child, segments.slice(1)) : undefined
}

function memberNames(members: ts.NodeArray<ts.TypeElement>): Set<string> {
  return new Set(members.flatMap((member) => {
    if ((!ts.isPropertySignature(member) && !ts.isMethodSignature(member)) || !member.name) return []
    const name = literalKey(member.name)
    return name === undefined ? [] : [name]
  }))
}

function stringTypeNames(node: ts.TypeNode | undefined): Set<string> {
  if (!node) return new Set()
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return new Set([node.literal.text])
  if (ts.isUnionTypeNode(node)) return new Set(node.types.flatMap((type) => [...stringTypeNames(type)]))
  return new Set()
}

function propsFromType(node: ts.TypeNode | ts.ExpressionWithTypeArguments, declarations: Map<string, PropsDeclaration>, visited: Set<string>): Set<string> {
  if (ts.isTypeLiteralNode(node)) return memberNames(node.members)
  if (ts.isParenthesizedTypeNode(node)) return propsFromType(node.type, declarations, visited)
  if (ts.isIntersectionTypeNode(node)) return new Set(node.types.flatMap((type) => [...propsFromType(type, declarations, visited)]))
  if (ts.isUnionTypeNode(node)) {
    const branches = node.types.map((type) => propsFromType(type, declarations, visited))
    return new Set([...branches[0]].filter((name) => branches.every((branch) => branch.has(name))))
  }
  if (!ts.isTypeReferenceNode(node) && !ts.isExpressionWithTypeArguments(node)) return new Set()
  const name = ts.isTypeReferenceNode(node) ? node.typeName.getText() : node.expression.getText()
  const arguments_ = node.typeArguments
  if (["Partial", "Required", "Readonly", "Pick", "Omit"].includes(name) && arguments_?.[0]) {
    const names = propsFromType(arguments_[0], declarations, visited)
    const filter = stringTypeNames(arguments_[1])
    if (name === "Pick") return new Set([...names].filter((property) => filter.has(property)))
    if (name === "Omit") return new Set([...names].filter((property) => !filter.has(property)))
    return names
  }
  return propsFromDeclaration(name, declarations, visited)
}

function propsFromDeclaration(name: string, declarations: Map<string, PropsDeclaration>, visited: Set<string>): Set<string> {
  const declaration = declarations.get(name)
  if (!declaration || visited.has(name)) return new Set()
  const next = new Set(visited).add(name)
  if (ts.isTypeAliasDeclaration(declaration)) return propsFromType(declaration.type, declarations, next)
  const names = memberNames(declaration.members)
  for (const clause of declaration.heritageClauses ?? []) {
    for (const type of clause.types) for (const name of propsFromType(type, declarations, next)) names.add(name)
  }
  return names
}

/** Verify the two reference blocks' declared source evidence without importing
 * the source, evaluating initializers or resolving arbitrary modules. Copy is
 * a literal exported const object; action props must be provable in a local
 * exported *Props declaration. External HTML inheritance is allowed, but it
 * cannot be used to invent evidence for an undeclared action prop. */
export function verifyBehaviorSource(source: string, behavior: RegistryBehavior, sourceName = "block.tsx"): string[] {
  const errors: string[] = []
  const fail = (message: string) => errors.push(`${sourceName}: ${message}`)
  try { validateBehavior(behavior) } catch (error) {
    fail(error instanceof Error ? error.message : "invalid behavior contract")
    return errors
  }
  if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
    fail(`source exceeds ${MAX_SOURCE_BYTES} bytes`)
    return errors
  }
  const parsed = ts.createSourceFile(sourceName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const diagnostics = (parsed as ts.SourceFile & { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics
  if (diagnostics.length > 0) {
    fail(`source has syntax errors: ${ts.flattenDiagnosticMessageText(diagnostics[0].messageText, " ")}`)
    return errors
  }
  const exports = exportedNames(parsed)
  const contentName = exports.get("content")
  let content: ts.Expression | undefined
  const declarations = new Map<string, PropsDeclaration>()
  for (const statement of parsed.statements) {
    if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.Const) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === contentName) content = declaration.initializer
      }
    }
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) declarations.set(statement.name.text, statement)
  }
  if (!content) fail("expected an exported const content object")
  else for (const slot of behavior.content) {
    const literal = contentValue(content, slot.path.split(".").slice(1))
    if (literal === undefined) fail(`${slot.path} is not a provable string literal in exported content`)
    else if (literal !== slot.sample) fail(`${slot.path} sample differs from its source literal`)
  }
  const props = new Set<string>()
  for (const [exported, local] of exports) {
    if (exported.endsWith("Props")) for (const name of propsFromDeclaration(local, declarations, new Set())) props.add(name)
  }
  for (const action of behavior.actions) for (const prop of action.props) {
    if (!props.has(prop)) fail(`action ${action.name} prop ${prop} is not provable in an exported Props declaration`)
  }
  return errors
}
