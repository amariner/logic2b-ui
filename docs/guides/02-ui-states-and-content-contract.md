# 02 — UI states & content contract

**Scope:** M1-01 customer list and edit form · **Lane:** guarantee quality ·
**Depends on:** M0-01–M0-04. Status and evidence live in `docs/EXECUTION.md`.

The 5 September 2026 queue decision narrows this guide to the reference customer
journey. Do not expand contracts across the catalog before completing that
journey. Uncovered blocks do not imply state support.

## Delivered slice

`admin-customers-01` accepts customer data, request status, content overrides,
controlled or local search, create/edit/retry callbacks and write permission.
Its counts derive from supplied records. Empty data and unmatched searches are
distinct. Missing callbacks disable their actions; the block never fetches.

`customer-edit-01` accepts a controlled draft and change/submit callbacks. It
provides labeled name/email/company/segment fields, basic name/email validation,
linked field errors with first-invalid focus, submitting protection, preserved
input after failure, retry and application-confirmed success. Dirty Cancel
shows Keep editing/Discard changes. `onCancelRequest` delegates that guard to
the host so dialogs can share a confirmation for Cancel, Escape and outside
clicks. Consumers must guard navigation, enforce authorization and validation
on the server, and set submitting before awaiting persistence.

The integrated list demo creates and edits in-memory records through a dialog,
restores focus, blocks dismissal while saving, and demonstrates a failed save
followed by retry. These examples do not supply a backend.

## Shared contract

`RegistryItem.behavior?: RegistryBehavior` is optional for compatibility with
historical releases and uncovered items. Both covered blocks require it.
`schemaVersion: 1` is bounded and validated by shared core in
`packages/scaffold/src/behavior.ts`; unsupported versions and unknown fields
fail with actionable errors. `/schema/behavior.json` publishes the same schema.
The wrapper leaves the registry index's existing `content` payload URL intact.

The contract contains:

- All twelve states: idle, loading, empty, no-results, error, success,
  submitting, validation-error, permission-denied, unsaved, offline and partial.
  Each declares built-in, consumer or not-applicable support, a trigger and
  optional transitions/preserved input. Offline detection and partial list
  disclosure belong to the consumer.
- Text content slots with stable keys, `content.<key>` paths, exact source
  samples and copy guidance. Both source files export a typed `content` object
  and accept partial overrides. Slots describe declared copy, not every
  possible literal in the file.
- Actions with actual public prop names and consumer responsibilities; closed
  customer intents, journey neighbors, responsive strategy and touch targets.
- Explicit responsibilities for data, persistence, permissions, navigation,
  focus and preservation of copied-source customizations.

The registry linter parses source with TypeScript AST to verify declared copy
paths/samples and action props. It never imports or executes supplied source.
Core validation and negative source fixtures protect against drift.

## Adapters and documentation

| Piece | Path |
| --- | --- |
| Shared type/schema/validator | `packages/scaffold/src/behavior.ts` |
| Covered metadata | `packages/registry/behavior.ts` |
| Item/index/manifest construction | `packages/registry/scripts/build-registry.ts` |
| Source verification | `packages/registry/scripts/behavior-source.ts` |
| Live States section and content/actions tables | `apps/web/src/pages/blocks/[category]/[name].astro` |
| Interactive variants | `apps/web/src/block-demos/{admin-customers-01,customer-edit-01}.tsx` |
| Copy Prompt and generated AGENTS | `apps/web/src/lib/{prompts,agents-md}.ts` |
| MCP read/install schemas and plans | `packages/mcp/src/{registry,tools,plan,output-schemas}.ts` |
| CLI read/install adapter | `packages/cli/src/{lib,scaffold}.ts` |

Covered detail pages show a States section with a native selector and one live
iframe for built-in variants, followed by the full support table. Consumer and
inapplicable states have explanations. Query parameters select demo states;
they do not change the component API. Copy Prompt, generated AGENTS and install
plans carry the same duties. MCP returns plans and evidence, without assuming
access to a consumer filesystem.

Registry `1.0.0-rc.17` adds the edit form and replaces the list in a new immutable
manifest. Historical manifests/content-addressed bytes must remain unchanged.
Source changes and local artifacts do not mean npm or website publication.

## Gates

- Shared validation/source tests, package lint/tests, root lint/tests.
- Registry build/integrity and historical-byte preservation.
- CLI/MCP install parity, malformed-contract rejection and packed artifact gate.
- Functional keyboard create/edit/discard/recovery flows at 390 and 1280 px.
- Built-in state captures in light/dark at both widths, overflow checks and
  zero serious/critical structural axe violations. Contrast is audited through
  the existing token checks; this does not claim every custom palette passes.
- Relevant visual baselines reviewed before acceptance, web build and existing
  bundle budgets. Record exact results and any environment limits in execution.

## Next slices and boundaries

M1-02 adds project context and its local collector; M1-04 adds static review
grounded in this contract. Later journey
slices may add states or neighboring blocks with implementation and evidence.
Runtime data fetching, backend storage, translation bundles, automatic route
guards and full-catalog metadata are outside M1-01.
