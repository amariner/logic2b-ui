import type { APIRoute } from "astro"

import { presetGalleryPayload } from "@/data/preset-gallery"

export const GET: APIRoute = () =>
  new Response(JSON.stringify(presetGalleryPayload(), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
