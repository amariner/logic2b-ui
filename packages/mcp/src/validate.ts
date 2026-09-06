/**
 * Structural argument validation for every tool: types, lengths, counts,
 * enumerations and duplicates. Runs before registry or network work and
 * throws ToolInputError. Domain outcomes (unknown item, invalid preset id,
 * integrity failure) are not validated here: they are execution results.
 */
import { byteLength, echo, LIMITS, ToolInputError } from "./limits.ts"

type Args = Record<string, unknown>

function fail(message: string): never {
  throw new ToolInputError(message)
}

export function assertArgumentsObject(value: unknown): Args {
  if (value === undefined || value === null) return {}
  if (typeof value !== "object" || Array.isArray(value)) {
    fail("Tool arguments must be a JSON object.")
  }
  return value as Args
}

export interface StringOptions {
  required?: boolean
  max?: number
  /** Allow whitespace-only values (default: trimmed empty counts as missing). */
  allowBlank?: boolean
}

/** Read a string argument. Returns undefined when absent (or blank, unless allowed). */
export function stringArg(
  args: Args,
  key: string,
  { required = false, max = LIMITS.nameLength, allowBlank = false }: StringOptions = {}
): string | undefined {
  const value = args[key]
  if (value === undefined || value === null) {
    if (required) fail(`The "${key}" argument is required.`)
    return undefined
  }
  if (typeof value !== "string") {
    fail(`The "${key}" argument must be a string, received ${describe(value)}.`)
  }
  if (value.length > max) {
    fail(`The "${key}" argument must not exceed ${max} characters (received ${value.length}).`)
  }
  if (value.includes("\0")) fail(`The "${key}" argument must not contain NUL characters.`)
  if (!allowBlank && !value.trim()) {
    if (required) fail(`The "${key}" argument is required.`)
    return undefined
  }
  return value
}

export function enumArg<T extends string>(
  args: Args,
  key: string,
  values: readonly T[],
  { required = false }: { required?: boolean } = {}
): T | undefined {
  const value = stringArg(args, key, { required, max: LIMITS.nameLength })
  if (value === undefined) return undefined
  if (!values.includes(value as T)) {
    fail(`The "${key}" argument must be one of: ${values.join(", ")}. Received "${echo(value)}".`)
  }
  return value as T
}

export function integerArg(
  args: Args,
  key: string,
  { min, max }: { min: number; max: number }
): number | undefined {
  const value = args[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`The "${key}" argument must be an integer between ${min} and ${max}, received ${describe(value)}.`)
  }
  if (value < min || value > max) {
    fail(`The "${key}" argument must be between ${min} and ${max} (received ${value}).`)
  }
  return value
}

/** Non-empty array of unique, bounded item names. */
export function namesArg(args: Args, key: string): string[] {
  const value = args[key]
  if (!Array.isArray(value)) {
    fail(`The "${key}" argument must be a non-empty array of item names, received ${describe(value)}.`)
  }
  if (value.length === 0) fail(`The "${key}" argument must be a non-empty array of item names.`)
  if (value.length > LIMITS.items) {
    fail(`The "${key}" argument accepts at most ${LIMITS.items} names per call (received ${value.length}).`)
  }
  const names: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string" || !entry.trim()) {
      fail(`Every "${key}" entry must be a non-empty string, received ${describe(entry)}.`)
    }
    const name = entry.trim()
    if (name.length > LIMITS.nameLength) {
      fail(`Item names must not exceed ${LIMITS.nameLength} characters (received "${echo(name)}").`)
    }
    if (names.includes(name)) fail(`Duplicate "${key}" entry "${echo(name)}". List each item once.`)
    names.push(name)
  }
  return names
}

/** A project-relative source directory: no traversal, no absolute paths. */
export function srcDirArg(args: Args, key = "srcDir"): string {
  const value = stringArg(args, key, { max: LIMITS.nameLength, allowBlank: true })
  if (value === undefined) return "src"
  const trimmed = value.trim().replace(/^\.\//, "").replace(/\/+$/, "")
  if (trimmed === "" || trimmed === ".") return ""
  if (
    trimmed.startsWith("/") ||
    /^[a-zA-Z]:/.test(trimmed) ||
    trimmed.includes("\\") ||
    trimmed.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    fail(`The "${key}" argument must be a relative directory inside the project (received "${echo(trimmed)}").`)
  }
  return trimmed
}

export function cssArg(args: Args, key = "css", { required = false } = {}): string | undefined {
  const value = args[key]
  if (value === undefined || value === null) {
    if (required) fail(`The "${key}" argument is required.`)
    return undefined
  }
  if (typeof value !== "string") fail(`The "${key}" argument must be a string, received ${describe(value)}.`)
  if (!value.trim()) {
    if (required) fail(`The "${key}" argument is required.`)
    return undefined
  }
  const bytes = byteLength(value)
  if (bytes > LIMITS.cssBytes) {
    fail(`The "${key}" argument must not exceed ${LIMITS.cssBytes} bytes (received ${bytes}).`)
  }
  return value
}

/** Raw token map for contrast_audit: bounded string-to-string object. */
export function tokensArg(args: Args, key = "tokens"): Record<string, string> | undefined {
  const value = args[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== "object" || Array.isArray(value)) {
    fail(`The "${key}" argument must be an object mapping token names to CSS color values.`)
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) fail(`The "${key}" argument must contain at least one token.`)
  if (entries.length > LIMITS.tokenEntries) {
    fail(`The "${key}" argument accepts at most ${LIMITS.tokenEntries} tokens (received ${entries.length}).`)
  }
  const tokens: Record<string, string> = {}
  for (const [name, raw] of entries) {
    if (name.length > LIMITS.tokenLength || typeof raw !== "string" || raw.length > LIMITS.tokenLength) {
      fail(`Token "${echo(name)}" must map to a string of at most ${LIMITS.tokenLength} characters.`)
    }
    tokens[name] = raw
  }
  return tokens
}

/** Theme option keys shared by export_tokens, apply_preset and contrast_audit. */
export const THEME_OPTION_KEYS = ["base", "accent", "chart", "radius", "font", "heading", "iconLibrary"] as const

export function themeOptionArgs(args: Args): void {
  stringArg(args, "preset", { max: LIMITS.presetLength })
  for (const key of THEME_OPTION_KEYS) stringArg(args, key, { max: LIMITS.presetLength })
}

function describe(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "an array"
  if (typeof value === "object") return "an object"
  if (typeof value === "string") return `"${echo(value)}"`
  return `${typeof value} ${echo(value)}`
}
