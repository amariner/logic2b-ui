# Agent execution queue

Canonical direction: [ROADMAP](../ROADMAP.md). Updated 3 October 2026.
Owners below identify active work, not permanent maintainers. `ready` means
the scope is specified; only start after the Dependencies column is satisfied.
`planned` is a milestone, not a shipped API. Completed evidence is recorded below.

| ID | Task and guide | Dependencies | Status | Owner |
| --- | --- | --- | --- | --- |
| SYNC-01 | Integrate pending theme gallery, MCP contracts and release documentation (user requested) | M0-04 | done | Codex |
| DIR-01 | Reorient roadmap, contributor instructions and executable contracts | — | done | current agent |
| M0-02 | Typed MCP results with backward-compatible text — [13](guides/13-mcp-contracts.md) | DIR-01 | done | current agent |
| M0-01 | Honest beta onboarding and advertised package selectors — [00](guides/00-public-beta.md) | DIR-01 | done | Codex (M0-01) |
| M0-03 | Immutable default registry resolution — [13](guides/13-mcp-contracts.md) | M0-02 | done | Claude (M0-03) |
| M0-04 | MCP input/resource limits and negative protocol corpus — [13](guides/13-mcp-contracts.md) | M0-02 | done | Claude (M0-04) |
| M0-05 | Public landing/demo and contributor/release health — [00](guides/00-public-beta.md) | M0-01 | in-progress (code/docs landed; video + pilot pending) | Claude (M0-05) |
| REL-01 | Publish the paired CLI/MCP npm release candidate — [release guide](../RELEASING.md) | M0-01, M0-02, M0-03, M0-04 | in-progress (rc.3 prepared and pushed; npm publication pending) | Codex |
| EVAL-01 | Comparative protocol and baseline measurements — [14](guides/14-outcome-evaluation.md) | DIR-01 | in-progress (protocol/report landed; real baselines pending) | Codex (EVAL-01) |
| M1-01 | State/content/action contract; customer list + edit form first — [02](guides/02-ui-states-and-content-contract.md) | M0-03 | done | Codex (M1-01) |
| M1-02 | Project context contract and local collector — [10](guides/10-project-context.md) | M0-04 | done | Codex (M1-02) |
| M1-03 | Agent rules delivered with installs — [07](guides/07-agent-rules-distribution.md) | M0-01 | ready | — |
| M1-04 | Evidence-based static review; high-confidence rules first — [03](guides/03-review-ui.md) | M1-02; M1-01 for states | ready | — |
| M2-01 | Incremental change plan and preconditioned apply — [11](guides/11-incremental-change-plan.md) | M1-02 | ready | — |
| M2-02 | Consumer runtime verification — [12](guides/12-consumer-verification.md) | M1-01, M1-04 | ready | — |
| M2-03 | Customer journey create/change/update acceptance fixture | M2-01, M2-02 | ready | — |
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

### 8 September 2026 — REL-01 (release preparation)

Prepared the paired `logic2b@1.0.0-rc.3` and `@logic2b/mcp@1.0.0-rc.3`
candidate on `codex/npm-rc3-release` (`ab99e2c`) and pushed the branch to
GitHub. Both changelogs describe the candidate; the MCP changelog records all
16 tools. Public npm metadata still reports `next` as `1.0.0-rc.2` and confirms
that rc.3 is unused for both packages. No package or dist-tag was published.

Passed on Node 24.7.0 / pnpm 11.10.0: `CI=true pnpm install
--frozen-lockfile`; `pnpm build`; `pnpm lint`; `pnpm test`;
`pnpm benchmark:agents:test` (15 tests); `pnpm test:release-artifacts`
(both packed rc.3 tarballs installed in an isolated consumer; CLI
version/help/scaffold and all 16 MCP output contracts verified over stdio);
`pnpm --filter @logic2b/mcp test:scaffolds` (six generated consumers installed
and production-built); `pnpm --filter @logic2b/web test:budgets`; both package
`pack --dry-run` allowlists; and `git diff --check`. The public landing and
registry returned HTTP 200; `/mcp` returned its expected GET 405.

The first local accessibility pass saturated Chrome with four workers after
all 76 block previews passed. A two-worker retry passed those previews plus the
first six component/chart batches in both themes, then stalled when a separate
Playwright job from another workspace started competing for the same browser;
only this repository's runner was terminated. The full accessibility, visual
and Lighthouse gates remain for isolated CI and must not be described as
passed for this commit. Publication also still requires CI to pass for the
exact candidate commit and separate user authorization to publish both npm
packages to `next`, followed by the live beta-onboarding check and compatibility
documentation update.


### 3 October 2026 — EVAL-01 (protocol/report delivery; measurements pending)

Delivered on `codex/eval-01-comparative-protocol`, from the clean
`codex/npm-rc3-release` checkout at `2051eec`. The v2 comparative protocol,
attempt/cohort JSON schemas, shared offline evaluator and report CLI live in
`benchmarks/agents`. Four conditions cover public-documentation baseline,
existing CLI/MCP, planned context/behavior/review/change workflow and a planned
no-review ablation. Five tasks cover the customer journey, failure/permission
recovery, local customization, upstream updates and held-out transfer. The
seeded default schedule contains 100 assignments, including 50 planned ones;
no schedule entry is a measurement.

`pnpm benchmark:agents:report:v2` emits separate JSON/Markdown reports; the
checked-in report states `pending` with zero real observations. New v2 contracts
require exact version/alias metadata, declared budgets, explicit unavailable
metrics, independent check observations and hashed artifact references.
Frozen `cohorts.json` manifests pin the exact protocol, commit, docs/registry/
rubric digests, browser, host/model/runtime/capabilities/versions/budgets,
fixture digests and complete deterministic assignment schedule before outcomes.
The first record and all later records must match those controls. Missing
assignments remain in the primary denominator; human-assisted rescues remain
primary failures and are also summarized separately. Without a cohort manifest,
only observed counts are available and readiness cannot be claimed. Failed,
unknown or missing required checks and unverifiable budget usage do not pass.

The reader bounds manifests (1,000,000 bytes), artifacts (16,000,000 bytes each;
64,000,000 declared bytes per attempt), counts (128 artifacts/1,000 attempts)
and actual reads. It rejects traversal, symlinks and special files, verifies
sizes/hashes and treats source as inert bytes. CLI writes reject symlink
ancestors before creating directories and cannot target v1 runs/results.
Malformed metadata aborts before replacing an existing report; invalid artifact
evidence remains a failed observation. No dependency, telemetry or model
execution was added. No published registry payload, v1 protocol, v1 run/result
or lockfile changed. Hashes establish retained byte integrity; truthful
observations and evaluator independence remain the collector's responsibility.

Passed on Node 24.7.0 / pnpm 11.10.0:

- `pnpm benchmark:agents:test`: 76 tests (50 core v2, 11 CLI, 15 existing
  harness regressions), all passed. Covers incomplete observations, unavailable
  usage, tampering, inert submitted JS, symlinks/FIFOs, rescued/omitted failure
  denominators, predeclared controls, deterministic multi-cohort aggregation,
  synthetic exclusion, CLI privacy and archived-result preservation.
- `pnpm --dir benchmarks/agents lint`: strict TypeScript passed.
- `pnpm lint` and `pnpm test`: eight workspace packages passed; seven unchanged
  package tasks reused Turbo cache, and the benchmark package executed.
- `pnpm benchmark:agents:report:v2`: generated the honest pending report.
  `pnpm --dir benchmarks/agents report:v2 --plan` is also exercised by the CLI
  suite without invoking agents or writing outcomes.
- `git diff --check`: passed. `git diff --quiet --
  benchmarks/agents/protocol.json benchmarks/agents/results
  benchmarks/agents/runs apps/web/public/r pnpm-lock.yaml`: passed.

Limitations: no real comparative trials or fabricated baseline numbers; no
paid model run, participant contact, npm publication, merge or push. Actual
customer/held-out fixtures, independent browser assertions and repeated
baseline/treatment measurements remain pending, so EVAL-01 stays `in-progress`.
The new workflow/ablation cannot accept real attempts until their tools exist.
Full build, release-artifact, scaffold-consumer, browser visual/axe and
Lighthouse suites were not rerun for this offline benchmark change. The v2
reporter ingests trusted evaluator evidence; it does not run consumer builds or
browser assertions itself.

Next ready task: M1-01, the state/content/action contract and customer list/edit
form. Its implementation also supplies the customer behavior needed for v2
fixtures. EVAL-01's remaining collection work must freeze those fixtures and
obtain applicable authorization before launching paid trials or outreach.

### 3 October 2026 — M1-01

Completed the first two-block customer journey on
`codex/m1-01-customer-journey` (delivery commit subject:
`feat(customer): complete M1-01 behavior and edit journey`).
The existing list now accepts data/status, copy, controlled/local search and
create/edit/retry callbacks with derived counts. The new customer editor
provides controlled name/email/company/segment fields, linked validation,
submitting protection, preserved failed-save input, retry, permission denial,
success and guarded cancellation. The integrated demo creates/edits in memory,
guards all dialog dismissal paths, restores focus and retains drafts after a
simulated failed save. It explicitly explains that no backend is connected.

Changed contract: optional `RegistryItem.behavior`, schemaVersion 1, with all
12 state classifications, transitions/preserved input, literal content slots,
public action props, closed customer intents, journey, responsive evidence and
consumer duties. Shared types/schema/validation live in scaffold. Registry lint
parses inert TypeScript AST to verify declared copy samples/paths and action
props; it never executes source. CLI and MCP validate/forward present metadata
while preserving historical omission. MCP list/search/get/install outputs and
CLI installs carry the duties. Copy Prompt, generated AGENTS and the live States
section use the same evidence. No unimplemented tool is requested by those
instructions. Guide 02 now describes this slice rather than all-catalog coverage.

Local registry rc.17 adds one required editor block and changes the list,
producing two new content-addressed payloads and a new manifest. Existing
immutable payloads/manifests stayed byte-for-byte unchanged. The lockfile adds
only the existing scaffold workspace link to registry; no third-party version
or runtime dependency changed. Dependencies were installed explicitly with
`CI=true pnpm install --frozen-lockfile --ignore-scripts --reporter=append-only`.
An offline lock-only attempt could not verify supply-chain metadata; the
authorized network-backed install passed. An incidental transitive lock change
was restored before the final frozen installation and checks.

Passed checks:

- `pnpm --filter @logic2b/registry build`: 142 items, rc.17 integrity artifacts.
  The sandboxed tsx command initially hit IPC EPERM; authorized execution passed.
  The immutable guard correctly rejected a changed local draft; only this
  delivery's unpublished/untracked draft was removed before final regeneration.
- `pnpm lint` and `pnpm test`: all eight packages passed, 382 tests
  (three unchanged packages cached). New coverage includes core negative
  validation, inert AST drift checks, CLI boundaries/plan propagation and 22 MCP
  behavior regressions. `pnpm --filter @logic2b/web lint` passed again after the
  final demo changes.
- `pnpm --filter @logic2b/web build`, then
  `pnpm --filter @logic2b/web exec astro build` after the final interaction fixes:
  passed. Final assets were built before final browser/packed checks.
- `pnpm --filter @logic2b/web exec node --import tsx --test
  test/behavior-contract.test.ts test/beta-onboarding.test.ts`: five tests passed.
- `pnpm test:release-artifacts`: both source tarballs built/installed in an
  isolated consumer. All 16 packed MCP tools passed official-client output
  validation; new customer get/install metadata/source/duties matched immutable
  rc.17 payloads. Packed CLI installs both blocks into an rc.16 starter and
  preserves its existing login source/base snapshot. Early test assertions for
  unexposed requestedVersion/snapshots were corrected to match the wire contract.
  An early run during a build lacked generated endpoints; the final run passed.
- With `PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`,
  `pnpm --filter @logic2b/web exec playwright test
  tests/customer-journey.spec.ts --workers=1`: 12/12 passed, 2.9 minutes.
  Covers keyboard create/edit, required-field focus, preserved failure/retry,
  duplicate-submit prevention, Escape/Cancel/discard protection, focus recovery,
  permission/empty/no-results/retry and working detail-page States.
  All pageerror checks passed. Includes 52 light/dark state captures and
  structural axe/overflow checks at 390/1280 px; 54 screenshots retained locally.
  CI now runs the suite and uploads its browser evidence.
- Same Chrome override and `PLAYWRIGHT_PORT=4321`:
  `pnpm --filter @logic2b/web exec playwright test tests/visual.spec.ts
  --grep 'blocks/(admin-customers-01|customer-edit-01)' --workers=1
  --output=/tmp/logic2b-m1-visual-retry`: 4/4 passed.
  Both new form baselines were visually inspected; existing baselines unchanged.
  The initial missing-baseline run stalled during failure cleanup and was
  interrupted, then retried with one worker and the reviewed baselines.
- Same Chrome/port override:
  `pnpm --filter @logic2b/web exec playwright test tests/a11y.spec.ts
  --grep 'admin-customers-01|customer-edit-01' --workers=1
  --output=/tmp/logic2b-m1-axe`: 4/4 passed. Structural axe excludes color contrast.
  A separate isolated Chrome audit (`node /tmp/logic2b-m1-contrast-audit.cjs`
  against `node tests/serve.mjs 4322`) checked six error/validation variants:
  no contrast violations or incomplete results. Default error text ratios
  ranged from 4.50:1 to 6.20:1; no global token change was needed.
- `pnpm --filter @logic2b/web test:budgets`: passed. Final browser JS
  2010.8 KiB / 2048 KiB, largest chunk 193.4 KiB / 350 KiB. Registry index
  97.4 KiB and active delivery 776.9 KiB exceed the old aggregate caps; the
  measured +49 KiB two-block source/evidence addition justifies new 104/800 KiB
  caps. Per-item 32 KiB, browser and manifest 128 KiB caps stayed unchanged.
- `git diff --check` and `git diff --quiet -- apps/web/public/r/content
  apps/web/public/r/versions`: passed for tracked historical bytes.

Browser checks caught and fixed a real nested-dialog reopen/focus race and
fast-Escape stale-draft loss; assertions were retained. The initial journey run
was 9/12 and is not accepted as completion; final 12/12 is the evidence above.
Chrome is the installed macOS build; matching bundled Chromium/CI was not run.
Full catalog browser/visual suites, three-framework scaffold builds, Lighthouse
and root full build were not rerun locally. This does not claim all custom
palettes pass contrast, a backend exists, M1 is complete, or npm/site publication
has happened. Offline/partial handling and navigation/server authorization
remain explicit consumer duties. EVAL-01 real baselines and M0 pilot evidence
remain pending; no paid trials or outreach were launched.

Next ready task: M1-02, the shared project-context contract and local collector.
M1-03 is also unblocked. M1-04 static review still needs M1-02; M2 consumer
change/update evidence remains separate from this journey implementation.


### 3 October 2026 — M1-02

Completed on `codex/m1-02-project-context` (delivery commit subject:
`feat(project): add bounded project inspection for CLI and MCP`).
The local CLI `inspect` reads configuration without writes, execution, installs
or registry requests. It reports confirmed paths, declared versions, host
capabilities and unknowns before component selection. `--app-root` selects one
workspace application; `--details` hashes confirmed installed destinations and
retained bases; repeatable `--file` fingerprints additional inert bytes.
`--snapshot` exports sanitized metadata for hosts. The pure MCP
`inspect_project` accepts that snapshot, performs no filesystem/network work and
returns the same compact/detail contract as structured data and JSON text.
Generated Copy Prompt/AGENTS guidance preserves existing aliases, stylesheet
entries, native controls, wrappers and local edits, with an explicit empty-target
scaffolding path. No unpublished inspect command is advertised in those public
prompts; source instructions and package changelogs identify pending publication.

Changed contracts: shared `ProjectSnapshotV1`, `ProjectContextV1` and
`ProjectInspection`, all schemaVersion 1, plus exported nested JSON schemas and
limits in scaffold. Pure and Node-only package subpaths keep filesystem code
out of the worker. Context includes aliases/confirmed locations, static evidence,
unknowns, per-item registry version/integrity and observed current/base hashes;
capabilities require explicit host booleans and default false in CLI. Compact
summaries omit source bodies/full inventory. Manifest paths remain registry
relative; detail files use actual target paths. The last resolved registry
selection does not imply all installed item versions are equal.

Config limits: 128 KiB before extraction, 32 present configs, 1,000 inventory or
recorded file entries, 256-character paths, eight inheritance levels and four
extends parents. File/base reads are 1 MiB each/4 MiB total; result JSON values
are bounded to 16 KiB compact/512 KiB detail. Source/scripts/package names,
registry URLs and private dependency URL/file specifiers are not forwarded.
Unknown wrapper fields, schemas, capabilities, unsafe paths, case collisions,
symlink escapes and special files are rejected. Reader identity/metadata checks
detect concurrent replacements. Unknown options are never repaired into guessed
install locations.

Verification (Node 24.7.0 on macOS; exact commands):

- `pnpm lint`: passed all eight packages, four cached initially; final rerun
  after inspection corrections passed all eight, five cached.
- `pnpm test`: passed all eight packages, 468 checks, four packages cached.
  Review then found additional alias/version/config-count/theme mapping defects;
  the final relevant package reruns below cover those corrections.
- `pnpm --filter @logic2b/scaffold test`: final 51/51 passed, including 40 new
  context/collector checks across nine fixture families. Tree fingerprints stay
  unchanged; JSONC/local inherits/references and wildcard precedence compare
  against the installed TypeScript oracle. Missing, modified, unmodified and
  unverified files remain distinct. Limits, malformed/unknown inputs, metadata
  privacy, symlinks, FIFOs and concurrent replacement have retained regressions.
- `pnpm --filter logic2b test`: final 76/76 passed, including 11 new real-command
  checks for help/text/JSON, default cwd, app selection, capabilities, details,
  sanitized snapshots, unknowns, unsafe paths and unchanged trees.
- `pnpm --filter @logic2b/mcp test`: final 174/174 passed. Direct dispatcher,
  official-client stdio and HTTP test schema/text/typed equality, custom UI/base
  hashes, input privacy, no fetches, limits and oversized-detail -32602 errors.
- `pnpm --filter @logic2b/scaffold exec tsc --ignoreConfig --noEmit --strict
  --target ES2022 --module NodeNext --moduleResolution NodeNext
  --allowImportingTsExtensions --types node --skipLibCheck
  test/project-context.test.ts test/project-collector.test.ts`: passed. The first
  invocation omitted TypeScript 6's `--ignoreConfig` and was corrected after
  TS5112; that attempt is not counted as a pass.
- `pnpm --filter @logic2b/web exec node --import tsx --test
  test/beta-onboarding.test.ts test/behavior-contract.test.ts`: 7/7 passed for
  generated existing-app guidance and customer-contract regressions. Root test
  also passed all 29 web checks.
- `pnpm build`: final full workspace build passed all six build tasks, uncached,
  including CLI/MCP bundles and Cloudflare worker/static web output.
- `pnpm test:release-artifacts`: passed real tarball installation; CLI
  help/version/inspect, old rc.16 starter plus rc.17 customer additions and
  retained bases; all 17 MCP output contracts through the official stdio client.
  Packed inspect confirms Vite/src, aliases, capabilities false, item inventory
  and zero modified/missing/unverified files in that consumer.
- `pnpm --filter @logic2b/web test:budgets`: passed, browser JS 2,014.0 KiB,
  largest chunk 193.4 KiB; active registry 776.9 KiB/index 97.4 KiB. No caps
  increased. A 1,000-file snapshot measured 794-byte compact/122,482-byte detail
  in the core fixture; MCP fixture values 794/109,372 bytes, complete duplicated
  MCP results 1,706/226,908 bytes. JSON value and protocol sizes differ.
- `git diff --check` and `git diff --quiet -- apps/web/public/r/content
  apps/web/public/r/versions apps/web/public/og`: passed; immutable registry and
  generated social-image bytes are unchanged. No dependency/lockfile change.

Known limits: static configuration cannot verify runtime bundler aliases,
stylesheet imports or browser behavior. External/package tsconfig extends,
unsupported workspace patterns, competing apps/frameworks and ambiguous alias
alternatives remain unknown or request app selection. Unsupported declared
version formats remain unknown; manifest resolved/item versions require exact
supported versions. Locations use TypeScript metadata rather than executing
framework config. Native CSS entries are preserved: registry theme.css is
hashed next to the configured entry, not as globals.css/tokens.css. Existing
install_plan still uses its documented default layout; adapting custom paths and
imports is explicit host work until M2 preconditioned planning/apply exists.
Capabilities are declarations, not an apply authorization. An absent install
manifest does not imply an empty app or ownership of native/shadcn components.

Browser functional/axe/visual suites, Lighthouse, framework consumer-build
matrix, Node 18 distribution floor and remote/CI execution were not rerun for
this contract/generator change. No npm publication, push, deployment, paid trial
or outreach was performed. EVAL-01 real baselines and M0 pilot evidence remain
pending. Next ready task: M1-03, agent rules delivered with installs; M1-04 and
M2-01 are now unblocked by the implemented project-context contract.
