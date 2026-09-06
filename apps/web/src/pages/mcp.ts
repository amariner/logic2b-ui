import type { APIRoute } from "astro";

import {
  handleHttpPost,
  methodNotAllowed,
  preflight,
} from "../../../../packages/mcp/src/http";
import type { FetchLike } from "../../../../packages/mcp/src/registry";

// The only server-rendered route on the site: everything else is static
// assets, and requests that match an asset never reach this worker. The
// JSON-RPC envelope, limits and error codes live in the shared MCP core so
// the stdio package and this worker cannot drift.
export const prerender = false;

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

export const POST: APIRoute = async ({ request }) =>
  handleHttpPost(request, {
    base: new URL(request.url).origin,
    fetchImpl: await registryFetch(),
  });

// No server-initiated event stream and no sessions to terminate.
export const GET: APIRoute = () => methodNotAllowed();
export const DELETE: APIRoute = () => methodNotAllowed();
export const OPTIONS: APIRoute = () => preflight();
