# 02 — UI states & content contract

**Status:** proposed · **Lane:** guarantee quality · **Target:** v1.0 ·
**Depends on:** nothing. Foundation for guides 01, 03, 04 and 06.

## Why (the user)

Every block today renders its happy path with static sample data. A real
person also meets the empty list, the failed request, the slow network, the
form that rejected their input, the offline moment. When an agent installs a
block, nothing tells it which of those states the block already handles, which
ones it exposes as a slot and which ones the agent still has to write. The
result is interfaces that look finished and behave unfinished.

We already ship a machine-readable **accessibility** contract per UI item. The
same idea applied to **states and content** closes this gap: a block declares
what it handles, where its copy lives, and what task it serves. Docs render
it, MCP exposes it, the registry test fails if a block ships without it.

## What ships

- `states`, `content`, `intents`, `journey` and `responsive` metadata on every
  `registry:block` (charts included where it applies).
- A **States** tab on every block page (`/blocks/<category>/<name>`) showing
  each declared state live, and a "Content slots" table.
- `get_component` / `list_components` / `install_plan` return the metadata;
  `Copy Prompt` and `AGENTS.md` include the consumer duties.
- A registry test that fails when a block lacks the contract or declares a
  content slot that does not exist in its source.

## Design

### Contract

```ts
type StateName = "loading" | "empty" | "error" | "success" | "offline" | "partial"

interface RegistryStates {
  /** How each state is covered. `built-in`: renders it from a prop; `slot`:
   *  accepts a node/render prop; `consumer`: the composition must add it. */
  [state in StateName]?: {
    support: "built-in" | "slot" | "consumer"
    /** How to trigger or supply it, e.g. `status="empty"` or `emptyState` prop. */
    how: string
  }
}

interface RegistryContentSlot {
  /** Stable key, e.g. `hero.title`, `pricing.plans[].cta`. */
  key: string
  type: "text" | "richtext" | "image" | "list" | "link" | "number"
  /** Where it lives in the source (the exported `content` object). */
  path: string
  sample: string
  maxLength?: number
  /** Guidance for the agent writing copy: tone, tense, must-not. */
  guidance?: string
}

interface RegistryResponsive {
  /** Breakpoints the block was designed and pixel-tested at. */
  viewports: Array<"mobile" | "tablet" | "desktop">
  /** e.g. "three-pane collapses to tabs below md". */
  strategy: string
  touchTargets: "44px" | "24px"
}

interface RegistryItem {
  // …existing fields
  states?: RegistryStates
  content?: RegistryContentSlot[]
  /** Verbs the block serves — the vocabulary compose_plan matches against. */
  intents?: string[]            // "authenticate", "compare-plans", "review-order"
  /** Typical neighbours in a user journey. */
  journey?: { before?: string[]; after?: string[] }
  responsive?: RegistryResponsive
}
```

### Source convention: one `content` object per block

Every block file exports a single typed `content` constant at the top
(`export const content = { … } as const`) and renders from it. Blocks that
already keep sample data in a `data.ts` keep it, but the copy (titles,
labels, CTAs, empty/error messages) moves into `content`. Agents then change
copy by editing one object, translators get one place per block, and the
registry test can verify every declared slot `path` resolves in the source.

### State rendering convention

Blocks that own data views (`admin-*`, `products-01`, `kanban-01`,
`mail-client-01`, `calendar-app-01`, `cart-01`, `dashboard-*`, `chart-*`)
accept a `status?: "idle" | "loading" | "empty" | "error"` prop and render
the matching state with registry primitives (`Skeleton`, `Empty`, `Alert`)
and the copy from `content`. Marketing blocks declare their states as
`consumer` (there is no data) except `success`/`error` on forms
(`contact-01`, `login-*`, `signup-*`, `checkout-01`), which are `built-in`.

### Where it lives

| Piece | Path |
| --- | --- |
| Types | `packages/registry/types.ts` |
| Metadata | `packages/registry/states.ts` (mirror of `accessibility.ts`), merged in `packages/registry/registry.ts` |
| Source convention | `packages/registry/src/blocks/*/` |
| Registry test | `packages/registry/test/states.test.ts`, lint in `packages/registry/scripts/check-registry.ts` |
| Block page tab | `apps/web/src/pages/blocks/[category]/[name].astro`, preview route `apps/web/src/pages/blocks/preview/[name].astro` (`?state=`) |
| Prompts / AGENTS.md | `apps/web/src/lib/prompts.ts`, `apps/web/src/lib/agents-md.ts` |
| MCP | `packages/mcp/src/registry.ts` (already forwards item payloads) |

## Implementation steps

1. Add the types and an empty `states.ts` with the merge in `registry.ts`.
2. Write the registry test: every `registry:block` must declare `states`,
   `content`, `intents` and `responsive`; every `content[].path` must exist
   as a key path in the block's exported `content`; every `intents[]` value
   must be in the closed vocabulary in `packages/registry/intents.ts`.
3. Refactor blocks in category order (auth, marketing, dashboard, commerce,
   admin, apps) to the `content` convention. Keep exports identical; the
   visual baselines must not change (that is the proof the refactor is pure).
4. Add the `status` prop to data-owning blocks with `Skeleton`/`Empty`/`Alert`
   renders. Extend `apps/web/src/block-demos` so the preview route accepts
   `?state=` and the States tab renders one iframe per declared state.
5. Extend the visual and axe suites: one capture per declared state, light
   and dark. Budget check on the added baselines.
6. Surface the contract in docs, `Copy Prompt` ("this block leaves `error`
   to you: render `<Alert variant="destructive">` with `content.errors.*`")
   and `AGENTS.md` ("never ship a list without its empty state").
7. Publish `/r/schemas/registry-item.json` including the new fields.

## Gates

- `pnpm --filter @logic2b/registry test` and `lint` pass with 38/38 blocks
  covered.
- Visual suite: existing baselines unchanged after step 3; new state
  baselines added in step 5.
- axe: every state variant has zero serious/critical violations (empty and
  error states are where unnamed regions and unlabeled retry buttons hide).
- `install_plan` snapshot tests include the new fields.

## Out of scope

- Runtime data fetching or a data layer of any kind.
- Localised copy bundles (the `content` object makes them possible; shipping
  them is a later i18n item).

## Open questions

- Should `content` be a `registry:lib`-style separate file so `update` can
  merge copy and structure independently? Start inline; measure conflicts in
  `logic2b update` after the feedback loop (guide 09) exists.
