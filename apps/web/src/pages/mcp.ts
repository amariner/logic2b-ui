import type { APIRoute } from "astro";

import type { FetchLike } from "../../../../packages/mcp/src/registry";
import { runTool, SERVER_INFO, TOOLS } from "../../../../packages/mcp/src/tools";

// The only server-rendered route on the site: everything else is static
// assets, and requests that match an asset never reach this worker.
export const prerender = false;

// Streamable HTTP in stateless mode: every POST is a self-contained JSON-RPC
// exchange answered with a plain JSON body. No session ids, no SSE streams —
// the spec allows both (server MAY respond with a single JSON object; GET MAY
// return 405 when no server-initiated stream is offered).
const SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
];
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

const SERVER_INSTRUCTIONS =
  "Registry tools for logic2b ui (https://ui.logic2b.com): list, search and " +
  "read installable components, blocks, charts and the theme. " +
  "`get_component` returns every file's full source plus npm and registry " +
  "dependencies — write the files into the user's project (recursing into " +
  "registryDependencies) or run `npx logic2b@latest add <name>`.";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

type JsonRpcId = string | number | null;

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

/** Read registry data from the co-located static assets when the ASSETS
 *  binding is available (production worker, wrangler dev); fall back to a
 *  same-origin fetch (astro dev serves public/ directly). Astro 7 removed
 *  locals.runtime.env — bindings come from the cloudflare:workers module. */
async function registryFetch(): Promise<FetchLike> {
  let assets: { fetch: typeof fetch } | undefined;
  try {
    const { env } = (await import("cloudflare:workers")) as {
      env: { ASSETS?: { fetch: typeof fetch } };
    };
    assets = env.ASSETS;
  } catch {
    // Not running inside the worker runtime.
  }
  return async (url, init) =>
    assets ? assets.fetch(url, init) : fetch(url, init);
}

async function handleMessage(
  msg: JsonRpcMessage,
  opts: { base: string; fetchImpl: FetchLike }
): Promise<ReturnType<typeof rpcResult> | ReturnType<typeof rpcError> | null> {
  // Notifications and client responses get no reply.
  if (msg.id === undefined || msg.id === null || !msg.method) return null;

  if (typeof msg.method !== "string") {
    return rpcError(msg.id, -32600, "Invalid Request");
  }

  switch (msg.method) {
    case "initialize": {
      const requested = String(msg.params?.protocolVersion ?? "");
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
        ? requested
        : LATEST_PROTOCOL_VERSION;
      return rpcResult(msg.id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(msg.id, {});
    case "tools/list":
      return rpcResult(msg.id, { tools: TOOLS });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      return rpcResult(msg.id, await runTool(name, args, opts));
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }

  const opts = {
    base: new URL(request.url).origin,
    fetchImpl: await registryFetch(),
  };

  // A JSON array is a 2025-03-26 batch; later revisions only send single
  // messages. Handle both.
  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0) {
    return json(rpcError(null, -32600, "Invalid Request"), 400);
  }

  const replies = [];
  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) {
      replies.push(rpcError(null, -32600, "Invalid Request"));
      continue;
    }
    const reply = await handleMessage(msg as JsonRpcMessage, opts);
    if (reply) replies.push(reply);
  }

  // Only notifications/responses in the body → acknowledge with 202.
  if (replies.length === 0) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }
  return json(Array.isArray(body) ? replies : replies[0]);
};

// No server-initiated event stream and no sessions to terminate.
const methodNotAllowed = () =>
  new Response(
    JSON.stringify(rpcError(null, -32000, "Method Not Allowed")),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST, OPTIONS",
        ...CORS_HEADERS,
      },
    }
  );

export const GET: APIRoute = methodNotAllowed;
export const DELETE: APIRoute = methodNotAllowed;

export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });
