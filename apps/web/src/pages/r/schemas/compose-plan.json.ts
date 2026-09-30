import type { APIRoute } from "astro"
import { COMPOSE_PLAN_SCHEMA } from "@logic2b/scaffold/compose-schema"
export const prerender = true
export const GET: APIRoute = () => new Response(JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://ui.logic2b.com/r/schemas/compose-plan.json", ...COMPOSE_PLAN_SCHEMA }, null, 2), { headers: { "Content-Type": "application/json" } })
