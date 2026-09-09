# 02 — Customer states, content and action contract

Status: M1-01 implemented; see the execution queue for verification evidence. Scope: `admin-customers-01` and
`customer-edit-01`; broader catalog coverage follows reference-journey evidence.
This scoped decision from the execution queue supersedes the original proposed
38-block rollout and its speculative release dates.

## Wire contract

`RegistryItem.behavior` is additive version-1 metadata shared by the registry,
MCP discovery/detail/install plans, block documentation and agent prompts.
[Shared types and JSON schema](../../packages/scaffold/src/behavior.ts) are the
contract; [registry metadata](../../packages/registry/states.ts) declares it.
The JSON schema is published at `/schema/behavior.json`, referenced by the
existing `/schema/registry-item.json` endpoint.

The nested object avoids a collision: top-level `content` already means the
immutable payload URL in registry discovery and MCP detail responses. Within
`behavior`, `content` lists copy slots, `states` describes triggers and
transitions, `actions` maps callbacks to consumer duties, and `intents`,
`journey`, `responsive` and `consumer` document composition responsibilities.
Every known state must explicitly be built-in, consumer-owned or not applicable.
MCP validates behavior in both manifest entries and verified payloads, rejecting
malformed contracts and unsupported schema versions before exposing instructions.
Do not infer offline persistence, server authorization or pagination from this
metadata. Old snapshots have no behavior field and remain valid.

Source exports a typed `content` object; consumers can override strings with
`copy`. Declared paths and samples are checked statically using the TypeScript
AST, without executing source. The contract lists priority copy slots; all
remaining labels are also available in the source content object. Intents use
an explicit shared vocabulary. Responsive claims must have browser evidence.

## Customer list

```tsx
<AdminCustomers
  customers={customers}
  status={loadStatus}
  canEdit={permissions.canEdit}
  onCreate={openCreateForm}
  onEdit={openCustomerForm}
  onRetry={reloadCustomers}
/>
```

`customers` defaults to `[]`; the previous fictional data and aggregate counts
now live only in the demo. Supplied rows determine totals, active/new counts and
local case-insensitive name/email filtering. Prefer stable `id` values; email
is a compatibility fallback. `defaultQuery` initializes local search.

- `idle` renders rows, a first-customer empty message or no matching results.
  Clear search resets only the filter.
- `loading` disables actions and search and announces progress.
- `error` hides stale data, offers `onRetry` and preserves the search string.
- `permission-denied` hides rows and disables actions. `canEdit=false` renders
  read-only rows. Missing callbacks disable their actions.

On mobile, orders and spend appear under each name; names and emails wrap,
last-order dates are hidden below the medium breakpoint, and controls have a
minimum 44px height. Consumers own partial datasets, server search and paging.
The removal of static sample data and inert menu items is intentional; existing
applications should supply data and callbacks when updating this block.

## Customer form

```tsx
<CustomerEdit
  key={customerId}
  value={draft}
  savedValue={lastSavedDraft}
  status={saveStatus}
  fieldErrors={serverErrors}
  onValueChange={updateDraftAndClearStaleErrors}
  onSave={persistCustomer}
  onCancel={closeAndRestoreFocus}
/>
```

`value`, `savedValue` and `onValueChange` are required. The component validates
required name/email, focuses the first invalid field and calls `onSave` with
trimmed values. `fieldErrors` associates server errors with their inputs.
Status is controlled: `idle`, `loading`, `submitting`, `error`, `success` or
`permission-denied`. A missing save callback disables Save.

Set `submitting` synchronously in `onSave`, authorize and persist on the server,
then update `value` and `savedValue` and set `success`. On rejection keep the
draft and set `error` or `permission-denied`. Catch the asynchronous rejection
in the consumer; the component does not run a request or await the callback.
Inputs and Save lock during loading/submitting/denial; Cancel locks during
submission. A local validation pass is never server authorization.

A changed draft displays an unsaved message. Cancel asks for discard
confirmation, focuses Keep editing and restores Cancel focus if kept. Discard
calls `onCancel`. The consumer protects other navigation/record switches and
restores focus when closing the editor. Remount by record id to clear local
validation state. No browser-close protection or offline storage is implied.

## Demonstration and verification

The [integrated demo](../../apps/web/src/block-demos/admin-customers-01.tsx)
connects both blocks, supports create/edit, duplicate-email validation, a failed
save followed by retry, server-denied save and reload recovery. Data is local
in-memory demonstration data; it resets on reload. The editor locks list writes
until closing, preventing an accidental record switch from discarding a draft.

Both block pages include keyboard-operable Preview/States tabs, live built-in
states through `?state=`, content slots and consumer duties. Consumer-owned and
inapplicable states display explanations rather than fabricated previews.

Required gates:

- Registry build/integrity, source-slot/schema tests and registry lint.
- MCP discovery/detail/install-plan nested schema and text/structured parity;
  packed release-artifact smoke for the distributable tools.
- Workspace TypeScript checks and regression tests.
- `tests/customer-journey.spec.ts`: create/edit, validation, failure/retry,
  unsaved confirmation/focus, permission denial, 390/768/1280px overflow checks,
  States tab keyboard interaction, built-in state axe and light/dark snapshots.
- Existing customer-block visual baselines reviewed for intentional UI changes;
  retain unrelated baselines and historical immutable registry bytes.

The existing axe policy excludes color-contrast. Do not describe that limited
suite as a full accessibility certification. No data-fetching dependencies,
localized bundles or automatic publication are part of this implementation.
