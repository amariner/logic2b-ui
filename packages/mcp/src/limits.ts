/**
 * Documented resource limits shared by the stdio server and the remote HTTP
 * worker. Inputs are bounded before any registry or network work; oversized
 * or malformed arguments are protocol errors (JSON-RPC -32602), never tool
 * execution results. Keep the README table in sync with these values.
 */
export const LIMITS = {
  /** Maximum HTTP request body in bytes, enforced while streaming. */
  bodyBytes: 2 * 1024 * 1024,
  /** Maximum JSON-RPC messages per HTTP batch (2025-03-26 clients). */
  batchLength: 8,
  /** Maximum registry item names per install_plan / add_command call. */
  items: 32,
  /** Maximum length of an item, demo, category or directory argument. */
  nameLength: 128,
  /** Maximum free-text query length for search_components. */
  queryLength: 256,
  /** Maximum search_components results per call. */
  searchLimit: 100,
  /** Maximum length of a registry version selector. */
  versionLength: 64,
  /** Maximum length of a theme preset id or theme option key. */
  presetLength: 256,
  /** Maximum project name length for scaffold_plan. */
  projectNameLength: 64,
  /** Maximum caller-supplied CSS in bytes (apply_preset, lint_theme). */
  cssBytes: 1_000_000,
  /** Maximum entries in a raw contrast_audit token map. */
  tokenEntries: 256,
  /** Maximum length of one raw token name or value. */
  tokenLength: 256,
  /** Maximum size of one fetched registry document in bytes. */
  registryDocumentBytes: 4 * 1024 * 1024,
  /** Maximum total file-content bytes returned by one plan or item read. */
  responseSourceBytes: 4 * 1024 * 1024,
  /** Maximum characters of caller input echoed inside an error message. */
  echoLength: 80,
} as const

/** Invalid or unbounded tool arguments: a JSON-RPC "Invalid params" error. */
export class ToolInputError extends Error {
  readonly code = -32602
  constructor(message: string) {
    super(message)
    this.name = "ToolInputError"
  }
}

/** Bound a caller value before echoing it in an error message. */
export function echo(value: unknown, max: number = LIMITS.echoLength): string {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? String(value)
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength
}
