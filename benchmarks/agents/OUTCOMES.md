# Recording outcome evidence

Status: protocol and reporting infrastructure implemented; real baseline and
comparative measurements pending. No v2 results are claimed. The existing v1
runner does not run this protocol: use an independent evaluator and register
the fixtures, prompts and acceptance assertions before collecting attempts.

## Before running

Freeze [protocol-v2.json](./protocol-v2.json), fixture hashes, exact prompts,
registry/tool/schema versions, host/model, capability envelope and time/token
budgets in the evaluation record. If the provider exposes only a model alias,
record `versionKind: "alias"`; do not imply an immutable model snapshot. Keep the
same capability envelope across conditions and restrict the provided resources
according to each condition. Document that restriction in evaluator evidence.

Create a seeded schedule with `outcomes schedule <uint32-seed>` and retain it
before starting. The default schedule contains 75 attempts: five repetitions
of every task and condition. Start each in a fresh workspace. Opaque attempt
and workspace ids must be unique. Interrupted and timed-out slots remain
attempts; save partial evidence and mark unobserved checks `unknown`. A rescue
belongs in a separate `human-assisted` attempt, linked in evaluator evidence;
do not replace its autonomous failure. Additional repetitions and ablations
require a registered extension; the default three conditions cannot establish
which individual new tool caused an improvement.

The new-workflow condition is unavailable until the relevant features ship.
Collecting an old-workflow baseline now does not make it a matched comparison
with a later model or changed fixture. No paid model runs or outreach are
authorized by this guide. Five external pilot observations remain separate
from five automated attempts per condition.

## Evidence contract

The report accepts a JSON array (at most 1000 attempts, 4 MiB total input).
The versioned TypeScript contract and strict runtime validator are exported by
[`scripts/outcome-v2.mts`](./scripts/outcome-v2.mts). Unknown fields, unsupported
versions and missing fields reject the whole report. Each attempt contains:

| Field | Required value |
| --- | --- |
| `schemaVersion` | `2` |
| `id`, `workspaceId` | Opaque 1–100 character ids: letters, digits, `_`, `-` |
| `classification` | `real` or `synthetic` |
| `condition`, `taskId` | One of the exact ids in protocol-v2.json |
| `fixtureHash` | SHA-256 of the frozen starting fixture, lowercase hex |
| `host` | `{name, version}` |
| `model` | `{name, version, versionKind}`; kind is `immutable` or `alias` |
| `capabilities` | Boolean `network`, `shell`, `mcp` |
| `versions` | `{registry, tools, schemas}`; identify exact revisions |
| `budget` | Positive integer `seconds` and `tokens` |
| `status` | `completed`, `failed`, `timeout`, `incomplete` |
| `assistance` | `autonomous` or `human-assisted` |
| `humanCorrections` | Nonnegative integer or `"unavailable"`; autonomous requires `0` |
| `metrics` | `elapsedSeconds`, `toolCalls`, `inputBytes`, `outputBytes`, `tokens`: nonnegative integer or `"unavailable"` |
| `build` | `pass`, `fail`, `unknown` |
| `buildEvidence` | Array of artifact paths supporting the observed build |
| `checks` | Every required check id maps to `{outcome, evidence}` |
| `artifacts` | Array of `{path, sha256}` |

Checks use `pass`, `fail` or `unknown`. A non-unknown result requires at least
one referenced artifact. Evidence paths must match a declared artifact. Capture
actual build output and independent browser assertions for task completion,
required states, keyboard operation, mobile overflow and preserved edits. Capture
human judgments of hierarchy, clarity and copy, blinded to treatment where
practical, in `human-design-review`. Static review is an intervention and cannot
be the sole judge. If a check is not applicable, explain the acceptance decision
in the evaluator evidence; do not omit the field or invent a pass.

Store sanitized artifacts as `<artifact-root>/<attempt-id>/<artifact-path>`.
Hash their final bytes with SHA-256. At most 64 artifacts per attempt, 4 MiB
per artifact and 64 MiB per report are accepted. Relative paths only; traversal,
absolute paths, symlinks, duplicate paths and digest mismatches are rejected.
Use snapshots that are not concurrently modified. The reporter only reads
bytes; it never imports submitted code or runs a build. Sanitization is the
evaluator's responsibility: remove secrets, personal data and private paths
before hashing, retaining original provenance privately. Hashes detect drift,
not dishonest outcome labels or fabricated evidence.

## Reading the report

Run `outcomes report <attempts.json> <artifact-root>` to print JSON to stdout.
Invalid input exits nonzero; no partial report is emitted. An empty input array
returns `pending`, zero samples and no invented statistics. The command does
not write into the v1 leaderboard or automatically publish anything.

Reports group by task, fixture, host/model, capabilities, versions and budgets.
Within each group they separate condition and assistance. Each cell reports
all attempt ids, outcomes and artifact hashes, status counts, success numerator
and denominator, and available count/median/min/max for every metric. Missing
measurements count as unavailable; an entirely missing metric has null summary
values. Failures, timeouts and incomplete attempts stay in the denominator.
Success requires completion, observed build success and every required check
passing; an unknown is not a pass. Synthetic attempts are validated but excluded.

`minimum-sample-collected` means a cohort has at least five autonomous attempts
in each condition, including failures. Overall `minimum-samples-collected`
requires such a cohort for every task. This is only a sample-count indicator,
not a claim of advantage, statistical significance or protocol compliance.
Review the registered schedule, isolation, evaluator independence and all
failures before interpreting results. Do not pool incompatible cohorts.
