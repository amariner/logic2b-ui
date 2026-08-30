import { readdir } from "node:fs/promises"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import ts from "typescript"

import type {
  RegistryApiContracts,
  RegistryApiExport,
  RegistryApiExportKind,
} from "../types.ts"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const uiRoot = join(packageRoot, "src/ui")

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function documentation(
  checker: ts.TypeChecker,
  symbol: ts.Symbol | undefined,
): string | undefined {
  if (!symbol) return undefined
  const value = compact(
    ts.displayPartsToString(symbol.getDocumentationComment(checker)),
  )
  return value || undefined
}

function declarationName(
  declaration: ts.Declaration,
): ts.Identifier | undefined {
  if (
    (ts.isFunctionDeclaration(declaration) ||
      ts.isInterfaceDeclaration(declaration) ||
      ts.isTypeAliasDeclaration(declaration) ||
      ts.isClassDeclaration(declaration) ||
      ts.isEnumDeclaration(declaration)) &&
    declaration.name
  ) {
    return declaration.name
  }
  if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
    return declaration.name
  }
  return undefined
}

function localDeclarations(sourceFile: ts.SourceFile): Map<string, ts.Declaration> {
  const declarations = new Map<string, ts.Declaration>()
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const name = declarationName(declaration)
        if (name) declarations.set(name.text, declaration)
      }
      continue
    }
    const name = declarationName(statement)
    if (name) declarations.set(name.text, statement)
  }
  return declarations
}

function exportedDeclarations(sourceFile: ts.SourceFile): ts.Declaration[] {
  const declarations = localDeclarations(sourceFile)
  const result: ts.Declaration[] = []
  const seen = new Set<string>()

  const add = (name: string) => {
    if (seen.has(name)) return
    const declaration = declarations.get(name)
    if (!declaration) return
    seen.add(name)
    result.push(declaration)
  }

  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement)
      ? ts.getModifiers(statement)
      : undefined
    if (modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          const name = declarationName(declaration)
          if (name) add(name.text)
        }
      } else {
        const name = declarationName(statement)
        if (name) add(name.text)
      }
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause) &&
      !statement.moduleSpecifier
    ) {
      for (const element of statement.exportClause.elements) {
        add((element.propertyName ?? element.name).text)
      }
    }
  }
  return result
}

function functionLike(
  declaration: ts.Declaration,
): ts.FunctionLikeDeclaration | undefined {
  if (ts.isFunctionDeclaration(declaration)) return declaration
  if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) {
    return undefined
  }
  const initializer = declaration.initializer
  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
    return initializer
  }
  if (ts.isCallExpression(initializer)) {
    const callback = initializer.arguments.find(
      (argument): argument is ts.ArrowFunction | ts.FunctionExpression =>
        ts.isArrowFunction(argument) || ts.isFunctionExpression(argument),
    )
    return callback
  }
  return undefined
}

function propType(
  checker: ts.TypeChecker,
  parameterType: ts.Type,
  binding: ts.BindingElement,
): { symbol?: ts.Symbol; type: ts.Type } {
  const propertyName = binding.propertyName ?? binding.name
  const name = ts.isIdentifier(propertyName) ? propertyName.text : propertyName.getText()
  const symbol = checker.getPropertyOfType(parameterType, name)
  const type = symbol
    ? checker.getTypeOfSymbolAtLocation(symbol, binding)
    : checker.getTypeAtLocation(binding)
  return { symbol, type }
}

interface OwnedProp {
  required: boolean
  type?: string
}

function memberName(member: ts.TypeElement): string | undefined {
  if (!ts.isPropertySignature(member) || !member.name) return undefined
  if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) {
    return member.name.text
  }
  return undefined
}

function ownedProps(
  checker: ts.TypeChecker,
  typeNode: ts.TypeNode | undefined,
  declarations: Map<string, ts.Declaration>,
  visited = new Set<ts.Node>(),
): Map<string, OwnedProp> {
  const result = new Map<string, OwnedProp>()
  if (!typeNode || visited.has(typeNode)) return result
  visited.add(typeNode)

  const addMembers = (members: ts.NodeArray<ts.TypeElement>) => {
    for (const member of members) {
      const name = memberName(member)
      if (!name || !ts.isPropertySignature(member)) continue
      result.set(name, {
        required: !member.questionToken,
        ...(member.type ? { type: compact(member.type.getText()) } : {}),
      })
    }
  }

  if (ts.isTypeLiteralNode(typeNode)) {
    addMembers(typeNode.members)
  } else if (ts.isIntersectionTypeNode(typeNode)) {
    for (const member of typeNode.types) {
      for (const [name, prop] of ownedProps(
        checker,
        member,
        declarations,
        visited,
      )) {
        result.set(name, prop)
      }
    }
  } else if (ts.isParenthesizedTypeNode(typeNode)) {
    return ownedProps(checker, typeNode.type, declarations, visited)
  } else if (ts.isTypeReferenceNode(typeNode)) {
    const referenceName = typeNode.typeName.getText()
    const local = declarations.get(referenceName)
    if (local && ts.isInterfaceDeclaration(local)) {
      addMembers(local.members)
    } else if (local && ts.isTypeAliasDeclaration(local)) {
      return ownedProps(checker, local.type, declarations, visited)
    } else if (referenceName === "VariantProps") {
      for (const symbol of checker.getPropertiesOfType(checker.getTypeAtLocation(typeNode))) {
        result.set(symbol.name, {
          required: !(symbol.flags & ts.SymbolFlags.Optional),
        })
      }
    }
  }
  return result
}

function bindingPropertyName(binding: ts.BindingElement): string | undefined {
  const propertyName = binding.propertyName ?? binding.name
  if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName)) {
    return propertyName.text
  }
  return undefined
}

function cleanType(checker: ts.TypeChecker, type: ts.Type): string {
  if (type.isUnion()) {
    const members = type.types.filter(
      (member) => !(member.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)),
    )
    if (members.length > 0 && members.length !== type.types.length) {
      const rendered = members
        .map((member) =>
          checker.typeToString(
            member,
            undefined,
            ts.TypeFormatFlags.NoTruncation |
              ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
          ),
        )
        .join(" | ")
      return rendered === "false | true" || rendered === "true | false"
        ? "boolean"
        : rendered
    }
  }
  const rendered = checker.typeToString(
    type,
    undefined,
    ts.TypeFormatFlags.NoTruncation |
      ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  )
  return rendered === "false | true" || rendered === "true | false"
    ? "boolean"
    : rendered
}

function componentProps(
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
): Pick<RegistryApiExport, "propsType" | "props"> {
  const callable = functionLike(declaration)
  const parameter = callable?.parameters[0]
  if (!parameter) return {}

  const propsType = parameter.type ? compact(parameter.type.getText()) : undefined
  if (!ts.isObjectBindingPattern(parameter.name)) return { propsType }

  const parameterType = checker.getTypeAtLocation(parameter)
  const declarations = localDeclarations(declaration.getSourceFile())
  const owned = ownedProps(checker, parameter.type, declarations)
  const props: RegistryApiProp[] = []
  for (const binding of parameter.name.elements) {
    if (binding.dotDotDotToken || !ts.isIdentifier(binding.name)) continue
    const name = bindingPropertyName(binding)
    if (!name || name === "className") continue
    const ownedProp = owned.get(name)
    if (!ownedProp && !binding.initializer) continue
    const resolved = propType(checker, parameterType, binding)
    const optional = Boolean(resolved.symbol?.flags & ts.SymbolFlags.Optional)
    const includesUndefined = resolved.type.isUnion()
      ? resolved.type.types.some(
          (member) => member.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void),
        )
      : false
    props.push({
      name,
      type: ownedProp?.type ?? cleanType(checker, resolved.type),
      required:
        !binding.initializer &&
        (ownedProp?.required ?? (!optional && !includesUndefined)),
      ...(binding.initializer
        ? { default: compact(binding.initializer.getText()) }
        : {}),
      ...(documentation(checker, resolved.symbol)
        ? { description: documentation(checker, resolved.symbol) }
        : {}),
    })
  }
  return { propsType, ...(props.length > 0 ? { props } : {}) }
}

function aliasTarget(declaration: ts.Declaration): string | undefined {
  if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) {
    return undefined
  }
  const initializer = declaration.initializer
  if (ts.isIdentifier(initializer) || ts.isPropertyAccessExpression(initializer)) {
    return compact(initializer.getText())
  }
  return undefined
}

function kindFor(name: string, declaration: ts.Declaration): RegistryApiExportKind {
  if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) {
    return "type"
  }
  if (/^use[A-Z]/.test(name)) return "hook"
  if (/^[A-Z]/.test(name)) return "component"
  return "utility"
}

function definitionFor(declaration: ts.Declaration): string | undefined {
  if (!ts.isInterfaceDeclaration(declaration) && !ts.isTypeAliasDeclaration(declaration)) {
    return undefined
  }
  return compact(declaration.getText().replace(/^export\s+/, ""))
}

function signatureFor(
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
): string | undefined {
  const type = checker.getTypeAtLocation(declarationName(declaration) ?? declaration)
  const signature = checker.getSignaturesOfType(type, ts.SignatureKind.Call)[0]
  if (!signature) return undefined
  const rendered = compact(
    checker.signatureToString(
      signature,
      declaration,
      ts.TypeFormatFlags.NoTruncation |
        ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
      ts.SignatureKind.Call,
    ),
  )
  return rendered.length <= 800 ? rendered : undefined
}

export async function extractApiContracts(): Promise<RegistryApiContracts> {
  const filenames = (await readdir(uiRoot))
    .filter((filename) => extname(filename) === ".tsx")
    .sort()
  const rootNames = filenames.map((filename) => join(uiRoot, filename))
  const program = ts.createProgram(rootNames, {
    allowImportingTsExtensions: true,
    baseUrl: packageRoot,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    paths: { "@/registry/*": ["src/*"] },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
  })
  const checker = program.getTypeChecker()
  const contracts: RegistryApiContracts = {}

  for (const filename of filenames) {
    const sourcePath = join(uiRoot, filename)
    const sourceFile = program.getSourceFile(sourcePath)
    if (!sourceFile) throw new Error(`TypeScript did not load ${sourcePath}`)
    const exports = exportedDeclarations(sourceFile).map((declaration) => {
      const nameNode = declarationName(declaration)
      if (!nameNode) throw new Error(`Export without a name in ${sourcePath}`)
      const symbol = checker.getSymbolAtLocation(nameNode)
      const kind = kindFor(nameNode.text, declaration)
      return {
        name: nameNode.text,
        kind,
        ...(documentation(checker, symbol)
          ? { description: documentation(checker, symbol) }
          : {}),
        ...(kind === "component" ? componentProps(checker, declaration) : {}),
        ...(aliasTarget(declaration)
          ? { aliasOf: aliasTarget(declaration) }
          : {}),
        ...(definitionFor(declaration)
          ? { definition: definitionFor(declaration) }
          : {}),
        ...((kind === "hook" || kind === "utility") &&
        signatureFor(checker, declaration)
          ? { signature: signatureFor(checker, declaration) }
          : {}),
      } satisfies RegistryApiExport
    })

    contracts[filename.slice(0, -extname(filename).length)] = {
      source: `src/ui/${filename}`,
      exports,
    }
  }
  return contracts
}
