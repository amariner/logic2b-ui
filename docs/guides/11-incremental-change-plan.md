# 11 — Incremental changes that preserve local work

Status: proposed. Task: M2-01. Depends on guide 10.

## Outcome

"Add filters to this customer table" produces a reviewable delta in the
existing app. Reapplying it or applying it after another edit cannot silently
overwrite work. Reuse existing three-way merge behavior for upstream updates.

## Contract

```ts
interface ChangePlanV1 {
  schemaVersion: 1
  id: string // hash of canonical plan, excluding this field
  registryVersion: string
  operations: Array<{
    path: string
    kind: "create" | "update"
    beforeSha256: string | null // null requires a missing file
    afterSha256: string
    content: string
    reason: string
  }>
  dependencies: Array<{ name: string; before?: string; after: string }>
  conflicts: Array<{ path: string; reason: string }>
  verification: Array<{ kind: "static" | "runtime"; check: string }>
  unsupported: string[]
}
```

`change_plan` receives bounded project context and explicit requested operations
or candidate source. It validates/assembles the delta; it does not synthesize
arbitrary business logic from prose. The host performs that reasoning.
Include package-manifest changes as preconditioned operations too. No arbitrary
commands, automatic deletions or post-install hooks supplied by the plan.

## Apply semantics

- Normalize/reject unsafe paths and duplicates before any writes.
- Validate the schema, plan hash, content hashes and every precondition before
  applying. If all files already equal after hashes, report `already-applied`.
- A changed precondition is a conflict; do not reinterpret it as permission to
  overwrite. Output the conflicting paths and a refreshed-plan instruction.
- Stage writes and retain original bytes in a bounded local transaction journal.
  Commit using supported local atomic file operations. Record interrupted
  transactions; never claim a multi-file filesystem transaction is universally
  atomic. A recovery command checks hashes before restoring modified targets.
- Applying requires host/user authorization appropriate to the requested change;
  do not add a second confirmation when that exact work is already authorized.
- Remote MCP returns the plan only. CLI materialization is an explicit command;
  dependency installation is a separately reported step.

## Steps and tests

Implement canonical schema/hash helpers, dry-run planning, preflight validation,
then local apply/recovery. Add CLI and MCP adapters only after fixtures pass.
Preserve user-facing diff readability; expose a summary before full sources.

Acceptance cases: create, update, repeat apply, stale file, duplicate path,
symlink escape, package.json race, partially already-applied plan, interrupted
write/recovery, customized column/copy and upstream merge conflict. A failed
preflight changes zero files. Recovery never overwrites a newer user edit.
Use temp consumers and injected write failures. Run CLI/MCP tests and package
consumer smoke; add M2-03 as an end-to-end reference regression.
