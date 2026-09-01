# 03 — `review_ui`: design-system review as a tool

**Status:** proposed · **Lane:** guarantee quality · **Target:** v1.0 ·
**Depends on:** [02 UI states & content contract](./02-ui-states-and-content-contract.md)
for the state rules; runs without it for the rest.

## Why (the user)

`lint_theme` proves a theme is still on-system after months of edits. Nothing
does the same for **compositions**: the agent that hand-rolls a `<button>`
because it forgot `Button` exists, the `Dialog` without a `DialogTitle` a
screen reader user cannot name, the list that never renders an empty state,
the `animate-*` class that ignores `prefers-reduced-motion`, the `text-red-500`
that breaks the dark theme. These are the defects real people meet, and they
are all statically detectable. `review_ui` makes the design review something an
agent runs on itself before it says "done".

## What ships

- `packages/review`: a pure, DOM-free rule engine over TSX/JSX sources.
- MCP tool `review_ui` (remote + local).
- CLI `logic2b review [paths…] [--json] [--fail-on warning|error]`.
- `/docs/review` documenting every rule with a bad → good example.
- The agent benchmark scorer reuses the same rule ids for the composition
  task, so the benchmark measures what the tool teaches.
- `AGENTS.md` (guide 07) tells agents to run it before finishing UI work.

## Design

### Contract

```ts
interface ReviewRequest {
  files: Array<{ path: string; content: string }>   // ≤ 64 files, ≤ 256 KB total
  componentsJson?: string                            // to learn aliases + icon library
  preset?: string                                     // enables theme-aware rules
  scope?: Array<"primitives" | "tokens" | "states" | "a11y" | "motion" | "forms" | "icons">
}

interface ReviewFinding {
  rule: string              // "L2B-PRIM-001"
  severity: "error" | "warning" | "info"
  file: string
  line?: number
  column?: number
  message: string           // what and why, one sentence, user-facing impact first
  fix?: string              // the registry way, as a code snippet or item name
  docs: string              // absolute URL to the rule
}

interface ReviewResult {
  registryVersion: string
  summary: { errors: number; warnings: number; info: number; score: number } // 0–100
  findings: ReviewFinding[]
}
```

### Rules (v1)

| Id | Severity | Detects | Fix it suggests |
| --- | --- | --- | --- |
| `PRIM-001` | error | Raw `<button>`, `<input>`, `<select>`, `<textarea>` with styling classes where the registry primitive is installed or installable | `Button`, `Input`, `Select`/`NativeSelect`, `Textarea` |
| `PRIM-002` | error | Hand-rolled overlay: element with `role="dialog"`/`"menu"` not from registry | `Dialog`, `Sheet`, `DropdownMenu` |
| `TOK-001` | error | Hardcoded colors: `bg-[#…]`, `text-red-500`, `oklch(`, `rgb(` in className/style | semantic tokens (`bg-destructive`, `text-muted-foreground`) |
| `TOK-002` | warning | Arbitrary radius/shadow (`rounded-[…]`, `shadow-[…]`) | `rounded-md`/`--radius`, no shadows per DESIGN.md |
| `A11Y-001` | error | `Dialog`/`AlertDialog`/`Sheet` content without a `*Title` | add `DialogTitle` (visually hidden if needed) |
| `A11Y-002` | error | `Input`/`Select`/`Switch` without `Label`, `aria-label` or `aria-labelledby` | `Field` + `Label` |
| `A11Y-003` | error | Icon-only `Button` without an accessible name | `aria-label` or `<span className="sr-only">` |
| `A11Y-004` | warning | Any item whose `accessibility.consumer` duty is unmet, derived from the registry contract | the duty text verbatim |
| `STATE-001` | warning | A data-owning block (guide 02) rendered without `status` wiring, or `.map(` over props/state without an empty branch | `status` prop / `Empty` |
| `STATE-002` | info | `fetch`/`useQuery`/`useSWR` present but no loading or error branch in the same component | `Skeleton` + `Alert` |
| `MOTION-001` | warning | `animate-*`, `transition-*` on non-registry elements without a `motion-reduce:` variant or the `Motion` primitive | `Motion`, `motion-*` presets |
| `FORM-001` | warning | `<form>` without `Form`/`Field` and no validation library | `Form` recipe |
| `FORM-002` | info | Email/name/postal/telephone inputs without `autoComplete` | the correct `autoComplete` token |
| `ICON-001` | error | Icon imports from a package other than the one in `components.json` | rewrite the import |
| `TOUCH-001` | warning | Clickable element sized below 24 px (`h-4 w-4` + `onClick`) | `size="icon"` / hit-area padding |

Rule ids are stable and namespaced `L2B-<GROUP>-<NNN>`; the docs page is the
canonical description. Severity is user-impact ordered: errors are things a
real user will hit (cannot name a dialog, cannot see text in dark mode),
warnings are likely defects, infos are hygiene.

### Engine

- Parse with the TypeScript compiler API already used for
  `packages/registry/api.generated.ts` extraction (`typescript` is a workspace
  dependency; keep it out of the Worker bundle by shipping the engine as a
  separate entry that the remote MCP imports lazily — measure the bundle).
- Registry knowledge comes from `/r/index.json` + each item's `accessibility`
  and `states` — the engine never hardcodes component names.
- No execution of the reviewed code, ever. Same posture as `lint_theme`.

### Where it lives

| Piece | Path |
| --- | --- |
| Engine, rules, fixtures | `packages/review/src/{index,parse,rules/*.ts}`, `packages/review/test/fixtures/{bad,good}/*` |
| MCP | `packages/mcp/src/tools.ts` |
| CLI | `packages/cli/src/index.ts` (`review` command) |
| Docs | `apps/web/src/content/docs/review.mdx` (+ `docs-es`) |
| Benchmark | `benchmarks/agents/scripts/score.ts` (import rule ids) |

## Implementation steps

1. Scaffold `packages/review` (private workspace package, `node:test`, strict
   TS) with the parser wrapper and the finding types.
2. Implement rules in this order: `TOK-001`, `A11Y-001..003`, `PRIM-001`,
   `ICON-001` (all high-confidence), then `MOTION-001`, `FORM-*`,
   `TOUCH-001`, then `STATE-*` (need guide 02 metadata; ship as `info` until
   it lands).
3. Fixture corpus: for every rule, one file that must trigger it and one that
   must not. Add the registry's own blocks and demos as a "must produce zero
   errors" corpus — the registry has to pass its own review.
4. Register `review_ui` in MCP with the size limits; return the docs URL per
   finding.
5. CLI `review` reading the paths, printing grouped findings with
   `file:line`, exit code by `--fail-on`.
6. Docs page generated from the rule table (one source of truth in
   `packages/review/src/rules/index.ts` exporting `RULES` with `docs`
   strings).
7. Wire the benchmark scorer: composition task deducts per error id found.
8. Optional: a `logic2b review` GitHub Action example in `/docs/review`.

## Gates

- `pnpm --filter @logic2b/review test`: every rule has a positive and a
  negative fixture; the registry corpus yields zero errors.
- MCP test: `review_ui` rejects oversize input and returns schema-valid
  results.
- Bundle budget: the remote MCP worker size after adding the engine stays
  within the Cloudflare limit; assert in `apps/web` budgets.
- Benchmark tests still pass (`pnpm benchmark:agents:test`).

## Out of scope

- Runtime checks (axe in a browser) — that is the site's CI job, not a tool.
- Auto-fixing — `fix` is a suggestion; the host applies it.
- Non-React sources.

## Open questions

- Should `score` be published in `AGENTS.md` as a required threshold
  ("do not finish below 90")? Yes for errors; keep warnings advisory until
  guide 09 shows the false-positive rate.
