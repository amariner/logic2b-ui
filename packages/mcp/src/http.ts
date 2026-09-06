/**
 * Stateless streamable HTTP transport shared by the remote worker and tests.
 * Every POST is a self-contained JSON-RPC exchange answered with one JSON
 * body: no sessions, no SSE streams (the specification allows a single JSON
 * response and a 405 GET when the server offers no server-initiated stream).
 * Protocol failures are distinguished by JSON-RPC code: -32700 parse error,
 * -32600 invalid request/envelope, -32601 unknown method, -32602 unknown tool
 * or invalid arguments, -32603 unexpected server failure. Tool execution
 * failures are successful responses carrying `isError: true`.
 */
import { LIMITS, ToolInputError, echo } from "./limits.ts"
import { DEFAULT_REGISTRY, type FetchLike } from "./registry.ts"
import { runTool, SERVER_INFO, TOOLS } from "./tools.ts"

export const SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
] as const
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0]

export const SERVER_INSTRUCTIONS =
  "Registry tools for logic2b ui (https://ui.logic2b.com): list, search and " +
  "read installable components, blocks, charts and the theme — and install " +
  "them without a shell. `install_plan` returns the exact files to write " +
  "(registry dependencies resolved) plus the npm deps to add; " +
  "`get_theme`/`decode_preset`/`apply_preset` inspect and rebuild theme.css " +
  "for any /create preset; `get_demo` returns real usage examples and " +
  "`add_command` the CLI equivalent. Prefer install_plan over hand-copying " +
  "from `get_component` when the goal is to install."

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
}

export type JsonRpcId = string | number | null

export interface JsonRpcError {
  jsonrpc: "2.0"
  id: JsonRpcId
  error: { code: number; message: string }
}

export interface JsonRpcResult {
  jsonrpc: "2.0"
  id: JsonRpcId
  result: unknown
}

export interface HttpHandlerOptions {
  /** Registry base URL; defaults to the request origin. */
  base?: string
  fetchImpl?: FetchLike
}

export function rpcError(id: JsonRpcId, code: number, message: string): JsonRpcError {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

export function rpcResult(id: JsonRpcId, result: unknown): JsonRpcResult {
  return { jsonrpc: "2.0", id, result }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

export class BodyTooLargeError extends Error {
  constructor(readonly limit: number) {
    super(`Request body exceeds ${limit} bytes.`)
    this.name = "BodyTooLargeError"
  }
}

/**
 * Read a request body with a hard byte cap while streaming. Content-Length is
 * advisory: a chunked or mislabeled body is still cut off at the limit.
 */
export async function readBoundedText(request: Request, limit: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > limit) throw new BodyTooLargeError(limit)
  if (!request.body) return ""
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > limit) throw new BodyTooLargeError(limit)
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function isValidId(id: unknown): id is JsonRpcId {
  return id === null || typeof id === "string" || (typeof id === "number" && Number.isFinite(id))
}

/** Dispatch one JSON-RPC message. Returns null for notifications and responses. */
export async function handleJsonRpcMessage(
  message: unknown,
  { base, fetchImpl }: Required<Pick<HttpHandlerOptions, "base">> & Pick<HttpHandlerOptions, "fetchImpl">
): Promise<JsonRpcResult | JsonRpcError | null> {
  if (typeof message !== "object" || message === null || Array.isArray(message)) {
    return rpcError(null, -32600, "Invalid Request: each message must be a JSON object.")
  }
  const msg = message as Record<string, unknown>
  if (msg.jsonrpc !== "2.0") {
    return rpcError(isValidId(msg.id) ? msg.id : null, -32600, 'Invalid Request: "jsonrpc" must be "2.0".')
  }
  if ("id" in msg && msg.id !== undefined && !isValidId(msg.id)) {
    return rpcError(null, -32600, 'Invalid Request: "id" must be a string, a number or null.')
  }
  // Responses from the client carry result/error and get no reply.
  if (!("method" in msg)) return null
  if (typeof msg.method !== "string") {
    return rpcError(isValidId(msg.id) ? msg.id : null, -32600, 'Invalid Request: "method" must be a string.')
  }
  // Notifications carry no id and get no reply, whatever the method.
  if (msg.id === undefined || msg.id === null) return null
  const id = msg.id as JsonRpcId
  if (msg.params !== undefined && (typeof msg.params !== "object" || msg.params === null || Array.isArray(msg.params))) {
    return rpcError(id, -32602, 'Invalid params: "params" must be an object.')
  }
  const params = (msg.params ?? {}) as Record<string, unknown>

  switch (msg.method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : ""
      const protocolVersion = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
        ? requested
        : LATEST_PROTOCOL_VERSION
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      })
    }
    case "ping":
      return rpcResult(id, {})
    case "tools/list":
      return rpcResult(id, { tools: TOOLS })
    case "tools/call": {
      if (typeof params.name !== "string" || !params.name) {
        return rpcError(id, -32602, 'Invalid params: "name" must be a tool name.')
      }
      try {
        return rpcResult(id, await runTool(params.name, params.arguments, { base, fetchImpl }))
      } catch (error) {
        if (error instanceof ToolInputError) return rpcError(id, error.code, error.message)
        return rpcError(id, -32603, `Internal error: ${echo(error instanceof Error ? error.message : String(error), 200)}`)
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${echo(msg.method)}`)
  }
}

/** Handle one HTTP POST with the JSON-RPC body semantics above. */
export async function handleHttpPost(request: Request, options: HttpHandlerOptions = {}): Promise<Response> {
  const protocolHeader = request.headers.get("mcp-protocol-version")
  if (protocolHeader && !(SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(protocolHeader)) {
    return json(
      rpcError(null, -32600, `Unsupported Mcp-Protocol-Version "${echo(protocolHeader)}". Supported: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")}.`),
      400
    )
  }

  let text: string
  try {
    text = await readBoundedText(request, LIMITS.bodyBytes)
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return json(rpcError(null, -32600, `Request body exceeds ${LIMITS.bodyBytes} bytes.`), 413)
    }
    return json(rpcError(null, -32700, "Parse error: the request body could not be read."), 400)
  }

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return json(rpcError(null, -32700, "Parse error: the request body is not valid JSON."), 400)
  }

  const opts = {
    base: options.base ?? new URL(request.url).origin ?? DEFAULT_REGISTRY,
    fetchImpl: options.fetchImpl,
  }

  // A JSON array is a 2025-03-26 batch; later revisions only send single
  // messages. Handle both, with a bounded batch length.
  const messages = Array.isArray(body) ? body : [body]
  if (messages.length === 0) {
    return json(rpcError(null, -32600, "Invalid Request: an empty batch is not allowed."), 400)
  }
  if (messages.length > LIMITS.batchLength) {
    return json(
      rpcError(null, -32600, `Invalid Request: a batch may contain at most ${LIMITS.batchLength} messages (received ${messages.length}).`),
      400
    )
  }

  const replies: (JsonRpcResult | JsonRpcError)[] = []
  for (const message of messages) {
    const reply = await handleJsonRpcMessage(message, opts)
    if (reply) replies.push(reply)
  }

  // Only notifications/responses in the body → acknowledge with 202.
  if (replies.length === 0) {
    return new Response(null, { status: 202, headers: CORS_HEADERS })
  }
  return json(Array.isArray(body) ? replies : replies[0])
}

/** GET and DELETE: no server-initiated stream and no sessions to terminate. */
export function methodNotAllowed(): Response {
  return new Response(JSON.stringify(rpcError(null, -32000, "Method Not Allowed")), {
    status: 405,
    headers: { "Content-Type": "application/json", Allow: "POST, OPTIONS", ...CORS_HEADERS },
  })
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
