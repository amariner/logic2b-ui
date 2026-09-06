# Agent execution queue

Canonical direction: [ROADMAP](../ROADMAP.md). Updated 6 September 2026.
Owners below identify active work, not permanent maintainers. `ready` means
the scope is specified; only start after the Dependencies column is satisfied.
`planned` is a milestone, not a shipped API. Completed evidence is recorded below.

| ID | Task and guide | Dependencies | Status | Owner |
| --- | --- | --- | --- | --- |
| DIR-01 | Reorient roadmap, contributor instructions and executable contracts | — | done | current agent |
| M0-02 | Typed MCP results with backward-compatible text — [13](guides/13-mcp-contracts.md) | DIR-01 | done | current agent |
| M0-01 | Honest beta onboarding and advertised package selectors — [00](guides/00-public-beta.md) | DIR-01 | done | Codex (M0-01) |
| M0-03 | Immutable default registry resolution — [13](guides/13-mcp-contracts.md) | M0-02 | done | Claude (M0-03) |
| M0-04 | MCP input/resource limits and negative protocol corpus — [13](guides/13-mcp-contracts.md) | M0-02 | done | Claude (M0-04) |
| M0-05 | Public landing/demo and contributor/release health — [00](guides/00-public-beta.md) | M0-01 | in-progress (code/docs landed; video + pilot pending) | Claude (M0-05) |
| EVAL-01 | Comparative protocol and baseline measurements — [14](guides/14-outcome-evaluation.md) | DIR-01 | ready | — |
| M1-01 | State/content/action contract; customer list + edit form first — [02](guides/02-ui-states-and-content-contract.md) | M0-03 | ready | — |
| M1-02 | Project context contract and local collector — [10](guides/10-project-context.md) | M0-04 | ready | — |
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
