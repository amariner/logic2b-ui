# 12 — Verify the generated interface in its consuming project

Status: implemented in the source candidate; execution evidence and release
status are tracked in [EXECUTION.md](../EXECUTION.md). Task: M2-02. Depends on
behavior contracts and static review. Source availability does not establish
npm publication or remote endpoint deployment.

## Outcome

The agent can distinguish "source looks plausible" from "the customer can
actually complete this interaction". Site CI is necessary but does not execute
every consumer's generated composition.

## Contract and trust boundary

The pure shared contracts live in `@logic2b/scaffold/verification`; structural
JSON Schemas live in `@logic2b/scaffold/verification-schema`. They have no Node,
filesystem, browser or network dependency. `validateVerificationSuite` validates
declarative inputs; `hashVerificationSuite` and `projectFingerprint` generate
canonical SHA-256 fingerprints. The asynchronous `validateVerificationReport`
checks nested values, fingerprints and reference consistency;
`summarizeVerificationReport` derives coverage against the declared matrix.

`VerificationSuiteV1` contains `schemaVersion: 1`, explicit `projectFiles`, an
optional incremental `planId`, named `viewports` with width/height, and named
`scenarios` with a same-origin route and ordered steps. Every scenario runs in
every declared viewport and requires at least one uniquely named check. File
paths are canonical app-relative files; environment, dependency, Git, journal,
traversal and case/ancestor collisions are rejected. Routes contain only a local
path/query/fragment; the runner supplies the origin separately.

Selectors use exact `role`/optional accessible `name`, `label`, `text`, or
`test-id` matching. Actions are `click`, `fill`, `select`, `press` and
`text-scale` (100–300 percent). Checks are `visible`, `hidden`, `enabled`,
`disabled`, `focused`, `text`, `value`, `accessible-description`, `attribute`,
`count`, `order`, `overflow`, `screenshot` and `axe`. The schema does not accept
JavaScript, shell commands, regexes, CSS selectors or arbitrary callbacks.
Any axe `disabledRules` are explicit suite data and surfaced as a limitation.

`VerificationReportV1` embeds the suite, its `suiteSha256`, the tested HTTP(S)
`origin`, and selected-file project evidence: `scope: "selected-files"`, exact
file paths/digests, their canonical `fingerprint`, and
`servedSourceBinding: "unverified"`. The fingerprint identifies those files;
it neither covers unselected files nor proves that a running server loaded
their current contents. An optional suite `planId` associates the checks with
a change plan without proving that the plan was applied.

Each scenario/viewport run supplies `status`, a bounded reason and, for a
failed step, its zero-based index. Each check identifies its scenario, viewport,
check id, evidence kind (`static | browser-measured | human-reviewed`), status
(`pass | fail | skipped | unknown`), reason and evidence ids. Pass/fail checks
need compatible references: browser logs for ordinary runtime assertions,
axe results for axe checks, images for screenshot capture, static results/logs
for static analysis, or human notes for human review. Evidence records carry
their id, kind, reference, SHA-256 and a tool name resolving to the report's
explicit tool/version inventory. A relative artifact path or credential-free
HTTP(S) URL is inert reference data; validation never reads or fetches it.

The summary retains evidence, tool versions, routes, viewports and check/run
counts. Missing checks or runs become `unknown`. Static/human passes do not
establish browser assertions and become `unknown` for browser coverage. A
failed check overrides a claimed passing run; a failed action after the final
passing assertion still fails its run. Failures dominate missing coverage;
otherwise unknown dominates skipped, and a pass requires every expected check
and run to pass. A screenshot pass proves capture only, not visual approval.
Automated axe results are not a WCAG conformance statement. There is no score.

Inputs are capped at 1 MiB serialized UTF-8 JSON, 64 selected files, 16
scenarios, four viewports, 64 steps per scenario, 256 expected checks across
the matrix, 512 evidence records, 16 evidence ids per check, 16 tools and 32
notes. Selected local source collection is capped at 2 MiB per file and 16 MiB
total; file paths are at most 256 characters. Viewport dimensions are integers
from 240 to 3,840 pixels. Text and array bounds are declared in the schema and
validated again by the shared core, including Unicode and reference integrity.

The local/browser-capable host runs the already started app in its authorized
environment. The remote MCP validates and summarizes host-submitted evidence;
it does not attest that measurements happened, browse URLs or execute source.
Fingerprints check consistency, not authenticity or authorization. Do not
upload screenshots, source or personal customer data to third-party services
as part of verification without appropriate authorization.

## Reference coverage

- Customer table: empty data, loading, error/retry and populated view.
- Filter changes results; clearing restores them; no-match is distinct from no
  customers. Sorting is stable and state changes are announced appropriately.
- Edit form: labels, linked errors, submit-in-progress, success, failure with
  preserved input and unauthorized action. Keyboard can open, operate and close
  the flow with sensible focus restoration.
- Desktop and narrow mobile viewport; no accidental horizontal page overflow;
  long names, translated labels and increased text size remain usable.
- axe findings and visual evidence for the tested states. Automated results are
  not a blanket WCAG conformance statement.

## Local runner and generated consumer

CLI `verify <suite.json> --cwd APP --url ORIGIN --output NEW_DIRECTORY` loads
explicitly installed `playwright` and `@axe-core/playwright` from the selected
application. The reference host pins Playwright 1.61.1 and axe's Playwright
adapter 4.12.1. Browser installation is also explicit, or use an existing
compatible executable through `--browser-executable` /
`PLAYWRIGHT_CHROMIUM_PATH`. App dependency installation, build and start are
separate operations; the runner invokes none of them.

The CLI accepts only HTTP(S) origins on `localhost`, `127.0.0.1` or `[::1]`.
It uses a fresh browser context per scenario/viewport and blocks external-origin
HTTP, all HTTP redirects including same-origin redirects, WebSockets, popups
and service workers. Suites must name final routes. Observed blocked requests,
WebSockets or popups prevent a passing run. Browser actions execute in the authorized local app;
use isolated synthetic data. No test file, source module or arbitrary submitted
JavaScript is loaded as a scenario.

The new evidence directory contains `report.json`, `summary.json` and local
JSON/PNG artifacts with SHA-256 references. Output parents must already exist;
existing directories reject. Local artifacts are bounded to 4 MiB each and
64 MiB total, with space reserved for the final report/summary. The runner
rechecks all selected source fingerprints afterward and fails runs if they
changed or became unreadable. This still does not establish served-source
binding. `--timeout` is bounded to 50–30,000 ms per step (default 5,000), and
`--budget` to 1,000–300,000 ms for scenario execution (default 120,000).

Missing browser tools or a browser executable produce skipped runs with
reasons. `--app-unavailable REASON` records a host-reported build/start failure
without loading the browser; it is explicitly not an independently observed
build result. Unreachable routes, failed assertions/actions and timeouts fail
runs and skip later checks. Axe uses WCAG 2.0/2.1 A/AA tags with no implicit
rule exclusions: violations fail, incomplete results remain unknown. If axe
or screenshot execution fails before producing its compatible artifact, its
check is unknown and its run fails. Exit codes are 0 for complete pass, 1 for
failure, 2 for unknown/skipped or invalid input; CLI usage errors retain 1.

The generated fixture prepares a Vite consumer from immutable registry
`1.0.0-rc.18` and installs the customer list/edit blocks through existing
scaffold/add paths. It verifies copied bytes against immutable payloads and
records installation provenance. Its deterministic in-memory host owns
sorting, persistence simulation, authorization simulation and focus restoration.
Assertions use explicit externally observable expectations, not expected values
imported from implementation functions. Production persistence, actual server
authorization and unlisted routes remain unverified.

```bash
pnpm --filter logic2b consumer:prepare /tmp/logic2b-consumer
pnpm --dir /tmp/logic2b-consumer install
pnpm --dir /tmp/logic2b-consumer exec playwright install chromium
pnpm --dir /tmp/logic2b-consumer run build
pnpm --filter logic2b build
pnpm --filter logic2b test:consumer /tmp/logic2b-consumer /tmp/logic2b-consumer-evidence
```

Use new directories. Preparation does not install or build. The fixture checker
serves the existing build on loopback, invokes the real CLI, validates complete
coverage/provenance/artifact hashes and stops its server. The fixture gate
rejects failures, skipped checks and unexpected unknowns. It accepts only
specifically validated `color-contrast` incomplete results with
`elmPartiallyObscured` evidence from text clipped by the increased-text table's
scroll viewport. Those checks remain unknown, the CLI retains exit 2 and no
axe rule is disabled. A successful fixture gate is conditional acceptance of
that recorded review need, not a passing accessibility result. CI separates
these steps and retains evidence artifacts. See the [English guide](../../apps/web/src/content/docs/verification.mdx)
and [Spanish guide](../../apps/web/src/content/docs-es/verification.mdx) for
the suite example, selector/action reference and MCP workflow.

The real narrow-screen consumer exposed a hidden-name defect at increased
root text size: the page itself did not overflow, but a customer table cell
collapsed. Registry rc.18 adds a minimum table width and a named, keyboard-
focusable scroll region; generic `Table` accepts optional `containerProps`.
Earlier immutable payloads stay unchanged. Page-overflow checks alone do not
prove content remains visible; the fixture also checks the customer name and
scroll-region semantics. Release, npm and endpoint publication remain separate.

## Remote reporting and handoff

MCP `verify_report` is the twenty-first source-candidate tool. Its arguments
are the complete parsed report itself, not a wrapper. The tool returns the
shared coverage summary as identical structured content and JSON text. Invalid
input is a sanitized JSON-RPC `-32602` error. Local stdio has the same data-only
boundary as HTTP: neither transport executes browser checks or follows evidence
references.

Relevant verification includes inaccessible host, explicit unavailable-build
reporting, missing selector, assertion/action failure, timeout, changed source,
missing browser capability and malformed evidence. Record exact commands,
routes/viewports, artifact locations and remaining human inspection in the
execution handoff; do not substitute source/unit checks for a consumer run or
claim unrun CI. M2-03 combines this runtime evidence with incremental changes
and upstream updates to preserve custom columns, copy and tokens end to end.
