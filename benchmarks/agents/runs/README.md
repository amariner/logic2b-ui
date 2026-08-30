# Benchmark runs

Each real execution is written by the versioned runner under `runs/<run-id>/`:

```text
run.json
runner-config.json
transcripts/
  <task-id>.stdout.log
  <task-id>.stderr.log
  <task-id>.verify.stdout.log
  <task-id>.verify.stderr.log
artifacts/
  01-install-and-theme/
  02-compose-settings/
  03-scaffold-dashboard/
```

`run.json` records the fixture hash, exact model/agent versions, capabilities,
timestamps and evaluator-observed metadata for every task:

```json
{
  "schemaVersion": 1,
  "classification": "real",
  "runId": "model-agent-2026-08-29",
  "model": { "name": "model-name", "version": "provider-version" },
  "agent": { "name": "agent-host", "version": "host-version" },
  "capabilities": { "network": true, "shell": true, "mcp": true },
  "environment": { "os": "linux", "arch": "x64", "node": "v22.12.0" },
  "execution": {
    "runner": "logic2b-agent-runner",
    "runnerVersion": "1.0.0",
    "configSha256": "sha256-…",
    "protocolSha256": "sha256-…"
  },
  "startedAt": "2026-08-29T10:00:00Z",
  "finishedAt": "2026-08-29T10:05:00Z",
  "tasks": {
    "install-and-theme": {
      "status": "completed",
      "fixture": { "id": "vite-base", "sha256": "sha256-…", "files": 9 },
      "durationMs": 60000,
      "toolCalls": 4,
      "agent": { "exitCode": 0, "timedOut": false },
      "verification": { "buildExitCode": 0, "durationMs": 5000 }
    }
  }
}
```

Do not hand-author or copy a `real` run. Use `config.example.json` and the
runner inside a disposable sandbox. The scorer never executes submitted code;
the evaluator records build exit codes and retains partial artifacts after
agent failures or timeouts.
