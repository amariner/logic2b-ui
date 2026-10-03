# Comparative outcome evaluation v2

This is the pending pilot method for whether Logic2b helps the same coding agent
deliver a usable interface and preserve it through later changes. The v2 tools
validate externally collected evidence and produce a report. They also generate
a seeded assignment schedule; they do not invoke an agent or execute submitted
source. No real v2 attempts or comparative measurements have been collected.

[`protocol.json`](./protocol.json) is the versioned method. Its conditions,
task prompts, independent check IDs and pilot settings are machine-readable.
[`attempt.schema.json`](./attempt.schema.json) describes an evidence record.
[`cohort.schema.json`](./cohort.schema.json) describes each frozen cohort manifest.
The existing [v1 protocol and results](../README.md) remain immutable installation
and composition smoke evidence; their scores do not establish product advantage.

## Conditions and tasks

The same pinned host, model, initial fixture and capabilities are used for each
condition. Baseline receives frozen public documentation and standard registry
integration. Existing CLI/MCP adds the shipped, pinned Logic2b tools. The new
workflow adds project context, behavior contracts, static review and change
plans. A within-Logic2b ablation keeps the new workflow but withholds `review_ui`
and its output, isolating the static review contribution.

The new workflow and ablation are **planned**. Their context/review/change tools
and revised behavior metadata must exist and be pinned before collecting those
conditions. A planned assignment must remain pending; collecting an existing
workflow attempt under a new-workflow label is invalid. There is no cross-registry
comparison in this protocol.

The five tasks cover building the customer list/filter/create/edit journey,
recovering from slow or failing data and denied operations, adding a filter
while preserving custom copy/columns/tokens, applying an upstream component
change while preserving local edits, and transfer to a held-out domain with
realistic long content. The initial consumer fixtures, domain-specific briefs
and trusted runtime assertions still need implementation. `fixtureId` names a
fixture family; every collected attempt must additionally record the actual
SHA-256 fixture digest. A name alone is not fixture identity.

Keep the held-out fixture, domain brief and assertion bodies outside tool
authoring examples. Freeze the intervention code, tool/schema inventory and
acceptance rubrics before revealing them. Record any exposure or deviation.

## Before collecting evidence

Freeze `cohorts.json` in the evidence root before observing outcomes. It is an
array of manifests with this exact structure:

| Field | Required value |
| --- | --- |
| `schemaVersion` | `2` |
| `cohortId` | Stable identifier shared by the cohort's attempts |
| `protocolSha256` | Canonical `protocolDigest(protocol)` from the evaluator |
| `pins` | `{commit, documentationSha256, registrySha256, rubricSha256, browser: {name, version}}` |
| `schedule` | Complete output of `createSchedule(protocol, {seed, repetitions})` |
| `controls` | `{host, model, environment, versions, budget, capabilities: {network, shell, mcp}, fixtures: [{id, sha256}]}` |

Digests use `sha256-` followed by 64 lowercase hexadecimal characters; the
commit is a full Git object ID. Hashing the formatted protocol file is not the
canonical protocol digest. Freeze `controls` before collecting the first outcome:
`host` is `{name, version}`, `model` is `{name, version, versionKind}`,
`environment` is `{os, node}`, `versions` is `{registry, cli, mcp, toolSchema}`,
and `budget` is `{elapsedMs, toolCalls, inputBytes, outputBytes, tokens}`. Model
`versionKind` is `"alias"` or `"immutable"`; capabilities are Boolean values.
The fixture list must contain exactly every protocol fixture ID once, with its
actual frozen digest. These controls and each attempt's corresponding metadata
must match, including the first observation; mismatches are rejected. A changed
control requires a separate frozen cohort. An alias stays labelled as an alias
when no immutable model version is exposed.
Manifest hashes identify frozen inputs; they do not authenticate their provenance.

Use at least five independently started attempts per condition and task. The
default seed is `20261003`; the assignment generator randomizes condition,
task and repetition order reproducibly. Preserve the complete generated
schedule and any unavailable planned assignments before observing outcomes.
The full design has 100 assignments (four conditions × five tasks × five
attempts); only 50 belong to currently available conditions. Schedule entries
are assignments, never measurements.

Create a fresh workspace and agent context from the same pinned initial fixture
for every assignment. Do not reuse preceding artifacts, transcripts or failure
feedback. Common default budgets are 900,000 ms, 120 tool calls, 2,097,152 input
bytes and 2,097,152 output bytes. Record the enforced budgets and actual usage;
keep exhausted, timed-out, interrupted and failed attempts with their partial
artifacts. Do not replace a failure with an additional best run.

Paid agent invocations and participant outreach require applicable authorization.
Generating this schedule, ingesting evidence and producing pending reports do
not perform either action.

## Independent acceptance

Every task declares the exact required check IDs:

- `build`: an evaluator-observed production build in the pinned consumer.
- `task-completion`: independent browser assertions for the specified outcome.
- `required-states`: browser assertions for the task's required states/recovery.
- `keyboard`: browser assertions for reachable named controls and focus behavior.
- `mobile-overflow`: browser assertions at 390 px and 1280 px.
- `hierarchy-copy`: independent human review of hierarchy, task clarity and copy.
- `preserved-edits`: only the customization and upstream-update tasks require
  this additional preservation evidence.

The intervention's static review engine cannot be the sole judge. Agent claims
that a build or interaction passed are not evaluator evidence. Build, browser
and human records identify their independent provenance and retained artifacts.
Run source/build/browser checks in a separate trusted disposable consumer
environment; the v2 report tool only reads evidence. A valid evidence record
proves its recorded bytes and metadata, not that a claimed browser result is
true. Evidence provenance remains the trusted evaluator/reviewer's responsibility.

Freeze the human rubric before reviewing. Conceal treatment labels using neutral
artifact IDs where practical; record when blinding was impossible. Count human
corrective actions and record their reason. Normal customization is often
intended use and must not automatically become a defect.

## Evidence and reporting

Each attempt records its condition/task, fixture digest, pinned environment and
versions, budget/usage, elapsed time, calls, bytes, token availability, independent
check results, human corrections and relative artifact references with SHA-256
digests. Store this exact shape in each attempt directory's `attempt.json`:

| Fields | Shape |
| --- | --- |
| `schemaVersion`, `protocolVersion` | `2`, `"2.0.0"` |
| `attemptId`, `classification` | Unique ID; `"real"` or `"synthetic"` |
| `cohortId`, `conditionId`, `taskId`, `repetition`, `order` | Exact frozen cohort assignment; repetition and order are integers |
| `workspace`, `fixture` | `{id, fresh: true}`; `{id, sha256}` |
| `versions` | `{registry, cli, mcp, toolSchema}` with exact versions |
| `host`, `model` | `{name, version}`; `{name, version, versionKind}` with `versionKind` equal to `"alias"` or `"immutable"` |
| `environment`, `capabilities` | `{os, node}`; `{network, shell, mcp, tools}` with Boolean capabilities and a tool-name array |
| `budget` | `{elapsedMs: 900000, toolCalls: 120, inputBytes: 2097152, outputBytes: 2097152, tokens: "unavailable"}` for the defaults |
| `metrics` | `{elapsedMs, toolCalls, inputBytes, outputBytes, tokens}`; each value is a nonnegative integer or `"unavailable"` |
| `status`, `assistance` | `"completed"`, `"failed"`, `"timed-out"` or `"interrupted"`; `"autonomous"` or `"human-assisted"` |
| `humanCorrections` | `{count, reasonArtifactIds?}`; count is a nonnegative integer or `"unavailable"`, and positive counts require reason artifact IDs |
| `checks` | Array of `{id, status, artifactIds, observer}`; status is `"passed"`, `"failed"`, `"unknown"` or `"not-run"`, observer is `"independent"` or `"agent"` |
| `artifacts` | Array of `{id, path, sha256, bytes}`; paths are relative to the attempt directory |

Correction reason IDs and check artifact IDs refer to the hashed entries in
`artifacts`. Preserve pre-rescue artifacts and evidence when recording a human
rescue. Redact secrets, personal data and private paths before ingestion and
publication. Keep provenance without publishing private filesystem paths.

Missing elapsed time, tool-call count or byte usage gives `budgetStatus: unknown`
and cannot be accepted. A numeric token budget also requires measured token
usage; unavailable tokens are allowed without blocking acceptance only when
`budget.tokens` is `"unavailable"`. Missing instrumentation never means zero.

An autonomous success requires every declared required independent check to pass
without human corrective actions. Failed, unknown or missing required checks do
not pass. The primary denominator is every frozen assignment in each available
condition/task cell, including failures, timeouts and missing outcomes. A
human-assisted rescue remains a failed primary assignment and also appears in
the assisted stratum; its primary autonomous usage metrics are unavailable
because the rescue record cannot establish pre-rescue usage. Missing outcomes
remain pending, and planned-condition assignments remain planned with no rate.

Reports state assigned, observed, missing and planned counts, the primary success
denominator, failures and median/minimum/maximum of available metrics. They also
retain observed profile summaries and unavailable counts. The CLI automatically
loads `cohorts.json` from the evidence root; without a manifest, assignment
coverage is `unverified`, only observed counts are available and the report can
never be `pilot-ready`. A pilot cell needs at least five independent observations;
even a completed pilot does not justify a broad statistical claim. Synthetic
evidence exists only for harness regression tests and is excluded from published
comparative measurements. Until real evidence exists, results remain pending.

Generate the deterministic assignment schedule without running any agents:

```bash
pnpm --dir benchmarks/agents report:v2 --plan
```

Generate the default evidence report from the repository root:

```bash
pnpm benchmark:agents:report:v2
```

The report command accepts an evidence root and output directory when collecting
a separate pilot cohort:

```bash
pnpm --dir benchmarks/agents report:v2 <runs-dir> <output-dir>
```

Keep `cohorts.json` and one attempt directory per evidence record under the
evidence root, including bounded artifacts. Real attempts must match the frozen
assignment's condition, task, repetition and order exactly. The default evidence
root is `benchmarks/agents/v2/runs`; generated
`results/report.json` and `results/report.md` stay separate from all v1 results.
Do not point report output at the archived v1 result directory.

The shared evaluator exports `validateProtocol`, `validateAttempt`,
`evaluateAttempt`, `generateReport(evaluated, protocol, cohorts = [])`,
`createSchedule`, `protocolDigest` and `validateCohort` from
[`scripts/evaluation-v2.mts`](../scripts/evaluation-v2.mts). Its regression tests
use explicit synthetic evidence to verify incomplete attempts, unavailable
metrics, tampering rejection and deterministic aggregation. No paid run or
external participant is needed to test the harness.
