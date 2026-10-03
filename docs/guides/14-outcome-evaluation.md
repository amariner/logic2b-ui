# 14 — Measure whether Logic2b improves the outcome

Status: protocol and offline evidence/report tooling implemented; real baseline
measurements, consumer fixtures and runtime evaluators pending. Task: EVAL-01;
starts alongside M0 and continues per milestone.

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

## Implemented evidence contract

The [v2 method](../../benchmarks/agents/v2/README.md), protocol and attempt/cohort
JSON schemas live beside the immutable v1 history. The shared benchmark core is
`benchmarks/agents/scripts/evaluation-v2.mts`; the offline CLI is
`pnpm benchmark:agents:report:v2`. `pnpm --dir benchmarks/agents report:v2 --plan`
prints the seeded schedule without invoking agents. No dependency was added.

Freeze `cohorts.json` before outcomes, including the exact protocol digest,
commit, documentation/registry/rubric digests, browser identity, host/model,
environment, capabilities, versions, budgets, task fixture digests and full
seeded assignments. The reporter reconciles every real attempt against its assigned
slot. Missing outcomes remain in the assigned primary denominator and prevent
pilot readiness; without a manifest only observed counts are available and
coverage is unverified. An attempt that needs human correction remains a
primary failure and is also reported in the assisted stratum. Preserve original
pre-rescue observations as evidence; rescue usage is not autonomous usage.

Attempt metadata and artifacts are bounded. Relative paths, regular files,
declared sizes and SHA-256 hashes are checked without executing source or
following symlinks/special files. Missing checks or evidence are not a pass;
self-reports do not become independent acceptance. Missing budget usage is
unknown, while uninstrumented token usage is allowed only with an explicitly
unavailable token budget. Hashes verify retained bytes; evaluator independence
and truthful observation remain responsibilities of the trusted collector.

The default checked-in report has no real samples and states `pending`. Planned
tool conditions cannot accept real attempts. Remaining work is to freeze actual
customer/held-out fixtures and independent assertions, then collect authorized
repeated baseline and treatment attempts. This tooling does not establish an
advantage and does not complete EVAL-01's baseline measurements.
