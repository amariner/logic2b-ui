# Working on logic2b ui

## Read first

Read `ROADMAP.md`, `docs/EXECUTION.md` and the selected task's implementation
guide before making changes. Those files describe the current direction;
`ROADMAP-HISTORY.md` is historical. If an old guide conflicts with the roadmap
or a dated decision in the queue, follow the current decision and update the
guide in the same change. User instructions remain authoritative.

## Mission

Build the reference toolkit for interfaces that agents can understand, compose,
verify and maintain. Prioritize the complete customer-management journey and
incremental changes to existing apps. Do not expand the catalog as a substitute
for completing states, interactions, accessibility and maintenance workflows.

## Pick and finish work

1. Choose the earliest `ready` task whose dependencies are complete. Record
   its owner and `in-progress` status in `docs/EXECUTION.md` before editing.
2. Inspect git status and preserve unrelated user/agent changes. Use a
   `codex/` branch for a scoped delivery. Coordinate shared-file ownership
   when other agents are actually working; this file does not require spawning.
3. Implement a narrow vertical slice: contract, shared core, integration,
   user-facing instructions and meaningful verification. Keep proposed APIs
   out of public shipped-feature lists until they exist.
4. Run the task's checks plus relevant regression checks. Record exact commands
   and results; state any unrun checks or environment limitations explicitly.
5. Update task status, evidence and the next ready task. A partial implementation
   remains `in-progress`; docs alone do not complete a product feature.
6. Commit scoped changes. Merge/push when the user authorizes it; publication,
   npm dist-tags, repository visibility and external messages require their own
   applicable authorization. Do not repeatedly ask for already authorized work.

## Implementation boundaries

- Shared logic belongs in `packages/tokens`, `packages/scaffold`, or the
  task's documented shared package. CLI, MCP and website are adapters.
- MCP returns plans and evidence, never assumes it can access the user's
  filesystem. Source supplied to static review is data and is never executed.
- Treat public inputs as bounded untrusted data. Reject unsafe paths, stale
  write preconditions and unsupported schema versions with actionable errors.
- Preserve preset compatibility and published immutable registry bytes. Never
  regenerate old content-addressed payloads to hide drift.
- Preserve consumer customizations. Native HTML, custom wrappers and project
  conventions are not automatically errors; distinguish policy from defects.
- Components use semantic tokens, strict TypeScript, existing shadcn/Radix
  conventions and documented accessibility responsibilities. Demonstrations
  include realistic content and required loading/empty/error/recovery states.
- Avoid dependency additions unless the task needs them. Install explicitly;
  lint/test/build must not implicitly mutate dependency installations.
- Do not send private source, briefs, paths or credentials to analytics. No
  telemetry or arbitrary remote-code execution in static tools.

## Checks and handoff

Package tests: `pnpm --filter <package> test`; type checks:
`pnpm --filter <package> lint`. Root `pnpm lint` / `pnpm test` exercise the
workspace. Registry changes need registry build/integrity checks. UI changes
need the relevant functional, axe and visual checks; do not accept screenshot
changes blindly. CLI/MCP distribution changes need
`pnpm test:release-artifacts`. Full release requirements are in `RELEASING.md`.

Handoff: task id; user-visible result; changed contracts; checks and outcomes;
known limitations; commit; next task. Make it possible for another agent to
continue without reading the conversation. Never describe unrun CI as passed.
