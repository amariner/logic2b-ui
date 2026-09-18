# Customer journey acceptance fixture

This repository fixture combines the actual CLI change/update workflows with
independent browser verification. M2-03 has local acceptance evidence with
explicit contrast review needs; the
[execution queue](../../../../../docs/EXECUTION.md) records commands actually
run and their results. The full contract is in
[guide 15](../../../../../docs/guides/15-customer-journey-acceptance.md).

Use a new project directory and a different new evidence directory for each
stage. Run these commands from the repository root:

```bash
pnpm --filter logic2b build
pnpm --filter logic2b journey:prepare /tmp/logic2b-journey
pnpm --dir /tmp/logic2b-journey install --frozen-lockfile=false
pnpm --dir /tmp/logic2b-journey exec playwright install chromium

pnpm --filter logic2b journey:build /tmp/logic2b-journey
pnpm --filter logic2b test:journey /tmp/logic2b-journey /tmp/logic2b-journey-customized

pnpm --filter logic2b journey:change /tmp/logic2b-journey
pnpm --filter logic2b journey:build /tmp/logic2b-journey
pnpm --filter logic2b test:journey /tmp/logic2b-journey /tmp/logic2b-journey-changed

pnpm --filter logic2b journey:update /tmp/logic2b-journey
pnpm --filter logic2b journey:build /tmp/logic2b-journey
pnpm --filter logic2b test:journey /tmp/logic2b-journey /tmp/logic2b-journey-updated
```

An existing compatible Chromium executable can be supplied through
`PLAYWRIGHT_CHROMIUM_PATH` instead of the explicit browser installation step.
Preparation installs registry source, with dependency installation disabled.
The separate dependency command installs packages. `journey:build` explicitly
runs the known generated app's `pnpm run build`; `test:journey` serves the
recorded production artifacts on loopback and never rebuilds or installs.
Later stages require the preceding stage's successful gate and unchanged
selected source. Do not edit the disposable fixture between commands; start a
new fixture when changing the test itself.

## What each phase proves

| Phase | Required observation |
| --- | --- |
| `prepare` | Immutable rc.17 block/dependency bytes and upstream bases match; the real change planner/applier adds the local owner column, copy and primary token override without changing those bases. |
| `build` | The explicit build succeeds, selected source remains stable, and distribution hashes are recorded for the current stage. |
| `check` | The built app passes the declared customer interactions, the owner is visible in its desktop column/mobile summary, and the rendered primary button retains the expected semantic colors. |
| `change` | A dry run changes nothing; a stale plan rejects and preserves a newer local note; a refreshed plan adds the segment filter; repeated apply is a complete no-op. |
| `update` | Actual rc.18 registry content merges into the customized app; a separate overlapping change produces a marked conflict, rejects repeated unresolved update, and is resolved by an explicit fresh change plan. Another explicit plan advances the configured version pin to rc.18 and default-version status confirms it. |

The stages are `customized`, `changed` and `updated`, with 212, 232 and 256
declared checks across mobile and desktop. `suite.ts` contains literal behavioral
expectations independently of the installed components and host data.
`customizations.ts` contains the hand-authored candidate edits; it never supplies
the browser oracle. The consumer's owner values are Lin Park, Zara Ruiz, Noah
Reed and Avery Stone for a newly created record. On mobile, an owner summary
preserves the information represented by the desktop column.

The final stage adds long translated labels and 200% text checks for rc.18's
real table-scroll fix. Every earlier stage still exercises ordinary mobile,
keyboard, empty, error/retry, submitting and permission states. The known rc.17
increased-text defect is not concealed with a fixture-specific CSS repair.

`--registry-version` selects a version for one command without replacing the
configured pin. The fixture therefore uses a fresh change plan after the merge
to update only `components.json`'s `logic2b.version`, preserving its other fields.
The updated report's `planId` identifies that pin plan; update-preservation
artifacts retain both the pin-plan and prior filter-plan ids. A later CLI
status invocation without a version override must resolve rc.18.

## Evidence and interpretation

Inside the generated project:

- `journey-provenance.json` records immutable installation provenance.
- `journey-state.json` records stage order, plan ids, selected source hashes,
  build records and accepted report hashes.
- `journey-artifacts/` retains requests, plans, dry-run/apply/update process
  results, build process results, generated suites and update-preservation data,
  plus the original marked conflict source and before/after file observations
  for operations that must not write.
- `journey-artifacts/conflict-consumer/` retains the isolated conflicting
  consumer and its explicit resolution request/plan/application.
- `.logic2b/` retains the actual install manifest, pristine upstream bases and
  local change journals. Journals contain fixture source and are not telemetry.

Each evidence directory contains the original `report.json`, `summary.json`
and hashed JSON/PNG artifacts under `evidence/`, plus
`theme-measurement.json`, `lifecycle-build.json` and `contrast-review.json`.
The runner verifies complete declared coverage, source and build consistency,
reported tool versions, CLI exit/status parity and every referenced artifact's
digest. The explicit build record supplies an observed local connection between
source, build process and served distribution. It is not an authenticity
signature, remote execution attestation or fingerprint of unselected files;
the shared report retains `servedSourceBinding: "unverified"`.

Failures, skipped checks and unexpected unknowns fail the gate. Only the
specifically validated `color-contrast` incomplete result with
`elmPartiallyObscured` evidence in the updated increased-text scroll scenario
may remain for human review. Such checks remain `unknown`, the underlying CLI
exits 2, and no axe rule is disabled. Conditional fixture acceptance is not a
passing accessibility report. A separate trusted browser replay also resolves
each incomplete node's selector and requires every match to be inside the
named customer table; the real page heading is rejected as a negative probe.
The ancestry record is not a replay of the original axe measurement itself or a
contrast pass. Screenshot capture likewise requires visual
review. Simulated persistence and permissions establish no production backend
or authorization guarantee.

Keep all three stage evidence directories and maintenance artifacts when
reporting a run. State exact observed pass/review counts and remaining visual
review; do not infer a passing run from the declared counts above. CI workflow
configuration and actual CI execution are separate evidence.
