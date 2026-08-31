# logic2b agent benchmark

A reproducible benchmark for the question that matters to this registry: can a
coding agent install, theme and compose logic2b ui correctly, or does it fall
back to hand-written lookalikes?

The v1 protocol has three tasks worth 100 points each:

1. Install `button`, `card` and `dialog`, then apply an exact theme preset.
2. Compose an accessible account-settings screen from registry primitives.
3. Start from an empty directory and scaffold a production-building Vite
   dashboard with the theme and transitive chart dependencies.

The full prompts and every scoring rule live in
[`protocol.json`](./protocol.json). Nothing important is hidden in the scorer.

## Fair-run policy

- Each model starts in a fresh isolated directory with the same task fixture.
- Network, shell and MCP availability are recorded, not silently normalized.
- The model receives one task prompt and the preset id; no human corrections.
- The evaluator records elapsed time, tool calls and the production-build exit
  code. Self-reported build success does not count.
- A failed or timed-out task stays in the run with its partial artifacts.
- Model, provider version, agent host/version, OS and Node version are required
  run metadata.
- Score ranks before speed. Duration only breaks equal scores.

The static scorer never executes submitted code. It reads files up to 1 MB,
rejects symlinks and paths outside the task directory, and combines that
artifact evidence with build exit codes captured by the trusted evaluator.

The versioned runner is that evaluator. It creates deterministic fixtures from
the built registry in staging outside the repository, fingerprints them with
SHA-256, invokes an agent without a shell, enforces task/output limits and
captures transcripts. It snapshots the agent's source before running the
protocol's production-build command, excluding dependencies and build caches,
and rejects symlinks. Source artifacts over the configured 100 MB budget are
neither published nor executed. It then writes `run.json` atomically after
every task. Interrupted runs can resume without repeating completed tasks.

Directory isolation is not an OS sandbox. Run the evaluator inside a disposable
container, VM or equivalent agent sandbox: the verification step intentionally
executes the generated project's build script. The declared network, shell and
MCP capabilities are recorded for comparison; the outer sandbox must enforce
them.

## Recording a real run

Copy [`config.example.json`](./config.example.json), identify the exact model
and agent versions, and point `command.executable` at an isolated agent wrapper.
Arguments support `{prompt}`, `{workspace}`, `{taskId}` and `{preset}`
placeholders; the same values are also available as `LOGIC2B_BENCHMARK_*`
environment variables. Secrets are never embedded in the config: `passEnv`
contains names to forward from the evaluator environment.

The wrapper must print the configured `toolCallMarker` once for every tool call
so the runner can count them without depending on one vendor's event schema.
The repository includes a Codex JSONL adapter at
`scripts/adapters/codex.mjs`; it disables unrelated app, browser, plugin and
multi-agent surfaces, confines generated commands to the task workspace and emits one
marker for every completed Codex tool event. Pass the Codex executable and
model as adapter arguments from the run config; pass `--mcp-url` when the run
declares the remote logic2b MCP capability.
Validate the config without executing the agent:

```bash
pnpm --dir benchmarks/agents benchmark config.json --validate
```

Then run and score it:

```bash
pnpm --dir benchmarks/agents benchmark config.json
pnpm --dir benchmarks/agents score <run-id>
```

Use `--resume` after an evaluator interruption. With no score run id, every run
directory is rescored. Individual detailed results and
`results/leaderboard.json` are regenerated together. Only results classified
as `real` by the runner can enter the leaderboard; synthetic results remain
scoreable for regression tests but are filtered from publication.

## Testing the harness

```bash
pnpm --dir benchmarks/agents test
pnpm --dir benchmarks/agents test:fixtures
```

The tests build a perfect synthetic fixture in a temporary directory, prove
all 300 points are reachable, verify point deductions, validate metadata and
exercise leaderboard ordering. They also execute a fake agent through the real
runner, proving fixture fingerprints, timeout/process-group termination,
transcript limits, observed builds and the real/synthetic publication boundary.

## Current publication status

Three isolated real runs are published under the same Codex CLI
`0.148.0-alpha.15` host and capability profile, making the model comparison
controlled: `gpt-5.6-sol` scored 294/300 (98%), `gpt-5.5` scored 272/300
(90.7%) and `gpt-5.6-terra` scored 266/300 (88.7%). Every
evaluator-observed production build passed. Raw artifacts, transcripts,
metadata and detailed rule evidence live under `runs/` and `results/`.
Synthetic fixtures remain mechanically excluded; future runs can broaden the
table to other agent hosts without changing the v1 protocol.
