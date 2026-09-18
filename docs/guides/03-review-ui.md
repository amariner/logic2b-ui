# 03 — Evidence-based static UI review

**Status:** implemented source candidate (M1-04); publication/deployment tracked
separately · **Contract:** v1 · **Scopes:** `tokens`, `a11y` only.

## User outcome and boundary

Review selected TSX/JSX before handing off a composition. The shared engine
reports demonstrated findings, their source evidence and unresolved context.
It never executes submitted code, resolves imports, reads a registry, writes
files or awards an accessibility score. Native HTML is valid. A custom
component name is not proof of its rendered semantics.

The current candidate is deliberately four rules, not the broader catalog in
the earlier proposal. CLI `review`, local/remote MCP `review_ui` adapters and
the documentation use `packages/review`. A source implementation does not
establish availability in the published npm package or deployed endpoint:
check CLI `--help` or MCP `tools/list` first.

## Version-1 request

```ts
interface ReviewRequest {
  schemaVersion?: 1
  files: Array<{
    path: string                         // normalized project-relative .tsx/.jsx
    content: string
    labelContext?: "partial" | "complete" // partial by default
  }>
  scope?: Array<"tokens" | "a11y">         // both by default
  policy?: { semanticColors?: boolean }  // disabled unless explicitly true
}
```

Inputs are bounded to 64 files, 256 KiB of total UTF-8 source and 256 characters
per path. Unsafe/duplicate paths, unsupported fields or versions and invalid
scope/policy values reject. The traversal budget is 50,000 AST nodes per
request. Each findings/unknowns/suppressed array is capped at 512 entries;
each file allows at most 128 reasoned suppression directives. Exhausting a
processing/output budget sets `truncated`; a parse failure is an unknown with
no rules evaluated for that file. The engine uses `@babel/parser` to parse
source as data; imports and project configuration are never evaluated.

`labelContext: "complete"` is an explicit assertion by the host that external
labels, caller ancestors and composition cannot supply a missing name. It is
not inferred from the number of submitted files. Do not assert it for isolated
primitives or unresolved compositions. Even with this assertion, spreads,
dynamic names, custom wrappers and ambiguous references remain unknown.
Cross-file label resolution is not supported.

## Version-1 result

`schemaVersion: 1` results include `summary`, `findings`, `unknowns`,
`suppressed`, `evaluatedRules`, `disabledRules`, `assumptions` and `truncated`.
Each finding has a stable rule id, severity, category, confidence, evidence,
relative file path, one-based line/column, message, suggested fix and docs URL.
The summary counts unsuppressed findings only. A suppression retains the
entire finding and its explanation in `suppressed`.

`evaluatedRules` means a rule ran against at least one parsed file; it does not
mean every use passed or every file was understood. `disabledRules` explains
scope exclusions and an absent semantic-color policy. `unknowns` and
`truncated` are incomplete evidence, never a passing accessibility result.
The result has no `registryVersion`: this engine does not read the registry.

## Implemented rules

The machine-readable source of truth is
[`packages/review/src/rules.ts`](../../packages/review/src/rules.ts), including
the examples and documentation anchors. The English and Spanish website and
plain-Markdown docs render that catalog.

| Id | Category | Evidence boundary |
| --- | --- | --- |
| `L2B-TOK-001` | design-policy, error/high | Explicit `semanticColors: true`; supported literal color utilities and inline style values bypass semantic tokens. Dynamic styling is unknown; stylesheet token overrides are outside scope. |
| `L2B-A11Y-001` | defect, error/high | Native dialog or native element with a literal dialog/alertdialog role has no supported authored name, within declared complete label context. |
| `L2B-A11Y-002` | defect, error/high | Supported native input/select/textarea has no supported authored name, within declared complete label context. |
| `L2B-A11Y-003` | defect, error/high | Native button or supported input action has no supported authored name, within declared complete label context. |

Names can come from static text, native labels, `aria-label`, locally resolved
`aria-labelledby` and supported native naming fallbacks. Resolution is bounded
to the same JSX/function context. Hidden elements, external labels, conditional
references, dynamic values and custom components require careful treatment;
see the positive/negative/unknown fixtures for the supported subset.

Reasoned exceptions apply to one rule on the next source line only:

```tsx
// logic2b-review-disable-next-line L2B-TOK-001 -- Approved brand swatch example
const swatch = <div className="bg-red-500" />
```

Use a known rule id and a 3–200 character reason. This records an exception;
it does not change a finding into proof of accessibility. Invalid directives
do not suppress findings.

## Adapters and workflow

Build the checkout with `pnpm --filter logic2b build`, then:

```bash
node packages/cli/dist/index.js review src/CustomerPage.tsx --cwd /path/to/app --semantic-colors --json
```

The CLI requires explicit files/directories, reads TSX/JSX only, rejects
symlink/hard-linked files, external paths, private/dependency directories and
overlapping file selections. It does not auto-read the whole repository.
Use `--complete-label-context` only when that assertion is justified;
`--scope tokens,a11y` selects the supported scopes. `--fail-on error` is the
default, with `warning` also accepted. Exit 1 means the selected finding
threshold was reached; exit 2 means invalid review input, a parse unknown or
truncated review. Commander usage errors retain their standard exit 1.
Ordinary semantic unknowns do not fail the command, so exit 0 alone is not
a complete review.

MCP receives the same bounded request as `review_ui` arguments. It has no
filesystem access: the host selects and supplies source. The result follows
the MCP structured/text parity contract. Fix suggestions are text, not writes;
the host applies authorized changes and verifies the consuming application.

The composition benchmark reports the shared rule ids/result beside its
existing protocol score. Semantic colors are explicit in that task's prompt;
label context stays partial. Review findings/unknowns never award or deduct
points, replace the evaluator-observed build or alter historical protocol
criteria. Runtime, keyboard, mobile and human outcomes remain independent
evidence under guides 12 and 14.

## Verification and ownership

| Piece | Path |
| --- | --- |
| Shared contract, parser, rules, fixture tests | `packages/review` |
| CLI collector/command | `packages/cli/src/review.ts`, `packages/cli/src/index.ts` |
| MCP adapters/schema/protocol tests | `packages/mcp` |
| Localized docs/shared rule rendering | `apps/web/src/content/{docs,docs-es}/review.mdx`, `apps/web/src/data/review-rules.ts` |
| Independent scorer + supplementary rule report | `benchmarks/agents/scripts/scorer.mjs` |

Required checks: `pnpm --filter @logic2b/review test` and `lint`, relevant
CLI/MCP tests including bounded invalid inputs and protocol envelopes,
`pnpm benchmark:agents:test`, web lint/build and Worker bundle budget,
and `pnpm test:release-artifacts`. Record actual outcomes in the execution
queue. Registry/demos are partial-context evidence: zero findings alone must
never be promoted to a claim that every component is accessible.

## Deferred

Custom component/import resolution, registry-derived responsibilities, icon,
radius, motion, touch-size, form-validation and state rules are deferred.
There is no `primitives`, `states`, `motion`, `forms` or `icons` scope, no
`componentsJson`/`preset` input, no automatic fixes and no non-React parser.
Runtime checks belong to consumer verification, not this static engine.
