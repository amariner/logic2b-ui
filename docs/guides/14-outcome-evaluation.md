# 14 — Measure whether Logic2b improves the outcome

Status: proposed. Task: EVAL-01; starts alongside M0 and continues per milestone.

## Question

Does the same agent produce a more usable, maintainable interface with the new
workflow, and how much human correction and context does it require?
The existing three-task leaderboard is an implementation smoke benchmark. Keep
its raw history; do not relabel its scores as comparative product advantage.

## Protocol v2

Compare the same pinned host/model/capabilities on the same initial fixture:

1. Baseline: existing public documentation and standard registry integration.
2. Existing Logic2b CLI/MCP workflow.
3. New project-context, behavior-contract, review and change-plan workflow.

Use a within-Logic2b ablation to isolate which new tools help. A cross-registry
comparison is separate and must account for unequal catalogs and functionality.
At least five independent attempts per condition in the pilot; randomized order,
fresh workspace, explicit budgets and retained failures/timeouts. Record model
aliases as aliases when no immutable model version is exposed. Do not execute
paid model runs or contact participants without the applicable authorization.

## Tasks and independent acceptance

- Build the customer-management list/filter/edit journey from a brief.
- Handle slow/failing data and a denied operation with recoverable UI.
- Modify it: add a filter and preserve custom copy/columns/tokens.
- Apply an upstream component change with local modifications present.
- Held-out transfer task: a different domain with similar interactions and
  realistic long content; reserve its fixtures outside authoring examples.

Checks cover task completion, required states, keyboard, mobile overflow,
consumer build, preserved edits and human corrective actions. Use independent
browser assertions in addition to static review. Human reviewers assess
hierarchy, task clarity and copy without knowing the treatment where practical.
Do not let the same review engine be both the intervention and sole judge.

## Evidence schema

Each attempt records condition, task id, fixture hash, tool/schema/registry
versions, host/model, budget, elapsed time, calls, bytes, token usage if available,
build outcome, check results, human corrections and artifact references. Missing
token usage is `unavailable`, not zero. Exclude secrets and personal data from
published transcripts; maintain provenance without publishing private paths.

Report sample size, median/spread, success denominator and all failures. Separate
autonomous attempts from human-assisted rescues. Keep the original protocol v1
and its leaderboard immutable; publish v2 beside it with its own schema/method.

## Implementation and gates

Extend `benchmarks/agents` with a versioned protocol, condition metadata and
report generator. Add synthetic fixtures for scorer correctness, explicitly
excluded from public results. Test incomplete attempts, unavailable metrics,
tampered artifacts and deterministic aggregation. No fabricated comparative
numbers; until real attempts run, publish the protocol and pending status.

Pilot observations may precede automated telemetry. Editing copied source is
often the intended workflow: collect the reason before classifying it as a
defect. Guide 09 stays opt-in and is not a prerequisite for product learning.
