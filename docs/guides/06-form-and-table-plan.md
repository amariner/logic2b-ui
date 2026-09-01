# 06 — `form_plan` and `table_plan`

**Status:** proposed · **Lane:** understand intent · **Target:** v1.1 ·
**Depends on:** [02 UI states & content contract](./02-ui-states-and-content-contract.md)
for the empty/error conventions; [03 review_ui](./03-review-ui.md) is its
verifier.

## Why (the user)

Forms and tables are most of what people do in software, and they are where
agent-written UI hurts the most: inputs without labels, errors nobody can
find, no `autocomplete` so a phone user types their email for the fifth
time, tables that are unusable on mobile and have no empty state. The
registry already has `Form`, `Field`, `Input`, `Select`, `data-table`,
`Stepper` and the states vocabulary. Two planners turn a schema or a sample of
data into a correct composition of them, deterministically.

## What ships

- MCP tools `form_plan` and `table_plan`; CLI `logic2b form --schema <file>`
  and `logic2b table --sample <file>`.
- Shared cores `packages/scaffold/src/forms.ts` and `tables.ts`.
- Docs pages `/docs/forms` and `/docs/tables` with the mapping tables.
- Benchmark tasks 5 and 6.

## Design

### `form_plan`

```ts
interface FormPlanRequest {
  schema: { kind: "json-schema"; value: object } | { kind: "zod"; source: string }
  intent?: "signup" | "login" | "checkout" | "profile" | "settings" | "contact" | "generic"
  layout?: "single" | "sections" | "wizard"   // wizard uses Stepper
  submitLabel?: string
  locale?: string
  preset?: string
  version?: string
}

interface FormPlan {
  files: Array<{ path: string; content: string }>   // the form component + schema module
  install: { items: string[]; dependencies: string[] } // Form, Field, Input…, zod, react-hook-form
  fields: Array<{ name: string; component: string; autoComplete?: string; validation: string[] }>
  states: { submitting: "built-in"; success: "slot"; error: "built-in" }
  a11y: string[]                                       // what the generated form guarantees
  proposalUrl?: string
}
```

Mapping (deterministic, documented):

| Schema shape | Component | Notes |
| --- | --- | --- |
| `string` | `Input` | `format: email/uri/tel/date` → matching `type` + `autoComplete` |
| `string` with `maxLength > 120` or `x-multiline` | `Textarea` | counter when `maxLength` |
| `enum` ≤ 5 | `RadioGroup` | ≥ 6 → `Select` (or `NativeSelect` when `intent` is mobile-first) |
| `boolean` | `Switch` for settings, `Checkbox` for consent/terms |
| `number`/`integer` | `NumberField` | min/max/step from schema |
| `string` `format: date` | `DatePicker` | |
| `array` of `enum` | `TagsInput` or checkbox group | by cardinality |
| `array` of `string` | `TagsInput` | |
| `file` / `contentEncoding` | `FileDropzone` | |
| `object` | `Field` group with legend; `layout: "wizard"` → one step per object | |

Every field renders `Label`, description and error via `Field`; the error
summary is an `Alert` with `role="alert"` linked to fields; the submit button
disables while submitting and announces success once. Known intents add
`autoComplete` (`username`, `current-password`, `new-password`,
`cc-number`…).

### `table_plan`

```ts
interface TablePlanRequest {
  sample: Array<Record<string, unknown>>       // ≤ 50 rows, used to infer columns
  columns?: Array<{ key: string; label?: string; kind?: ColumnKind; sortable?: boolean }>
  features?: Array<"sort" | "filter" | "paginate" | "select" | "export" | "row-actions">
  responsive?: "scroll" | "cards" | "priority-columns"
  density?: "compact" | "comfortable"          // guide 08 axis when it lands
  preset?: string
  version?: string
}
```

Column kinds are inferred from the sample (`text`, `number`, `currency`,
`date`, `status`, `boolean`, `link`, `avatar`) with formatters and alignment
rules; `status` values become `Badge`s. The plan returns the `data-table`
composition with column defs, toolbar, empty/loading/error states from guide
02, a mobile strategy (`cards` renders each row as an `Item`), and the
`install` set. Row actions use `DropdownMenu` with accessible names that
include the row identity.

### Where it lives

| Piece | Path |
| --- | --- |
| Cores + tests | `packages/scaffold/src/{forms,tables}.ts`, `packages/scaffold/test/{forms,tables}.test.ts` |
| MCP | `packages/mcp/src/tools.ts` |
| CLI | `packages/cli/src/index.ts` |
| Docs | `apps/web/src/content/docs/{forms,tables}.mdx` (+ `docs-es`) |
| Benchmark | `benchmarks/agents/protocol.json` |

## Implementation steps

1. JSON Schema subset parser (draft 2020-12 core keywords) and a zod source
   parser using the TypeScript API from guide 03 (no evaluation of the zod
   source).
2. Field mapping + code generation for forms; snapshot tests per schema
   fixture; generated forms must type-check as a consumer project (extend
   `test:scaffolds`).
3. Column inference + generation for tables; the same snapshot and
   type-check gates.
4. MCP tools, CLI commands, docs, benchmark tasks with rubrics that award
   labels, error linkage, `autoComplete`, empty state and mobile strategy.
5. Run `review_ui` on the generated output as a test: zero findings.

## Gates

- Snapshot + type-check tests for every fixture in `packages/scaffold/test`.
- `test:scaffolds` builds one generated form and one table per framework.
- axe on a docs demo of each generated composition.
- Benchmark tests pass with the new tasks.

## Out of scope

- Server actions, data fetching, mutations, validation on the server.
- Rich editors and file uploads beyond `FileDropzone`.
