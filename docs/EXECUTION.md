# Agent execution queue

Canonical direction: [ROADMAP](../ROADMAP.md). Updated 18 September 2026.
Owners below identify active work, not permanent maintainers. `ready` means
the scope is specified; only start after the Dependencies column is satisfied.
`planned` is a milestone, not a shipped API. Completed evidence is recorded below.

| ID | Task and guide | Dependencies | Status | Owner |
| --- | --- | --- | --- | --- |
| REL-03 | Publish paired CLI/MCP `1.0.0-rc.3` to npm `next` (user authorized) | SYNC-01 | in-progress | Codex |
| SYNC-01 | Integrate pending theme gallery, MCP contracts and release documentation (user requested) | M0-04 | done | Codex |
| DIR-01 | Reorient roadmap, contributor instructions and executable contracts | — | done | current agent |
| M0-02 | Typed MCP results with backward-compatible text — [13](guides/13-mcp-contracts.md) | DIR-01 | done | current agent |
| M0-01 | Honest beta onboarding and advertised package selectors — [00](guides/00-public-beta.md) | DIR-01 | done | Codex (M0-01) |
| M0-03 | Immutable default registry resolution — [13](guides/13-mcp-contracts.md) | M0-02 | done | Claude (M0-03) |
| M0-04 | MCP input/resource limits and negative protocol corpus — [13](guides/13-mcp-contracts.md) | M0-02 | done | Claude (M0-04) |
| M0-05 | Public landing/demo and contributor/release health — [00](guides/00-public-beta.md) | M0-01 | in-progress (code/docs landed; video + pilot pending) | Claude (M0-05) |
| EVAL-01 | Comparative protocol and baseline measurements — [14](guides/14-outcome-evaluation.md) | DIR-01 | in-progress (protocol/reporting landed; real measurements pending) | Codex (EVAL-01) |
| M1-01 | State/content/action contract; customer list + edit form first — [02](guides/02-ui-states-and-content-contract.md) | M0-03 | done | Codex (M1-01) |
| M1-02 | Project context contract and local collector — [10](guides/10-project-context.md) | M0-04 | done | Codex (M1-02) |
| M1-03 | Agent rules delivered with installs — [07](guides/07-agent-rules-distribution.md) | M0-01 | done | Codex (M1-03) |
| M1-04 | Evidence-based static review; high-confidence rules first — [03](guides/03-review-ui.md) | M1-02; M1-01 for states | done | Codex (M1-04) |
| M2-01 | Incremental change plan and preconditioned apply — [11](guides/11-incremental-change-plan.md) | M1-02 | done | Codex (M2-01) |
| M2-02 | Consumer runtime verification — [12](guides/12-consumer-verification.md) | M1-01, M1-04 | done | Codex (M2-02) |
| M2-03 | Customer journey create/change/update acceptance fixture — [15](guides/15-customer-journey-acceptance.md) | M2-01, M2-02 | done | Codex (M2-03) |
| M3-01 | Structured composition core — [01](guides/01-compose-plan.md) | M1-01, M1-02 | ready | — |
| M3-02 | Versioned proposal preview/install equivalence — [04](guides/04-proposal-links.md) | M3-01 | ready | — |
| M3-03 | JSON Schema forms and explicit-column tables — [06](guides/06-form-and-table-plan.md) | M1-04, M3-01 | ready | — |
| M3-04 | One MCP Apps proposal pilot, web fallback — [04](guides/04-proposal-links.md) | M3-02, M0-02 | ready | — |
| M4-01 | Accessible agent-run block and event contract — [05](guides/05-ai-product-kit.md) | M1-01, M2-02 | ready | — |
| PREF-01 | User preference support — [08](guides/08-user-preferences.md) | M1-01; prioritize observed accessibility gaps | ready | — |
| EVAL-02 | Opt-in aggregate feedback — [09](guides/09-outcome-feedback-loop.md) | EVAL-01 and five external pilot observations | ready | — |

## Delivery sizes and acceptance

M0-01 includes fixing the human MCP link and documenting host capabilities.
Centralize the advertised beta package selector; do not blanket-edit archived
benchmarks or immutable registry artifacts. Release verification must execute
the same public commands that onboarding recommends.

M0-02 is additive: structured results equal the JSON represented by the text
fallback. Every tool declares a real output schema and read-only annotations.
Test successful and failed calls through the actual stdio package handshake;
do not add a generic permissive schema just to tick a box.

M0-03 chooses the public registry's default channel once, resolves an exact
manifest and verifies every transitive file payload. No silent fallback to
mutable data after a verification failure. Keep any deliberately supported
legacy/raw API explicit and outside the verified contract. Tests cover default,
explicit version, channel movement, missing manifest and tampered content.

M0-04 covers byte/count limits, invalid argument types, protocol envelopes,
input-size failures and bounded errors. Preserve legitimate remote/stateless
clients; public read-only access does not require adding account infrastructure.

M1-01 first delivery is two blocks with honest consumer responsibilities,
controlled data/actions and a state matrix. Extend coverage only after the
reference interaction works. A static content object alone is not completion.

M1-04 starts with proof-backed accessible-name and token-policy findings plus
false-positive fixtures for wrappers, external labels and native controls.
Unresolved cross-file semantics are `unknown`, not accessibility failures.

M2-03 must preserve a deliberate custom column, custom copy and a token override
across the second request and an upstream update. Record conflicts explicitly;
never silently overwrite them. Exercise keyboard, mobile, empty, failure/retry,
submitting and permission-denied cases with independent assertions.

M3-03 starts with a documented JSON Schema subset and explicit column metadata;
Zod source parsing and inference are later additions, not blockers. Unsupported
constructs return gaps. No evaluating schema source or fetching application data.

## Decisions superseding earlier guides (5 September 2026)

- Milestone dependencies here replace speculative v1.0/v1.1 calendar ordering.
- Composition accepts structured requirements. Brief matching is optional
  discovery; it does not claim to understand arbitrary product intent.
- Review findings distinguish design policy, demonstrated defects and unknowns.
  No mandatory global numeric quality score; no blanket ban on native HTML.
- Preview ids include an exact registry version. A copy/approve UI action alone
  is not authority for a host to mutate a repository or execute a tool.
- Start the AI kit with agent runs/recovery, not eleven chat primitives.
- Consumer runtime verification complements static review and site CI.
- Agent rules mention tools only when available; no instruction to run an
  unimplemented command. Preserve project instructions outside managed markers.
- Published outcome evaluation needs a baseline and repeated trials. Edits after
  installation are customization signals, not automatically user dissatisfaction.

## Handoff log

Append a dated entry per completed task with scope, verification, omissions and
next task. Do not mark a whole milestone complete after finishing one row.

### 5 September 2026 — DIR-01

Replaced the execution roadmap with outcome-based milestones, preserved the
previous roadmap, added repository agent instructions and six implementation
guides. Revised existing composition/review/proposal/state/rules/AI-kit guidance
to remove conflicting assumptions. Checked local documentation links and diff
whitespace. Documentation-only delivery; no application tests required for it.
Next: M0-02, the shared protocol foundation, then M0-01 onboarding. These two
tasks are independent; their order favors a verifiable core delivery first.
External pilot recruitment and npm publication are not part of this delivery.

### 5 September 2026 — M0-02

All 15 MCP tools now declare nested output schemas and read-only annotations.
Successful responses include structured data equal to the existing text JSON;
errors retain `isError` without a success payload. No tool was renamed and no
new runtime dependency was added. HTTP and stdio share the same definitions.
The serialized tool catalog is 34,480 bytes with current descriptions/schemas.

Passed: `pnpm --filter @logic2b/mcp test` (80 tests, including HTTP and both
contrast result shapes), `pnpm --filter @logic2b/mcp lint`, and
`pnpm test:release-artifacts` (all 15 packed tools called with the official
client, actual registry/demo fixtures and schema validation). The smoke gate
now requires built Astro demo endpoints and reads files before sending headers.
The first sandboxed smoke attempt failed on DNS; the authorized retry passed.
Workspace dependencies were synchronized with `pnpm install --frozen-lockfile`;
the lockfile did not change. `pnpm lint` and `pnpm test` subsequently passed
across all eight workspace packages. No browser visual suite was rerun locally
for this protocol-only change; the GitHub workflow runs the full release gates.

This is source implementation, not a new npm publication. M0-01 is next;
M0-03 verified-default resolution and M0-04 limits remain open and must not be
inferred from the new output schemas. The M0 milestone is not complete.

### 5 September 2026 — M0-01

Completed beta onboarding on `codex/m0-01-beta-onboarding`. The landing MCP
announcement now opens human setup documentation. A shared private
`@logic2b/scaffold/package-selectors` export owns `logic2b@next` and
`@logic2b/mcp@next`; current site commands, prompts, Markdown widgets, MCP
command results and the VS Code task consume it. Literal English/Spanish docs
and copyable examples are checked against that policy. No MCP output shape
changed. The extension adds only an existing workspace dependency; no external
runtime package was added.

Onboarding states that hosts need filesystem writes and an installation/build
runtime to apply plans, separates npm and registry selectors, and distinguishes
source-only structured results from the published JSON text fallback. Mobile
verification exposed long endpoint identifiers widening the docs table; inline
code now wraps without changing table semantics or hiding content. Archived
benchmarks and registry payloads/manifests remain byte-for-byte unchanged.

Passed checks:

- `pnpm lint` and `pnpm test`: all eight workspace packages passed (232 tests).
- `pnpm build`: all six build tasks passed, including registry integrity build.
- `pnpm --filter @logic2b/web build` and `pnpm --filter @logic2b/web lint`:
  passed again after the mobile docs fix.
- `pnpm --filter @logic2b/mcp test`: 80 tests passed, including per-package-manager
  command parity. `pnpm --filter logic2b-ui test`: eight tests plus actual
  bundled extension command dispatch passed after the final test changes.
- `pnpm test:release-artifacts`: isolated source tarballs installed; CLI
  help/version/scaffold and all 15 MCP tools passed, including beta command
  parity from the installed MCP binary.
- `pnpm --filter @logic2b/mcp test:beta-onboarding`: actual published npm/pnpm
  commands resolved CLI `1.0.0-rc.2`; marketing scaffold and button addition
  passed. Published stdio MCP also resolved `1.0.0-rc.2` and returned a verified
  install plan. Public `/mcp` returned GET 405 and completed the separate
  streamable HTTP handshake (server `1.0.0-rc.2`).
- `pnpm --filter @logic2b/web exec playwright test tests/beta-onboarding.spec.ts tests/visual.spec.ts --grep 'beta onboarding|demos/code-block-demo|demos/stepper-vertical-demo|gallery'`:
  eight checks passed. Landing CTAs return successful GETs; 390/1280 px flows
  verify HTML/Markdown parity in both languages and open the agent prompt.
  Axe found no serious/critical violations in the MCP docs under the existing
  rule policy (color contrast excluded). Six existing visual baselines passed;
  none was changed. The two onboarding checks were repeated with settled-font
  screenshots for visual inspection of requirements and endpoint tables.
- `git diff --check`: passed.

Environment: Node 24.7.0 / pnpm 11.10.0. The explicit workspace install used
`CI=true pnpm install --frozen-lockfile --ignore-scripts`; the lockfile changes
only the new workspace link. Sandboxed install/build attempts hit DNS or tsx
IPC restrictions; authorized retries passed. The first browser run found the
mobile overflow and a mistaken Spanish test route; both were corrected.

Limitations: the published onboarding smoke intentionally uses `--no-install`
for generated starter dependencies; it proves source generation, not a new
three-framework build run. Full scaffold, full-site axe/visual, Lighthouse and
other browser suites were not rerun for this scope. Yarn/bun commands have
parity checks but were not executed. External first-use pilots remain pending;
no outreach, npm publication, merge or push was performed. Source and published
packages still share the existing rc.2 version number, so the release must bump
versions before publishing these source changes.

Next ready task: M0-03, immutable default registry resolution. M0-04 input
limits and M0-05 public landing/contributor work remain open; M0 is not complete.

### 6 September 2026 — M0-03

Delivered on `codex/m0-03-immutable-default` (stacked on the M0-01 branch).
An omitted MCP `version` now resolves the shared `REGISTRY_DEFAULT_CHANNEL`
(`next`, exported by `@logic2b/scaffold/package-selectors` next to the npm
selectors and independent from them). `createRegistryClient` always resolves
one manifest per call, reads only content-addressed payloads, verifies each
SHA-256 (transitive dependencies included) and reports `requestedVersion` plus
the exact `registryVersion`; those fields are now required in the output
schemas of list/search/get_component/add_command/install_plan/scaffold_plan/
get_theme, `add_command` always pins `--registry-version`, and
`list_registry_versions` reports `defaultChannel`. Versions indexes and
manifests are validated strictly (valid semver entries, complete integrity
contracts, no duplicate names). Errors name the missing document and release;
nothing falls back to `/r/index.json` or `/r/<name>.json`. Those legacy readers
moved to `packages/mcp/src/registry-raw.ts` with no production caller. Tool
names are unchanged; no dependency was added. The serialized tool catalog is
35,960 bytes. The CLI was untouched: it already pinned its built registry
version by default.

Tests moved from mutable-mirror mocks to `test/helpers/immutable-registry.ts`,
which publishes the same versions/manifest/content shapes as the site and
records every fetched URL. Covered: omitted/blank selector, exact, range and
channel, channel movement between reads (an existing client keeps its release
and never re-reads the versions index), deleted payload, unpublished name,
tampered item, tampered transitive dependency inside a plan, unavailable
manifest, unavailable versions index, malformed manifest/version entries,
cross-origin manifest reference, unsafe file paths, fetch failures, and that
token-only tools never contact the registry.

Passed: `pnpm --filter @logic2b/mcp lint` and `test` (91 tests);
`pnpm lint` (8 packages) and `pnpm test` (243 tests across 8 packages);
`pnpm test:release-artifacts` (packed CLI and MCP installed in an isolated
consumer, all 15 tools over stdio, default reads resolved `1.0.0-rc.16` from
the local registry fixture and `add_command` pinned it);
`pnpm --filter @logic2b/web build`; `pnpm --filter @logic2b/web exec
playwright test tests/beta-onboarding.spec.ts` (2 checks, English/Spanish
HTML and Markdown parity after the docs update); `git diff --check`.
A first `pnpm test` run showed `docs-og` and scaffold `icons` failures while
the web build regenerated OG images concurrently; both packages passed when
rerun without concurrent builds. Environment: Node 24.7.0 / pnpm 11.10.0.

Limitations: no npm publication, merge or push. The published rc.2 MCP still
reads mutable mirrors when `version` is omitted until a release ships this
source. `get_changelog` and `get_demo` remain unversioned reads by design;
manifest `accessibility`/`api` fields still point at `/r/<name>.json#...`
documentation anchors while the verified contract lives in the returned
payload. No timeout test exists because the timeout is a fixed constant;
M0-04 owns limits and negative protocol cases. Not rerun: full visual/axe
suites, Lighthouse, scaffold build matrix.

Next ready task: M0-04 (input/resource limits and negative protocol corpus).
M0-05 and EVAL-01 are also unblocked; M1-01 now has its dependency satisfied.
M0 is not complete.

### 6 September 2026 — M0-04

Delivered on `codex/m0-04-mcp-limits`. Documented limits live in
`packages/mcp/src/limits.ts` and are mirrored in every tool input schema
(`maxLength`, `maxItems`, `uniqueItems`, `minimum`/`maximum`,
`maxProperties`): 2 MiB streamed request bodies, 8 messages per batch, 32
unique item names, 128-character names/`srcDir`, 256-character queries and
presets, 1–100 search results, 1,000,000-byte caller CSS, 256-entry token
maps, 4 MiB fetched registry documents and 4 MiB of returned source per
call. `validateToolArguments` runs before any registry or network work and
throws `ToolInputError`; the new stdio factory `createServer` maps it to
`McpError` invalid params and the shared stateless HTTP handler
(`packages/mcp/src/http.ts`, now the core behind the Astro `/mcp` route) to
JSON-RPC `-32602`. The handler distinguishes parse (`-32700`), envelope
(`-32600`, including empty/oversized batches and unsupported
`Mcp-Protocol-Version` headers), method (`-32601`), argument (`-32602`) and
internal (`-32603`) failures; notifications and client responses still get
202; body protocol-version negotiation stays lenient. Tool execution
failures remain `isError` results. `srcDir` rejects traversal and absolute
paths. Duplicate item names are rejected rather than silently deduplicated.
Errors echo at most 80 characters of caller input. No new dependency; tool
names unchanged; the serialized tool catalog is 36,605 bytes. The `/mcp`
worker chunk measures 187,296 bytes against a 256 KiB budget test.

Tests: `test/limits.test.ts` (type, bound, duplicate, unsafe-path, echo and
resource-cap corpus, all proven to run before any fetch), `test/http-envelope.test.ts`
(parse, envelope, method, argument, execution, notification, batch, protocol
header and streamed body-cap cases against `Request` objects),
`test/stdio-server.test.ts` (official client over an in-memory transport),
and negative stdio calls in the release-artifact gate. Existing tests that
expected `isError` for missing/invalid arguments now expect the protocol error.

Passed: `pnpm lint` (8 packages); `pnpm --filter @logic2b/web build`;
`pnpm test` (266 tests across 8 packages, including the MCP suite's 113 and
the worker budget); `pnpm test:release-artifacts`; `pnpm --filter
@logic2b/web exec playwright test tests/beta-onboarding.spec.ts` (2 checks,
docs parity after the limits sentence in English and Spanish);
`git diff --check`. Environment: Node 24.7.0 / pnpm 11.10.0.

Limitations: no npm publication or merge. Registry fetch timeouts stay a
fixed 15 s constant without a dedicated test. Edge rate limiting is not
configured in this repository; the public endpoint remains account-free by
design. The published rc.2 still returns `isError` text for invalid
arguments until a release ships this source. Not rerun: full visual/axe
suites, Lighthouse, the scaffold build matrix, the live remote endpoint.

Next ready task: M0-05 (public landing/demo and contributor/release health).
EVAL-01, M1-01, M1-02 and M1-03 are unblocked. M0 is not complete until M0-05
lands.

### 6 September 2026 — M0-05 (partial)

Delivered on `codex/m0-05-public-beta`. The landing now states "Your design
system, ready for agents." with two primary paths (use with an agent →
`/docs/llms#mcp-server`, browse components → `/blocks`), a beta line built
from the shared package selectors and `REGISTRY_VERSION`, three executable
steps (versioned install, agent connection, update/drift correction), the
three launch starters as the complete-interface evidence with their exact
commands, and an explicit shipped/planned split that lists planned tools as
not installed. Footer links point at contributing, security and roadmap.
`CONTRIBUTING.md`, `SECURITY.md`, two issue templates, a template config and
a pull request template were added. The compatibility table (registry
`1.0.0-rc.16`/`next`, published CLI/MCP `1.0.0-rc.2`, React 19.2 / Tailwind
4.3 / TypeScript 6 pins, Next 16.3 / Vite 8.2 / Astro 7.2 starters, remote
MCP capabilities, host requirements, VS Code `0.1.0` preview, repository Node
22.12+/pnpm 11.10) lives in the installation docs in English and Spanish,
linked from the hero and README. `pnpm --filter @logic2b/mcp demo:walkthrough`
is the executable demonstration: preset → `scaffold_plan` from the committed
registry (resolved `1.0.0-rc.16`, 33 files, 11 verified items) → local edits
(hand-tuned `--primary`, a brand rule outside the token blocks, custom copy)
→ `lint_theme` reports 14 preset-drift issues including `primary` →
`apply_preset` on the local CSS restores a clean lint while the brand rule and
custom copy survive. It exits non-zero if any step regresses.

Also fixed in passing: `scripts/verify-scaffolds.mts` (CI `test:scaffolds`)
still mocked only the mutable mirrors and would have failed after M0-03; it
now serves the committed versions/manifests/content payloads.

Passed: `pnpm lint` (8 packages); `pnpm --filter @logic2b/web build` twice
(before and after a mobile overflow fix); `pnpm test` (8 packages);
`pnpm --filter @logic2b/mcp test:scaffolds` (six starters installed and
production-built; Vite dashboard 3 chunks, 188.3 KiB entry, 364.3 KiB max);
`pnpm test:release-artifacts`; `pnpm --filter @logic2b/mcp demo:walkthrough`;
`pnpm --filter @logic2b/web exec playwright test tests/beta-onboarding.spec.ts`
(landing CTAs return 200 at 390/1280 px, axe without serious/critical
violations, no horizontal overflow, docs parity in both languages);
`pnpm --filter @logic2b/web test:lighthouse` on the first build: landing,
docs and studio scored 1.0 in performance, accessibility, best practices and
SEO across three runs each. Landing screenshots at 1280 and 390 px were
inspected; the first mobile pass showed step cards overflowing because the
code blocks set the grid item's minimum width, fixed with `min-w-0`, and the
hero lacked a space before the compatibility link. `git diff --check` passed.
Lighthouse was not rerun after that two-class fix.

Not delivered: the recorded 60–90 second video (the walkthrough script is the
reproducible source for it) and the external five-developer pilot, which
needs user authorization for outreach. Full visual/axe suites were not rerun;
the landing is not in the visual baseline set. No merge, push to `main` or
publication was performed by this task.

Next: finish M0-05 by recording the walkthrough when a screen recording is
wanted, then EVAL-01 (comparative protocol) or M1-01 (state/content/action
contract), both `ready`. M1-02 and M1-03 are also unblocked.

### 7 September 2026 — SYNC-01

User-requested integration of all pending local work with GitHub `main`
(`6462189`). All fetched remote branches were already ancestors of `main`.
Preserved the theme gallery's eight shared presets, English/Spanish pages,
JSON discovery, search/sitemap/agent links, responsive header, audit notes and
light/dark visual baselines. `list_presets` is the 16th MCP tool and now has a
typed output schema, read-only/network-free annotations, bounded query input,
structured/text parity and packed stdio coverage. Web and MCP commands both
consume the shared `@next` selector. A cross-surface regression checks exact
catalog/config/command/audit parity; browser tests exercise clipboard copying,
audit disclosure and loading a non-default preset in Create at 390/1280 px in
both languages. CI now executes the gallery and beta-onboarding functional tests.

Passed: `pnpm install --frozen-lockfile` (lockfile unchanged); `pnpm build`;
`pnpm lint`; `pnpm test` (275 tests across eight packages);
`pnpm test:release-artifacts` (all 16 packed MCP tools);
`pnpm --filter @logic2b/web test:budgets`; final
`pnpm --filter @logic2b/web build`; `git diff --check`.
Browser command: `PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
pnpm --filter @logic2b/web exec playwright test tests/theme-gallery.spec.ts
tests/beta-onboarding.spec.ts tests/a11y.spec.ts tests/visual.spec.ts
--grep 'theme gallery|themes|beta onboarding|launch demos' --workers=2`.
All 30 checks passed (exit 0, 1.1 minutes), including 14 axe checks, ten visual
comparisons and six functional checks. The first failed run needed its stalled
Chrome teardown stopped; the corrected two-worker run completed normally.
Screenshots were inspected and existing baselines retained. The initial new
test incorrectly assumed Create rendered a `main` element; it now asserts the
actual Customize controls and exact selected preset instead.

Environment: Node 26.8.1 / pnpm 11.10.0. The initial build needed the new VS Code
workspace dependency linked by the frozen install. Playwright's bundled-browser
download failed certificate verification, including with system CAs, so local
checks used installed Chrome. No TLS verification was disabled. Full-site axe,
visual, Lighthouse and scaffold build matrix were not rerun locally; GitHub CI
runs those gates after integration. Registry payloads and the lockfile are unchanged.

npm checked on 7 September: both `next` tags still point to `1.0.0-rc.2`;
`latest` is CLI `0.4.0` / MCP `0.2.0`. The remote MCP's structured output,
verified default, limits and gallery tool await npm delivery. `RELEASING.md`
records the pending paired candidate (unused `1.0.0-rc.3` at this check), and
English/Spanish onboarding distinguishes remote features from the npm package.
No npm publication or dist-tag change is part of this integration.

Next: publish a separately versioned CLI/MCP candidate when requested, then
verify live beta onboarding and update the availability notes. Existing product
priorities remain M0-05's video/pilot, EVAL-01 and M1-01.

### 7 September 2026 — REL-03 (preparation)

User authorized publishing both npm packages and requested help granting access.
Prepared matching `1.0.0-rc.3` manifests, changelogs and the packaged MCP README.
The public registry confirms that version is unused for both packages; `next`
remains rc.2 and `latest` remains CLI 0.4.0 / MCP 0.2.0 until publication.

Passed locally: `pnpm build`, `pnpm lint`, `pnpm test` (275 tests), and
`pnpm test:release-artifacts` (both rc.3 tarballs consumer-installed; CLI
help/version/scaffold and all 16 MCP stdio output contracts verified).
The preceding integration commit passed the complete GitHub CI pipeline;
the exact release candidate must also pass it before publication.

The existing npm credential returned E401. Started official browser-based
`npm login --auth-type=web`; the user completes authentication and 2FA directly
with npm, never by sharing a password or token in this conversation.
Next: confirm package publishing access, pass candidate CI, publish both packages
to `next` without touching `latest`, run live beta onboarding, and align public
English/Spanish availability notes with the observed registry state.


### 9 September 2026 — EVAL-01 (protocol/reporting slice)

Implemented on `codex/eval-01-protocol-v2`. Added a separate versioned outcome
protocol with three resource conditions and five customer/maintenance tasks.
`pnpm --dir benchmarks/agents outcomes schedule <seed>` produces a reproducible
randomized 75-attempt pilot schedule. `outcomes report <attempts.json>
<artifact-root>` validates strict version-2 records, verifies bounded SHA-256
artifact evidence and emits deterministic descriptive JSON. It never executes
submitted source. Duplicate attempts/reused workspace ids, unknown fields,
unsafe paths, symlinks, oversized artifacts and tampering reject the report.

Aggregation separates matching fixture/host/model/capability/version/budget
cohorts and autonomous/assisted attempts. Failures, timeouts and incomplete
attempts remain in the denominator; unknown checks are not passes. Missing
metrics retain unavailable counts and null summaries. Synthetic fixtures are
excluded from samples. Sample status stays pending until each task has a
cohort with five autonomous attempts per condition; reaching that threshold
claims neither advantage nor evaluator independence. The recording guide
states collection, sanitization, independent browser/build/human evidence and
interpretation responsibilities. Protocol v1, its runner and historical
results are unchanged. CI now also type-checks the benchmark package; its
existing benchmark test command discovers the new suite.

Passed: `pnpm --dir benchmarks/agents lint`; `pnpm --dir benchmarks/agents test`
(25 tests, including ten v2 tests and all existing v1 regressions);
`git diff --check`. CLI subprocess tests verify seeded scheduling, pending
empty reports and nonzero invalid-input exits without partial stdout.
Environment: Node 26.8.1 / pnpm 11.10.0. No dependency additions.

Not run: whole-workspace build/tests, browser/axe/visual suites, release artifact
or scaffold builds (no product/runtime/registry changes), or remote GitHub CI.
No paid models, participant outreach, publication, merge or push performed.
This slice does not collect real baseline attempts or provide a v2 execution
adapter/registered browser fixtures. EVAL-01 remains in progress until those
measurements exist; synthetic tests are not comparative evidence. The new
workflow condition depends on the planned M1/M2 implementations.

Next ready implementation: M1-01, state/content/action contract for the customer
list and edit form. Resume EVAL-01 collection with registered fixtures and the
applicable model-run authorization; M0-05 video/pilot and REL-03 publication
remain independently pending.


### 9 September 2026 — M1-01

Delivered the first customer list/edit vertical slice on
`codex/m1-01-customer-states`. `admin-customers-01` now consumes real supplied
rows, computes truthful counts, filters locally and exposes create/edit/retry
callbacks. It defaults to empty data; missing callbacks disable their actions.
Static examples and simulated persistence live in the website demo. The new
`customer-edit-01` controlled block validates name/email, associates server
errors, locks submitting/denied inputs, preserves failed drafts and confirms
Cancel when dirty. Keep editing and closing restore focus through documented
component/consumer responsibilities. The demo connects create/edit, duplicate
email rejection, failed-save retry, load retry and denied-save scenarios.

Added shared `RegistryBehavior` version 1 and a fixed-schema runtime validator
in `@logic2b/scaffold/behavior`. Nested `behavior` avoids the existing top-level
`content` payload-URL field. Registry metadata covers both blocks' complete
state matrix, priority source-copy paths, intents, callbacks, journey,
responsive behavior and consumer duties. Source slots are checked through the
TypeScript AST; no source is evaluated. MCP discovery, detail and install plans
return matching typed metadata and reject malformed/unsupported contracts in
manifests and payloads. Install notes, Copy Prompt and generated AGENTS.md
carry consumer duties. Both block pages have keyboard-operable Preview/States
tabs, live declared-state examples and a content-slot table. The implementation
guide replaces its obsolete all-blocks rollout with this scoped delivery.

Registry `1.0.0-rc.17` adds two current content-addressed payloads and a new
manifest. Historical manifests and content remain byte-for-byte unchanged;
no old snapshot was regenerated. The public item schema references the shared
behavior schema. No dependency or lockfile changes; no npm or site publication.

Passed on Node 26.8.1 / pnpm 11.10.0:

- `pnpm --filter @logic2b/registry build` and registry lint/integrity checks.
- `pnpm --filter @logic2b/web build` (including generated docs/demo endpoints).
- `pnpm lint` and `pnpm test`: all eight workspace packages, 291 tests. This
  includes 116 MCP tests and the existing 25 evaluation-harness regressions.
- `pnpm test:release-artifacts`: isolated rc.3 CLI/MCP tarballs installed; all
  16 tools validated over stdio, including actual customer detail and combined
  install-plan behavior equality against current immutable payloads. Historical
  rc.16 button/scaffold calls remain covered.
- `pnpm --filter @logic2b/web test:budgets`: passed; current index 90.3 KiB,
  current manifest 109.3 KiB, largest browser chunk 193.4 KiB.
- With `PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`:
  `pnpm --filter @logic2b/web exec playwright test tests/customer-journey.spec.ts --workers=1`
  passed 31 checks in 47.7 seconds. Functional journeys cover 390/768/1280px,
  field validation/focus, failed retry with preserved draft/search, create,
  server denial, unsaved confirmation and state-tab keyboard interaction.
  All 13 built-in states passed axe under the existing policy and light/dark
  mobile visual comparisons (26 new baselines).
- With the same browser override:
  `pnpm --filter @logic2b/web exec playwright test tests/visual.spec.ts --grep 'blocks/(admin-customers-01|customer-edit-01)' --workers=1`
  passed four desktop comparisons in 10.6 seconds. Reviewed the two intentional
  customer-list baseline changes, two new form baselines and all state images.
- `git diff --check`; no tracked historical manifest/content diffs.

The first combined browser run completed its 35 cases but left a child worker
stuck in teardown; stopped that specific worker and reran suites separately to
clean exits. A subsequent run exposed filling the search before hydration;
`data-preview-ready` now signals the committed client and the functional test
waits for it. Final checks above use ordinary comparison mode, not snapshot
updates. Error copy now uses foreground tokens for readable text.

Limitations: demo persistence is in memory. Consumers must implement real data,
server authorization, external navigation protection, pagination/offline
behavior and record-switch rules. The existing axe policy excludes color
contrast; no full-site browser/axe/Lighthouse run, external user pilot, complete
scaffold build matrix or remote GitHub CI was run for this delivery. No merge,
push or publication performed. Broader catalog behavior coverage remains
future work; this completes the scoped two-block M1-01 task only.

Next ready task: M1-02, project context contract and local collector. M1-03 is
also ready; M1-04 waits for M1-02. EVAL-01 real measurements, REL-03 publication
and M0-05 video/external pilots remain independently pending.


### 9 September 2026 — M1-02

Delivered on `codex/m1-02-project-context`. Shared `ProjectSnapshotV1`,
`ProjectContextV1`, strict snapshot validation, JSON schemas and pure detection
live in `@logic2b/scaffold/project-context` and `project-context-schema`.
`logic2b inspect --json` collects bounded local configuration and hashes;
`--app-root`, `--file`, `--details full` and explicit `--capabilities` define
selection, detail and host scope. The new network-free `inspect_project` is
the 17th MCP tool and returns the identical shared result with typed
text/structured parity. It never claims remote filesystem access.

Detection covers Next/Vite/Astro dependency declarations, JSON/JSONC,
local TypeScript inheritance/references, root/src aliases, custom component
folders, stylesheet entry, preset/icon settings and registry selector versus
resolved install version. Inventory distinguishes present/missing/unresolved
files and known/unknown baseline modification status. Existing shadcn/native
files are not falsely labeled registered installs. A child's baseUrl override
rebases inherited paths; an independent test checks the result against the
installed TypeScript parser. Package inheritance, cross-root aliases and
conflicts remain explicit unknowns. Normal monorepo cross-root alias definitions
are withheld without losing in-root evidence; escaped snapshot/file paths still
reject. Workspace candidates require explicit app selection.

Limits: 128 KiB configuration bytes, 32 configuration targets, 1 MiB snapshot,
1,000 inventory entries, 256-character relative paths, 2 MiB per local source
file and 32 MiB total source/base reads. Internal symlinks work; escaping links,
links into excluded dependency/environment/Git paths, duplicate normalized
or physical inventory targets, malformed JSON and unsupported snapshot/manifest
versions reject. No scripts/configuration code, dependency directories or env
files are executed/read. No writes or network calls occur during inspection.
Missing capabilities default to disabled with an explicit unknown, never an
inferred permission. Input errors do not echo configuration source.

CLI/MCP documentation and English/Spanish agent docs describe the source
candidate and availability checks, not an assumed release. Install-plan notes
instruct hosts to reconcile confirmed aliases and preserve observed files;
existing add/install destination behavior is unchanged. M2-01 will consume
full context and fresh hashes for bounded incremental writes; a compact summary
or unresolved field is insufficient write evidence.

Passed on Node 26.8.1 / pnpm 11.10.0:

- `pnpm --filter @logic2b/web build`; `pnpm lint`; `pnpm test` (315 tests across
  all eight packages). Also ran `pnpm lint && pnpm test` directly in each
  affected CLI/MCP/scaffold/web package after the final shared-core change to
  avoid relying on Turbo cache for cross-package source imports: 67 CLI,
  119 MCP, 16 scaffold and 25 web tests, all passed.
- `pnpm test:release-artifacts`: rc.3 CLI/MCP tarballs installed in an isolated
  consumer. Packed CLI inspection identified a modified file in an actual
  generated Vite scaffold and left it unchanged. All 17 packed MCP contracts,
  including full project inspection, passed the official stdio client schema
  validation. Existing registry/customer contracts remain covered.
- `pnpm --filter @logic2b/web test:budgets`: passed. The current MCP worker
  measured 228,392 bytes, below its 256 KiB gate.
- `PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  pnpm --filter @logic2b/web exec playwright test tests/beta-onboarding.spec.ts --workers=1`:
  both 390/1280px checks passed in 7.2 seconds, including English/Spanish
  HTML/Markdown parity and the existing axe policy.
- `git diff --check` passed. Registry snapshots, payloads and lockfile unchanged.

Observed output sizes: a minified summary of 1,000 supplied file hashes is
1,544 bytes; full inventory is opt-in above the 16 KiB compact budget. The
serialized 17-tool catalog is 67,955 bytes. Ran the built CLI against this real
repository: the root summary is 1,884 pretty-printed bytes and identifies
`apps/web`; selecting that app and one demo source emits a 3,815-byte full
context with Astro ^7.0.6, a real SHA-256 digest and explicit unknowns for
package inheritance/cross-root aliases. It did not read outside the selected
app or pretend its aliases were resolved.

Limitations: declarations are not installed dependency versions; no lockfiles,
package-based tsconfig resolution, recursive workspace globs, arbitrary source
scan or atomic multi-file snapshot. Host-supplied hashes are evidence claims,
not remotely verified files. Full-site visuals/axe, Lighthouse, full scaffold
build matrix and remote GitHub CI were not run for this non-visual feature.
No new dependency, merge, push, package publication or endpoint deployment.
Source package versions remain rc.3; release work must verify version/tag
availability before publication. EVAL-01 real model runs and M0 external pilots
remain pending independently.

Next ready task: M1-03, deliver agent rules with installs. M1-04 static review
and M2-01 incremental plans are now unblocked by the shared project context.


### 9 September 2026 — M1-03

Delivered on `codex/m1-03-agent-rules` (commit subject: `feat: distribute managed agent rules across installs and plans`).
The shared `@logic2b/scaffold/rules` core now owns compact agent instructions,
all four editor formats, managed merges and DESIGN.md. The studio keeps
byte-identical legacy AGENTS.md/DESIGN.md exports through thin adapters.

CLI `rules` regenerates from bounded local project evidence with no network;
`init` (both modes), `add` and `update` generate/refresh instructions by default.
`--no-agent-rules` opts out per operation. Existing managed editor formats are
refreshed automatically. The CLI preserves outside bytes, BOM/CRLF and file
permissions, rejects ambiguous markers, symbolic/hard links, oversized or
invalid-UTF-8 documents, preflights all merges and replaces changed files
atomically. Automatic rules failures are reported separately from already
successful component operations. An applied init preset is recorded without
losing other config properties; documentation-only rules overrides do not
modify CSS. Inventory is manifest/host-reported, not inferred from the catalog.

MCP exposes 18 typed tools, adding network-free `agent_rules` and scaffold
`agentRules: false` opt-out. Notes specify merge/append/stop behavior for hosts.
The tarball adds exactly `skills/logic2b-ui/SKILL.md` from the canonical repository
source; no automatic host skill installation, runtime dependency or lockfile
change. The skill respects available tools, project policies and existing user
authorization. VS Code adds Generate Agent Rules through the workspace API,
refreshes after successful tasks and supports `logic2b.agentRules: false`.
EN/ES installation and agent docs distinguish source from npm availability.

Verification:

- `pnpm test`: 332 tests passed (CLI 75, MCP 121, scaffold 22, VS Code 9,
  web 25, tokens 47, registry 8, benchmark 25). `pnpm lint`: all eight packages.
  Direct affected-package test runs also passed, bypassing Turbo dependency
  caches; final web test/lint reads the rebuilt Worker.
- `pnpm --filter @logic2b/web build` and `test:budgets` passed. Final MCP Worker
  242,929 bytes (256 KiB budget); serialized tool catalog 69,856 bytes; full
  142-item inventory rules 3,990 bytes (6 KiB budget). A synthetic 1000-item
  inventory remains bounded with an explicit shown/total count.
- `pnpm --filter logic2b test:scaffold`: actual generated Vite monorepo installs
  and builds, with AGENTS.md/DESIGN.md asserted. `pnpm --filter @logic2b/mcp
  test:scaffolds`: six actual Next/Vite/Astro and alternate-icon projects install
  and build with rules. Vite dashboard stays at three chunks, 188.3 KiB entry
  and 364.3 KiB maximum.
- `pnpm test:release-artifacts`: both rc.3 tarballs installed in a clean consumer;
  all 18 tool schemas exercised through actual stdio, exact skill allowlist and
  source bytes checked, packed CLI rules preserves user policy and is idempotent.
- VS Code's real bundle is exercised through a mocked remote workspace provider:
  preservation, idempotence, malformed-marker preflight and no shell for rules.
  Bundle is 50,195 bytes. Budget explicitly raised from 32 to 64 KiB for the
  shared context parser and generators; still a single file with no new runtime
  dependency. No live VS Code host session or marketplace publication claimed.
- Playwright beta-onboarding: two tests at 390/1280px, both locales, passed
  using installed Google Chrome. Studio output and every editor format have
  snapshots; no visual UI was changed. The skill passed the skill-creator
  validator using a temporary Python environment with PyYAML 6.0.2.
- `git diff --check` passed. No registry payload, historical manifest, package
  version, npm channel or publication state was changed.

Logs: `/tmp/logic2b-m1-03-{tests,lint,web,release,browser,budgets,cli,scaffold,mcp,vscode,cli-scaffold-build,mcp-scaffold-builds,web-tests,web-lint}.log`.
Limit: individual CLI file replacements are atomic, not a transaction across
all files; preconditioned multi-file apply remains M2-01. Preset tables are a
reference, not a scan of custom CSS. Review/proposal tools remain planned.
Next ready task: M1-04 (evidence-based static review). REL-03, external pilot
work and real EVAL-01 measurements remain separate unfinished work. The user's
overall development goal remains active.


### 18 September 2026 — M1-04

Delivered on `codex/m1-04-static-review` (commit subject: `feat(review): add evidence-based static UI review`).
Completed the existing uncommitted shared-engine/CLI work, then integrated and
verified MCP, documentation, agent instructions and benchmark reporting.

The private `@logic2b/review` package owns a version-1, DOM-free TSX/JSX review
contract. Four stable rules cover explicitly enabled semantic-color policy and
supported native dialog/control/button names. Findings include category,
confidence, location, evidence, suggested fix and canonical documentation.
Missing names become defects only with a justified host assertion of complete
label context; unresolved wrappers, external/dynamic labels and styling remain
unknown. Native HTML is valid. Results expose evaluated/disabled rules,
reasoned suppressions and truncation; there is no global quality score or
invented registry version. Code, imports and project configuration never execute.

Limits: 64 files, 256 KiB total UTF-8 source, 256-character normalized paths,
50,000 traversed AST nodes and 512 entries per result list. Suppressions are
rule-specific, require reasons, preserve their findings and are limited to 128
per file. Babel parser 7.29.7 is pinned and bundled with its complete MIT notice
in both public artifacts; public runtime dependency lists are unchanged.

CLI `review <paths...>` reads bounded, explicitly selected local sources and
rejects escapes, private/dependency directories, symbolic/hard-linked files,
overlapping selections, invalid UTF-8 and oversized input. It never modifies
sources. JSON and human-readable output distinguish uncertainty and disabled
rules. Exit 1 reports threshold findings, exit 2 invalid review input, parse
failures or truncated processing; Commander usage errors retain exit 1.
`review_ui` is the 19th MCP tool, with strict nested schemas, read-only
annotations, sanitized errors and identical text/structured shared-core results.
The existing 2 MiB HTTP body cap supports worst-case JSON escaping of 256 KiB
source without increasing the transport limit.

English/Spanish review docs render rule ids and before/after examples from the
shared catalog, including plain Markdown and two new OG cards. Managed agent
instructions and the packaged skill check actual tool availability. The
benchmark attaches supplementary review evidence to the composition artifact,
including unknowns/unavailable results, without changing independent scoring.
Historical result files and protocol inputs remain unchanged; read-only rescoring
preserved 272/300, 294/300 and 266/300 for the existing three runs.

Verification (Node 26.8.1 / pnpm 11.10.0):

- `pnpm lint`: all nine workspace packages passed. Direct final review lint,
  MCP lint/build, benchmark lint and web lint also passed. Workspace links
  were installed explicitly with `CI=true pnpm install --frozen-lockfile=false
  --ignore-scripts`; the lockfile adds only review workspace/dependency links.
- `pnpm test`: 358 tests passed across nine packages (CLI 78, MCP 126,
  review 14, scaffold 22, web 25, VS Code 9, tokens 47, registry 8,
  benchmark 29). Final CLI/MCP/benchmark tests also ran directly after engine
  fixes, avoiding cross-package Turbo cache assumptions.
- Review fixtures cover all four bad/good rules plus native/external/hidden
  labels, custom wrappers, dynamic/duplicate/spread attributes, inert controls,
  semantic CSS variables, URL fragments, CSS comments, all JS line separators,
  parse failures and input/output limits. The 178-file corpus (139 registry
  sources, all 39 block demos) has zero findings/parse errors under partial
  context with token policy off. This proves parsing/conservative uncertainty,
  not complete accessibility or design-policy compliance.
- `pnpm --filter @logic2b/web build` passed, including OG generation; final
  `pnpm --filter @logic2b/web exec astro build` passed after the core and
  keyboard fixes. Existing registry payloads/manifests remain byte-identical.
- `pnpm --filter @logic2b/web test:budgets` passed. MCP chunk: 739,735 bytes;
  all 13 server modules: 1,554,184 bytes. The old 256 KiB MCP budget explicitly
  becomes 1 MiB for the parser; an additional 2 MiB total-module guard prevents
  split chunks from escaping measurement. Both the web test and budget command
  enforce these project limits. Browser JS remains 1,985.9 KiB, maximum chunk
  193.4 KiB; 175 docs OG images total 3,896.4 KiB.
- `pnpm test:release-artifacts` passed: rc.3 CLI/MCP tarballs install in an
  isolated consumer; all 19 output schemas pass official-client stdio checks.
  Packed CLI review and MCP match the shared core, including uncertainty,
  suppressions, parse failures and invalid/oversize inputs. Parser notices
  and the exact packaged skill are verified.
- With `PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`,
  the web Playwright beta-onboarding and review-docs tests passed at 390/1280px
  in both locales. An initial mobile axe failure exposed unfocusable scrolling
  code examples; replaced them with Astro Code and verified actual keyboard
  horizontal scrolling. Final review-docs rerun: two tests passed. No page
  overflow or serious/critical axe issues under the existing color-contrast
  exclusion. Inspected desktop/mobile screenshots; no baseline was changed.
- Local `wrangler dev --config dist/server/wrangler.json --port 4328
  --inspector-port 9248 --local` served the actual built Worker. HTTP handshake
  listed 19 tools; six review cases (including inert, suppression, parse failure
  and full 256 KiB input) exactly matched shared-core structured/text results;
  two invalid-input cases rejected without source echo. This is local runtime
  evidence, not production latency or quota certification.
- `pnpm exec wrangler deploy --dry-run --config dist/server/wrangler.json
  --outdir /tmp/logic2b-m1-04-worker-dry-run` from apps/web passed: 1,517.76 KiB
  raw / 345.88 KiB gzip. No deployment performed. These are project budgets,
  distinct from [current Cloudflare platform limits](https://developers.cloudflare.com/workers/platform/limits/#worker-size).
- Skill-creator `quick_validate.py skills/logic2b-ui` passed in a temporary
  Python environment with PyYAML 6.0.2. `git diff --check` passed.

Logs: `/tmp/logic2b-m1-04-{install,lint,tests,cli-final,mcp-final,benchmark-final,web,web-final,web-lint-final,release,browser,browser-final,budgets-final,worker,worker-smoke,dry-run}.log`.
Limitations: no cross-file/import resolution, full CSS parser, runtime DOM,
focus/contrast certification, broader state/icon/motion/form rules or auto-fix.
No full-site visual/axe, Lighthouse, scaffold-build matrix or remote CI run for
this scope. No npm publication, endpoint deployment, merge or push. Package
versions remain rc.3 source candidates; release work must recheck tag/version
availability. External pilots and real comparative EVAL-01 runs remain pending.

Next ready task: M2-01, preconditioned incremental change plans/apply/recovery
that preserve custom columns, copy and tokens. M2-02 consumer runtime checks
are now unblocked too. The user's overall development goal remains active.


### 18 September 2026 — M2-01

Delivered on `codex/m2-01-incremental-changes`, based on M1-04 commit
`862e072`. The shared scaffold core assembles explicit host-authored candidate
files into `ChangePlanV1`: canonical SHA-256 id, exact registry evidence,
selected app root, create/update operations with before/after hashes, derived
package dependencies, conflicts, verification guidance and unsupported work.
The plan is bounded to 32 candidates, 128 KiB per file, 256 KiB total content,
256-character relative paths and 2 MiB serialized JSON. Its id checks integrity,
not authorization. It does not synthesize source or verify registry existence.

Local `change plan` collects the target bytes/absence and project snapshot.
`change apply` supports a read-only dry run, checks all preconditions before
source writes, refuses stale files and unsupported package operations, skips
already-applied files, and retains bounded original bytes/modes in a journal.
`change status` lists transaction UUIDs and reports incomplete/invalid entries
in `issues` without hiding valid transactions. `change recover` can undo an
interrupted or completed apply, checks all relevant hashes/modes before source
writes, preserves skipped/pending targets and refuses newer edits, including
edits made after a partial rollback. No source, scripts, dependencies or
verification commands execute. Journals are versioned/checksummed and capped
at 4 MiB; history listing is bounded to 256 entries.

An exclusive active owner plus immutable ownership generations prevent two
Logic2b recoverers from taking over the same dead writer. Completed attempts
leave finish markers; live unfinished owners cannot be replaced. Claims are
bounded to 256 generations and reject before modifying a full ownership chain.
Per-file replacement is atomic; multiple files are not one atomic filesystem
transaction. Portable APIs leave a final race against unrelated writers, so
the documented workflow requires a stable workspace. Recovery handles owned
temporary files left at create link/unlink and update pre-rename boundaries.
Newly created empty directories can remain.

MCP `change_plan` is the twentieth tool: strict input/output schemas, pure/read-
only annotations, sanitized invalid-input errors and shared-core equivalence
across stdio and HTTP. MCP never reads local source or applies the result.
English/Spanish guides, package/root documentation, roadmap, managed agent
instructions and the packaged skill explain the available commands and limits.
Existing immutable registry bytes and the lockfile remain unchanged; there are
no added external dependencies and no change to the registry update algorithm.

Verification (Node 26.8.1 / pnpm 11.10.0):

- `pnpm lint`: all nine workspace packages passed; repeated on final source.
- `pnpm test`: 409 tests passed across nine packages (CLI 109, MCP 134,
  scaffold 34, review 14, web 25, tokens 47, registry 8, VS Code 9,
  benchmark 29). Relevant CLI/scaffold tests also ran directly. The CLI adds
  31 acceptance tests: actual subprocess exit after a write, live/concurrent
  recovery exclusion, create link and update rename crash boundaries, staged
  tampering, package races, newer content/modes, symlink/hardlink refusals,
  malformed/re-signed journals, ownership limits, incomplete history and real CLI exits.
- The consumer fixture runs existing `add` and three-way `update` against
  registry fixtures around the incremental request: custom column, copy and
  token override survive; an overlapping upstream edit produces an explicit
  merge conflict. Full runtime customer-journey coverage remains M2-03.
- Core tests cover deterministic hashes (including SHA-256 fallback parity
  without global WebCrypto), strict schemas and limits, absent/contradictory
  evidence, path collisions, registry uncertainty and package-change policy.
  No actual Node 18 binary, Windows or Linux filesystem run was performed.
- `pnpm test:release-artifacts`: passed twice, including final source; rc.3
  tarballs installed in an isolated consumer, CLI plan/dry-run/apply/repeat/
  stale/status exercised, and all 20 MCP tools called over official-client
  stdio with output-schema validation. Source HTTP tests also use the official
  client against a live local listener. These are local distribution checks,
  not evidence of npm publication.
- `pnpm --filter @logic2b/web build`: passed, including 177 OG images;
  only the two new guide images and their manifest entries changed.
  `pnpm --filter @logic2b/web test:budgets`: passed. MCP chunk 766,502 bytes;
  13 server modules total 1,581,837 bytes; browser JS 1,985.9 KiB with a
  193.4 KiB maximum chunk; docs OG images total 3,948.4 KiB.
- With `PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`,
  `pnpm --filter @logic2b/web exec playwright test tests/change-docs.spec.ts
  tests/beta-onboarding.spec.ts --workers=1`: four tests passed at 390/1280px
  in both locales. Commands match HTML/Markdown, JSON examples parse, keyboard
  scrolling works, pages do not overflow, and axe reports no serious/critical
  issues under the existing color-contrast exclusion. Inspected desktop/mobile
  screenshots; no visual baseline was changed.
- Local `wrangler dev --config dist/server/wrangler.json --port 4328
  --inspector-port 9248 --local` served the built Worker: handshake listed 20
  tools, seven plan cases exactly matched shared-core structured/text output
  (including package policy, inert source and full escaped 256 KiB input),
  and three invalid inputs rejected without private source echo. The local
  server was stopped after verification.
- From apps/web, `pnpm exec wrangler deploy --dry-run --config
  dist/server/wrangler.json --outdir /tmp/logic2b-m2-01-worker-dry-run` passed:
  1,544.76 KiB raw / 352.27 KiB gzip. No deployment performed.
- Skill-creator `quick_validate.py skills/logic2b-ui` passed in the existing
  temporary Python environment. Six documented JSON examples passed actual
  shared plan generation; docs locale tests passed. `git diff --check` passed.

Logs: `/tmp/logic2b-m2-01-{cli,cli-lint,scaffold,lint,lint-final,tests,release,release-final,web,browser,budgets,worker,worker-smoke,dry-run}.log`.
Independent review found and corrected recovery concurrency, missing temporary
peer handling, edits after partial rollback, incomplete history entries and the
ownership-limit boundary; regression tests cover them. Initial tool invocations
using the nonexistent `@logic2b/cli` filter ran no checks; they were replaced by
`logic2b` and the successful workspace commands above.

Limitations: create/update UTF-8 text only; no deletions, dependency install,
automatic pruning, cross-file semantic merge or automatic application checks.
Plans must already preserve intended customizations. Journals/checksums are not
protection against an attacker able to rewrite and rehash local artifacts.
Not rerun: full-site visual/axe, Lighthouse, scaffold framework build matrix or
remote CI. No npm publication, endpoint deployment, merge or push. Package
versions remain rc.3 source candidates; release work must recheck availability.
External pilots and real comparative EVAL-01 measurements remain pending.

Next ready task: M2-02, consumer runtime verification that complements static
review. M2-03 combines it with this change workflow into the full customer
journey acceptance fixture. The overall development goal remains active.

### 18 September 2026 — M2-02

Implemented consumer runtime verification on `codex/m2-02-consumer-verification`.
The bounded, versioned suite/report/summary contract lives in the shared
scaffold package. CLI `verify` runs declarative semantic-selector checks against
an explicitly started loopback application; MCP `verify_report` validates and
summarizes the host's report without browsing URLs or running code. The source
candidate has 21 MCP tools. Installation, browser setup, build and app start
remain explicit, separate operations. EN/ES guides, managed agent rules,
packaged skill, CLI/MCP instructions and CI now describe the executable path.

Reports carry selected-file and suite fingerprints, optional change-plan id,
routes/viewports, tool versions, run/check statuses and hashed local artifacts.
Missing coverage/capabilities remain unknown/skipped. Failed actions cannot
be hidden by earlier passing checks; incomplete axe measurements remain unknown.
The runner rejects external origins and all HTTP redirects, blocks WebSockets,
popups and service workers, enforces deadlines/artifact limits and rechecks
source stability. Browser regression tests reproduced and closed redirect
isolation and final-action `about:blank` false-pass defects. Evidence writes
are serialized outside browser timeout races.

The generated Vite reference app installs the actual immutable customer blocks
through scaffold/add, verifies their copied bytes, then builds and runs the CLI
against production output. Independent expectations cover filter/clear, stable
sorting, empty/loading/error/retry, create/edit, linked errors, submitting,
failure with preserved drafts, success, permission denial, keyboard/focus,
translations, long names, desktop/mobile and 200% root text size.

That consumer exposed a real rc.17 defect: fixed-width columns collapsed the
customer name cell at 390px/200% despite zero page overflow. Local registry
rc.18 adds a minimum table width and a named, focusable scroll container;
`Table.containerProps` is additive. Earlier immutable manifests/payloads are
byte-for-byte unchanged. Manual browser measurement confirmed a 288px customer
column, a 228px scroll region over 576px content, keyboard horizontal scrolling
and no horizontal page overflow at 390px. Existing visual baselines did not
need changes.

Reference result: 228 checks across 20 scenario/viewport runs, with 224 pass,
zero fail/skipped and four unknown contrast checks; 18 runs pass and two need
review. All 28 axe analyses have zero violations and no rule exclusions. The
four unknowns are specifically partially obscured table text at 200% in the
translated list/edit scenario. CLI exit remains 2 and the report stays unknown.
The fixture gate permits only these exact check identities and evidence whose
incomplete findings are exclusively `color-contrast`/`elmPartiallyObscured`;
unrelated unknown checks or runs still fail the gate. It saves the explicit
review requirement instead of claiming complete accessibility approval.
Twenty-eight PNGs and all 228 evidence hashes were checked; agent visual
inspection covered mobile/desktop list/edit and all four new EN/ES guide
screenshots. Human contrast review across scroll positions remains outstanding.

Local consumer and evidence:
`/tmp/logic2b-m2-02-consumer-fixture-final` and
`/tmp/logic2b-m2-02-consumer-evidence-confirmed` (report, summary, provenance,
28 screenshots, 28 axe results, 172 assertion logs and contrast-review record).
The earlier defect proof is `/tmp/logic2b-m2-02-rc17-200pct-regression.png`;
restored-scroll proof is `/tmp/logic2b-m2-02-rc18-200pct-fixed.png`.

Checks and outcomes:

- `pnpm --filter logic2b consumer:prepare /tmp/logic2b-m2-02-consumer-fixture-final`,
  explicit `pnpm --dir ... install --frozen-lockfile=false`, and
  `pnpm --dir ... run build`: passed; copied registry bytes preserved.
- `PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  pnpm --filter logic2b test:consumer /tmp/logic2b-m2-02-consumer-fixture-final
  /tmp/logic2b-m2-02-consumer-evidence-confirmed`: qualified fixture gate
  passed with the exact review requirement above, not an all-pass CLI verdict.
- `pnpm build`: all six build tasks passed, including immutable registry,
  packed-source CLI/MCP builds, web prerender and 179 docs OG images.
- `PLAYWRIGHT_CHROMIUM_PATH=... pnpm --filter @logic2b/web exec playwright test
  tests/verification-docs.spec.ts tests/customer-journey.spec.ts`: 33/33 passed,
  including 26 unchanged state visual baselines. An initial concurrent run had
  three stalled save-retry tests; isolated replay and the original complete
  workload subsequently passed unchanged, with no source or baseline weakening.
- `pnpm lint` and `pnpm test`: all nine workspace tasks passed; 442 tests.
  The first test attempt overlapped docs-image generation and read its temporarily
  absent manifest; the ordered rerun after build passed. Final CLI negatives
  include unavailable tools/build, missing selectors, failed assertions/actions,
  changed source, unsafe files, malformed evidence and stalled/late browser
  context creation. Unit checks do not replace the consumer run.
- `PLAYWRIGHT_CHROMIUM_PATH=... pnpm --filter logic2b test:verify-browser`:
  11/11 actual-browser tests passed, including redirect-chain isolation,
  final-action navigation, deadlines, axe failures and CLI status codes.
- `pnpm test:release-artifacts`: final CLI and MCP tarballs installed into an
  isolated consumer; public commands, unavailable-verification reports and
  all 21 stdio output contracts passed. No runtime browser dependency was
  silently bundled or installed by `verify`.
- Local Wrangler HTTP `/mcp`: all 21 tools listed; pass/fail/unknown/skipped
  report parity plus the real 228-check consumer report matched shared core,
  structured result and JSON text. Missing evidence rejected with `-32602`.
- `pnpm --filter @logic2b/web test:budgets`: passed; browser JS 1,986.0 KiB,
  MCP Worker chunk 776.9 KiB, server modules 1,574.2 KiB, docs OG 4,002.3 KiB.
  Wrangler `deploy --dry-run` packaged successfully without deployment.
- Packaged skill validator and `git diff --check`: passed. CI was configured;
  remote GitHub CI and the full unrelated site accessibility/visual/Lighthouse
  matrices were not run locally for this delivery.

This is local source delivery, not npm publication or remote deployment.
Selected file hashes do not prove which build a server loaded; screenshot
capture does not constitute human approval. Synthetic in-memory persistence
and permission simulation do not verify a real backend. Next: M2-03 combines
create/change/upstream-update acceptance, preserving a custom column, copy and
token override, using this verification contract and explicit conflict evidence.
The M2 milestone remains open.

### 18 September 2026 — M2-03

Completed the generated consumer's customization/change/update lifecycle on
`codex/m2-03-customer-update-acceptance`. Guide 15 and the fixture README document
explicit prepare, install, build, change, update and check phases; CI retains
all three browser reports and the synthetic maintenance evidence. No additional
public CLI command, MCP tool or dependency was introduced.

The first real change plan adds an Account owner column (with a mobile summary),
custom workspace copy and primary-color token override. A second plan adds
segment filtering while preserving those edits and a concurrent consumer note.
Dry-run, stale rejection and repeated apply preserve file bytes and metadata.
The actual immutable rc.17 to rc.18 update retains every customization and the
upstream table-scroll fix. A separate fresh plan explicitly advances only the
consumer's registry pin; default-version status then agrees with the rc.18 lock.
A conflicting consumer records both marked alternatives, rejects repeated update
without writes and accepts an explicit resolution combining both intended edits.

The fixture exposed two updater defects: independent adjacent lines conflicted,
and repeating a marked update could report success after its base advanced.
Merge hunks now use base-coordinate overlap, with focused insertion/deletion,
transitive overlap and final-newline coverage. Tagged markers and a bounded,
validated `.logic2b/update-conflicts.json` record preserve unresolved status;
CLI exits 1 for conflicts or missing-base differences. A later upstream rename
or removal cannot bypass a pending conflict. Record readers and writers share
the registry path contract, including valid long paths. Ordinary marker examples
remain usable. Large divergent merges reject before exceeding the 4,000,000-cell
comparison budget. Multi-file upstream updates still require a stable workspace;
they do not acquire the incremental apply workflow's transaction guarantees.

Final fresh consumer: `/tmp/logic2b-m2-03-close`. Evidence directories:
`/tmp/logic2b-close-customized`, `/tmp/logic2b-close-changed` and
`/tmp/logic2b-close-updated`. Results are 212 pass/0 unknown across 20 runs,
232 pass/0 unknown across 22 runs, and 252 pass/4 unknown across 24 runs,
respectively: 700 declared checks, zero failures or skips, 696 passes. The four
unknowns remain the translated 200% table-scroll contrast observations; original
CLI exit is 2 and the qualified fixture gate does not turn them into passes.
Every incomplete finding must be exclusively color-contrast/elmPartiallyObscured.
A separate browser replay validates each recorded selector's membership in the
named table and rejects the real page heading as a negative probe. It records
ancestry separately, not as proof of the original axe instant or contrast.

Agent screenshot review covered ordinary mobile/desktop list, read-only views
and the translated 200% list/edit views. It caught an overlapping custom heading;
wrapping that heading fixed the layout and the entire consumer was recreated.
A browser Range measurement now guards the header bounds. The rendered custom
primary button has the expected colors and a measured 7.56:1 contrast ratio.
Human contrast review across table scroll positions remains outstanding.
Build/source/artifact hashes are local observations, not remote attestation;
synthetic persistence and permissions do not verify production services.

Checks and outcomes:

- `pnpm --filter logic2b journey:prepare /tmp/logic2b-m2-03-close`, explicit
  `pnpm --dir /tmp/logic2b-m2-03-close install --frozen-lockfile=false`, then
  `journey:build` and `test:journey` for each stage, with `journey:change` and
  `journey:update` between them: passed with the qualified result above.
  Browser commands used `PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`.
  Maintenance artifacts include actual process exits, plan ids, marked source,
  original/resolved source hashes and before/after no-write observations.
- `pnpm build`: six workspace build tasks passed. `pnpm lint` and `pnpm test`:
  nine tasks passed, 460 tests including 138 CLI tests after final fixes.
- `pnpm test:release-artifacts`: final CLI/MCP tarballs packed, installed and
  exercised; all 21 MCP stdio output contracts passed.
- `PLAYWRIGHT_CHROMIUM_PATH=... pnpm --filter @logic2b/web exec playwright test
  tests/beta-onboarding.spec.ts tests/customer-journey.spec.ts
  tests/verification-docs.spec.ts`: 35/35 passed, unchanged state baselines.
  The separate `tests/review-docs.spec.ts tests/change-docs.spec.ts` run passed
  4/4. `pnpm benchmark:agents:test` passed 29/29.
- Focused update/merge/library regression run passed 69/69; strict NodeNext
  typing of runner and fixture passed. Isolated negative probes rejected wrong
  stage order, changed source and tampered production assets before checking.
  The initial diagnostic color assertion rejected minified `#fff`; matching the
  equivalent white representation fixed that assertion without altering colors.
- `pnpm --filter @logic2b/web test:budgets` passed with unchanged browser/Worker
  sizes. All 81 checked local Markdown link targets and `git diff --check`
  passed. This task does not change any existing registry payload or manifest.

The user requested stopping development here, merging/pushing the completed
work to GitHub and deploying production. Those delivery actions require actual
remote confirmation; local checks alone do not establish a deployment or a
successful GitHub CI run. npm publication is a separate release action. M3-01
remains the next queued task and has not been started.

### 18 September 2026 — Delivery follow-up

Merged the completed work through M2-03 into `main` and pushed `7d0202d` as
requested. GitHub run 35346959973 passed build, lint, unit tests, package and
starter consumer checks, then exposed the aggregate docs OG budget on Linux:
179 images total 4099.5 KiB versus the old 4096 KiB cap. The same images total
4002.3 KiB on the local macOS renderer. The original main had 173 images; the
six added routes are EN/ES review, changes and verification documentation.

The delivery follow-up sets the aggregate allowance to 4.25 MiB for that
expanded set, retaining the existing 64 KiB individual image cap and all JS,
Worker, registry and token limits. PNG generation already uses maximum
compression/effort; no image pixels, generator settings or dependencies change.
Local `pnpm --filter @logic2b/web test:budgets` and `git diff --check` pass.
A fresh GitHub run and actual Cloudflare production checks must confirm delivery;
this entry does not label the failed first CI run as successful.

The next run, 35347507948, passed the corrected budget and all generated
consumer/lifecycle gates with the same explicit four contrast unknowns, then
failed only two populated-table screenshots. The 390px reference had a 148px
customer-cell content box; Isabella's mobile summary measured 148.546875px on
macOS and wrapped to a second 16px line. Linux captured one fewer line, so the
full-page height differed by 16px. Empty/no-match captures and all functional
assertions passed. Measurements at 320/390/414px in Chrome 153 and headless
Chromium 140 confirmed this boundary; the Playwright 149 download failed TLS
validation and was not bypassed.

Only the two populated-table visual captures now use 414px, leaving 23.45px of
text-width margin. All other state screenshots retain 390px, as do the narrow
functional journey and generated consumers. Screenshot tolerances, component
CSS, demo data and immutable registry files are unchanged. Both new PNGs were
visually reviewed. CI now preserves functional screenshot diffs on failure.
The complete customer journey suite passed 31/31 on Chrome 153; the two revised
snapshots also passed on headless Chromium 140 without updating baselines.

Run 35348837517 confirmed equal 414 × 1366 geometry but still found 9376
light / 9445 dark pixels differing across macOS and Linux. Its preserved
actual/expected/diff PNGs show host text rasterization and native select widths;
all six rows, card boundaries, controls and content remain intact. Both initial
and retry captures are byte-identical. Reviewed Linux references now cover only
these two populated-table states; existing macOS references and the 1.5% pixel
tolerance remain unchanged. No product source or registry bytes change. The
failed-browser artifact upload moves after the remaining site gates so their
failure evidence is retained too. Local targeted success captures and web type
checks pass; a new Linux CI run remains necessary to confirm the new references.
