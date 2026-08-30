import type { APIRoute } from "astro"

import { LAUNCH_DEMOS } from "@/data/launch-demos"

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        schemaVersion: 1,
        demos: LAUNCH_DEMOS.map(({ accent: _accent, ...demo }) => demo),
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    },
  )
