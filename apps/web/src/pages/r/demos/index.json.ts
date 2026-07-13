import type { APIRoute } from "astro";

import { getDemoIndex } from "@/lib/demo-index";

/** Machine-readable demo catalog: which usage examples exist per item.
 *  Each demo's source lives at /r/demos/<demo-name>.json. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(getDemoIndex(), null, 2), {
    headers: { "Content-Type": "application/json" },
  });
