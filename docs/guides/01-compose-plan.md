# 01 — `compose_plan`: from a brief to a grounded composition

**Status:** proposed · **Lane:** understand intent · **Target:** v1.1 ·
**Depends on:** [02 UI states & content contract](./02-ui-states-and-content-contract.md)
(for `intents`/`journey` metadata), [04 Proposal links](./04-proposal-links.md)
(for the preview URL).

## Why (the user)

Today an agent can install any item and scaffold three validated starters. It
cannot ask the registry *"which screens and blocks do I need for a subscription
billing area?"* — so it guesses, hand-rolls what it does not find, and skips
the states (empty, error, loading) a real person will hit on day one.
`compose_plan` turns a natural-language brief into a composition made **only**
of real registry items, with the gaps named instead of hidden, and hands back
a link the human can look at before a single file is written.

## What ships

- MCP tool `compose_plan` (remote + local).
- CLI `logic2b compose "<brief>" [--stack next|vite|astro] [--preset <id>]
  [--json]` printing the same plan, and `--apply` chaining into the existing
  scaffold/add paths.
- A shared, deterministic planner in `packages/scaffold/src/compose.ts`.
- Docs page `/docs/compose` and a "Compose" tab in the `/create` studio's
  Get Code (the brief box already exists conceptually in the prompt copier).
- Benchmark task 4 in `benchmarks/agents/protocol.json`: compose a brief into
  a production-building app; scored on grounding, coverage and states.

## Design

### Contract

```ts
interface ComposeRequest {
  requirements: Array<{
    id: string
    route: string
    task: string
    roles: string[]
    requiredStates: StateName[]
    actions: string[]
  }>
  brief?: string                             // optional discovery hint, ≤ 2 000 chars
  stack?: "next" | "vite" | "astro"          // default: "vite"
  preset?: string                            // any /create preset id
  locale?: string                            // BCP 47, default "en"
  constraints?: {
    mustInclude?: string[]                   // registry item names
    avoid?: string[]                         // registry item names or categories
    maxPages?: number                        // default 6
  }
  version?: string                           // exact | range | channel (as today)
}

interface ComposePlan {
  registryVersion: string
  coverage: Array<{ requirementId: string; status: "covered" | "partial" | "gap"; evidence: string[] }>
  pages: Array<{
    route: string                            // "/", "/billing", "/settings"
    purpose: string                          // one sentence, from the brief
    sections: Array<{
      item: string                           // real registry item name
      role: string                           // "hero" | "primary-form" | "list" | …
      why: string                            // which brief phrase matched
      contentSlots: string[]                 // from guide 02 `content`
      states: Record<StateName, "built-in" | "slot" | "consumer">
      alternatives: string[]                 // same-category swaps (≤ 3)
    }>
  }>
  items: string[]                            // transitive closure, deduplicated
  gaps: Array<{
    need: string                             // "invoice PDF viewer"
    suggestion: string                       // primitives to compose it from
    primitives: string[]
  }>
  next: {
    scaffold: ScaffoldRequest                // ready for scaffold_plan
    install: { items: string[]; iconLibrary?: string }
  }
  proposalUrl: string                        // guide 04
  confidence: "high" | "medium" | "low"      // coverage-based, see below
}
```

### The planner is deterministic

No model runs inside the tool. The host agent already reasons; the tool's job
is **grounding** (only real items), **coverage** (states, a11y consumer duties
and content slots come along) and **honesty** (gaps are listed, never faked).
The algorithm:

1. **Validate structured requirements** — require bounded roles/actions/states,
   stable ids and safe routes. The host interprets prose; unsupported requirements
   produce named gaps. Optionally normalize a discovery brief: lowercase, split
   into phrases, expand a small
   synonym table (`sign in` → `login`, `plans` → `pricing`, `orders` →
   `admin-orders`). The table lives with the registry data so it is versioned.
2. **Match intents** — every block (guide 02) declares `intents: string[]`
   (e.g. `"authenticate"`, `"compare-plans"`, `"manage-team"`). Score each
   block by phrase overlap with its intents, title, description and
   categories. Ties break by `journey` adjacency (a `signup` next to `login`).
3. **Assemble pages** — honor requested routes and roles first, using defaults
   from a fixed page-template table keyed by dominant
   intents: `marketing`, `auth`, `dashboard`, `settings`, `commerce`, `admin`,
   `ai-workspace`. A brief may produce several. Each template lists required
   roles (`navbar`, `hero`, `footer`…) and optional roles; blocks fill roles by
   score; unfilled required roles become `gaps`.
4. **Closure** — resolve `registryDependencies` exactly like `install_plan`.
5. **Confidence** — `high` when every required role is filled by a block with
   score ≥ threshold and there are no gaps; `low` when a required role is
   unfilled or the brief matched nothing above threshold.

The same structured requirements, context and registry version yield the same
plan. Keyword confidence is a retrieval signal, not proof of understanding.
The CLI accepts JSON requirements for automation; its prose entry may suggest
candidate requirements but must not silently apply a guessed composition.
M3-01 ships the core before M3-02 adds proposal UI; omit proposalUrl until then.

### Where it lives

| Piece | Path |
| --- | --- |
| Planner, templates, synonyms | `packages/scaffold/src/compose.ts`, `packages/scaffold/src/compose-templates.ts` |
| Intent metadata | `packages/registry/items/blocks.ts` (`intents`, `journey`) — see guide 02 |
| MCP tool | `packages/mcp/src/tools.ts` (register), `packages/mcp/src/plan.ts` (reuse closure) |
| CLI command | `packages/cli/src/index.ts`, `packages/cli/src/lib.ts` |
| Studio tab | `apps/web/src/pages/create.astro`, prompt text in `apps/web/src/lib/prompts.ts` |
| Docs | `apps/web/src/content/docs/compose.mdx` (+ `docs-es`) |
| Benchmark | `benchmarks/agents/protocol.json`, scorer in `benchmarks/agents/scripts` |

## Implementation steps

1. Add `intents` and `journey` to every block (guide 02 lands this; if it is
   not merged yet, land a minimal `intents` field first with a registry test
   that every block has ≥ 1 intent).
2. Write `compose-templates.ts`: the seven page templates with required and
   optional roles, and the role each existing block can play.
3. Write `compose.ts` with the five steps above. Pure functions, no I/O; the
   registry index is passed in.
4. Golden tests in `packages/scaffold/test/compose.test.ts`: 20 briefs →
   expected `pages`/`items`/`gaps`. Include adversarial briefs (empty, only
   stopwords, a request for something we do not have) and assert `gaps` and
   `confidence: "low"` instead of an invented item.
5. Register `compose_plan` in the MCP; reuse the version resolution and
   closure code from `install_plan`. Return `proposalUrl` from guide 04's
   encoder (or omit until it lands — never fake the URL).
6. CLI `compose` printing a human table by default and `--json` for scripts;
   `--apply` calls the existing scaffold path with `next.scaffold`.
7. Studio: a brief textarea in Get Code that runs the same planner in the
   browser (it is pure TS) and rewrites the Copy Prompt to include the plan.
8. Docs page with three worked briefs and their plans, in English and Spanish.
9. Benchmark task 4 with rubric: every item exists in the registry (30),
   required roles covered (30), states present per guide 02 (20), build passes
   (20).

## Gates

- `pnpm --filter @logic2b/scaffold test` golden briefs pass.
- Registry lint: every block declares intents; every template role maps to at
  least one shipped block.
- MCP unit test: `compose_plan` output validates against the JSON schema
  published at `/r/schemas/compose-plan.json`.
- `pnpm --filter @logic2b/mcp test:scaffolds` gains one composed brief per
  framework that installs and production-builds.
- Docs OG, axe and visual gates for the new page.

## Out of scope

- Running a model inside the tool, calling any external API.
- Free-form layout generation; the planner composes existing blocks and names
  gaps.
- Editing content copy — that is the agent's job with the slots from guide 02.

## Open questions

- Should `compose_plan` accept a screenshot/URL of an existing product to
  bias the plan? Not for v1.1; revisit after the feedback loop (guide 09)
  shows what briefs agents actually send.
