import type { APIRoute, GetStaticPaths } from "astro";

import { getDemos } from "@/lib/demo-index";

/** One demo's source, imports rewritten to installed-project paths. */
export const getStaticPaths: GetStaticPaths = () =>
  getDemos().map((demo) => ({ params: { name: demo.name }, props: { demo } }));

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.demo, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
