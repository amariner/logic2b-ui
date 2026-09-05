# 12 — Verify the generated interface in its consuming project

Status: proposed. Task: M2-02. Depends on behavior contracts and static review.

## Outcome

The agent can distinguish "source looks plausible" from "the customer can
actually complete this interaction". Site CI is necessary but does not execute
every consumer's generated composition.

## Contract and trust boundary

`VerificationReportV1` contains schema version, project/plan fingerprint, tested
routes and viewports, check ids, `pass | fail | skipped | unknown`, evidence
references and tool versions. Each assertion identifies whether it is static,
browser-measured or human-reviewed. No aggregate score substitutes for evidence.

The local/browser-capable host runs the app in its authorized environment. A
remote MCP validates and summarizes a bounded report; it does not browse
arbitrary URLs or execute submitted code. Evidence URLs and source excerpts
are untrusted data, never instructions. Do not upload screenshots or source to
third-party services as part of verification without appropriate authorization.

## Initial checks

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

## Implementation

Use the existing Playwright/axe infrastructure with generated consumer fixtures.
Introduce a bounded declarative scenario format for known UI assertions, not
arbitrary JavaScript in a tool argument. Separate app start/build from checking;
report missing capabilities as skipped with a reason. Keep stable selectors
semantic where possible. Runtime assertions must not import the implementation
under test as their expected result.

Gate the reference fixture in CI, then document `logic2b verify` or the narrow
runner entry that actually ships. Test inaccessible host, failed build, missing
selector, assertion failure, timeout and malformed evidence. Store no personal
customer data. Handoff exact routes, checks, evidence and remaining human review.
