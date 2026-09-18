# 15 — Preserve a customer interface through changes and updates

Status: implemented with local acceptance evidence and explicit contrast review
needs. Task: M2-03. Depends
on [incremental change plans](./11-incremental-change-plan.md) and
[consumer verification](./12-consumer-verification.md). The
[execution queue](../EXECUTION.md) records the actual checks and delivery status;
this guide does not establish publication or deployment.

## Outcome

An agent can extend an existing customer interface and accept an upstream fix
without losing the consumer's column, copy or theme. The acceptance fixture
replays the same customer interactions after each maintenance step. It also
requires stale plans and real merge conflicts to remain visible instead of
silently replacing newer local work.

This is a deterministic repository fixture around existing scaffold, install,
change, update and verification APIs. It adds no public MCP tool and does not
claim to synthesize business logic from a natural-language request. The existing
21-tool MCP surface remains unchanged.

## Three stages

The fixture creates a fresh Vite consumer and installs `admin-customers-01`,
`customer-edit-01` and their dependencies from the committed, immutable
`1.0.0-rc.17` registry. Installation provenance must agree with those payloads.
All records and addresses are synthetic. The consumer owns sorting, simulated
persistence, permission outcomes and focus restoration.

1. **Customized.** The first local implementation adds an `Account owner`
   column immediately after `Customer`, with Lin Park, Zara Ruiz and Noah Reed
   assigned to the existing records and Avery Stone to a newly created record.
   The column appears from the small-screen breakpoint upward; narrower views
   show `Account owner: …` in the customer-cell summary so the same information
   remains available on mobile. It changes the
   default heading to `Customer workspace` and the description to
   `Your team, your customer relationships.` The consumer stylesheet appends
   a light-theme `--primary: #075985` and `--primary-foreground: #ffffff`
   override. These are deliberate local edits to preserve.
2. **Changed.** A hand-authored candidate adds a labeled `Customer segment`
   selector with all, active, new and churned values. It combines with the
   existing name/email search and consumer-owned stable sorting. Clearing the
   search preserves the chosen segment. The candidate keeps the custom column,
   copy and token override and is applied through the bounded change workflow.
3. **Updated.** The consumer updates from the actual rc.17 payloads to actual
   rc.18 payloads. That upstream change adds a minimum table width and a named,
   keyboard-focusable scroll region so that increased text does not collapse
   the customer-name cell. The local column, copy, filter and theme must survive
   the three-way merge. Old immutable payloads are never rewritten.

An explicit `--registry-version` applies to that update command; it does not
change the consumer's configured version pin. After the successful merge, a
separate fresh change plan advances only `components.json`'s
`logic2b.version` to rc.18 while preserving its other fields. A subsequent
default-version CLI status check must resolve rc.18. This is an explicit
consumer configuration edit, not an implicit change to update policy. The
updated browser report links to the pin-change plan id; preservation artifacts
also retain the earlier filter-plan id.

The increased-text scenario runs only after the upstream update: rc.17's known
defect is the reason for that update. Ordinary mobile interactions run at every
stage. This fixture does not hide the older defect with consumer CSS.

## Independent browser expectations

`packages/cli/test/fixtures/customer-journey/suite.ts` reuses the independent
reference interaction suite, then supplies literal expected column and row text.
It imports no component source, host records, candidate-edit helpers or registry
behavior metadata to derive expected results. Successful creation and editing
must preserve the expected account owner as part of the complete row assertion.

The stages declare 212, 232 and 256 checks respectively across 390 × 900 and
1280 × 900 viewports. The count describes declared coverage, not a passing run.
Coverage includes filtering, stable sorting, loading, no data versus no match,
error/retry, validation errors linked to inputs, submitting, saved and failed
edits, preserved drafts, read-only and permission-denied states, and keyboard
opening, navigation, closing and focus restoration. The changed and updated
stages additionally check every segment, combined search, retained query and
segment, and restored stable sort. The updated stage includes translated labels,
long names, 200% text and the table's keyboard scroll region.

The trusted repository runner also measures the desktop account-owner column,
mobile owner summaries and computed semantic colors. Merely finding a token declaration or column
string in source does not prove that the browser renders it. Browser screenshots
are review artifacts; a successful capture does not approve their appearance.
The custom header permits wrapping, and browser text bounds must remain inside
its cell so the added column does not overlap the neighboring heading.

The runtime gate must reject failures, skipped checks, missing checks and
unexpected unknowns. It may retain only the narrowly validated axe
`color-contrast` incomplete result caused by `elmPartiallyObscured` inside the
increased-text scroll region, as described in guide 12. Those checks remain
`unknown`, require human review and do not become accessibility passes. No axe
rule is disabled. A separate trusted browser replay resolves every incomplete
node's CSS selector and requires all matches to belong to the named customer
table; an obscured heading or form control cannot use this exception. This
ancestry measurement is recorded separately from the original axe observation
and does not establish contrast or reproduce that observation's exact moment.
Runtime results and remaining review needs belong in the
execution handoff after the commands actually run.

## Maintenance failures are part of acceptance

The fixture must exercise a stale change plan against a newer local edit and
prove that rejection preserves that edit. Reapplying an already applied plan
must be a no-op with unchanged source bytes. The successful second request must
be linked to its actual plan id in the corresponding browser suite.

The real upstream change touches the table opening line beside the locally
customized header. Adjacent edits to different base lines must merge without
inventing a conflict or dropping either change. Focused merge tests cover that
boundary, insertions and overlapping ranges; the actual immutable payload
update supplies the integration case.

A separate deliberate local change to the same table-opening line overlaps
rc.18's upstream change. That case must report an explicit conflict and preserve
the information needed to resolve both sides. The fixture must not use forced
overwrite, silently choose an implementation or count an unresolved conflict
as a successful update. A repeated unresolved update must fail without changing
the marked source or metadata, including when a later version removes or renames
the conflicting file. An explicit fresh change plan then combines the
local table presentation choice with the upstream fix and retained customizations;
the next update must preserve that resolution. Conflict behavior, resolution
and the clean merge all require recorded evidence; implementation intent alone
is insufficient.

## Execution and evidence boundary

Preparation, dependency installation, build, checking, change and update are
separate phases. Verification serves an existing production build on loopback;
it never installs dependencies or builds the app implicitly. Browser tools are
explicitly installed or a compatible local Chromium executable is supplied.
Each build phase records its process result, selected-source hashes before and
after the build, and the produced distribution hashes. A failed build or a
source/build mismatch prevents a passing lifecycle gate.

Reports retain the stage, selected-file fingerprint, declared suite and plan
id where applicable, routes, viewports, tool versions and hashed local evidence.
The runner's build record connects its observed build process to the files it
subsequently serves. These are local host observations, not a cryptographic
attestation of tool execution, an authenticity signature or proof about every
file in the project. The shared verification report correctly retains
`servedSourceBinding: "unverified"`. Remote `verify_report` validates submitted
data and never fetches artifacts, starts an app or executes browser checks.

Use the runnable phases documented in the
[fixture README](../../packages/cli/test/fixtures/customer-journey/README.md).
Keep evidence for all three stages and the negative maintenance cases. The
artifacts include the original marked conflict source and before/after file
hashes and metadata for dry-run, stale rejection and repeated operations. The
execution handoff must record exact commands, browser results, screenshot
review, remaining unknowns and CI configuration separately from CI executions.
