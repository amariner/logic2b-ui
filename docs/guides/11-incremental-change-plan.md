# 11 — Incremental changes that preserve local work

Status: implemented in the source candidate; delivery checks and publication
status are recorded in [EXECUTION.md](../EXECUTION.md). Task: M2-01. Depends on
guide 10. Shared implementation: `packages/scaffold/src/change-plan.ts`.

## Outcome

“Add filters to this customer table” produces a reviewable delta in the existing
app. The host supplies the new source while preserving custom columns, copy and
token overrides. The planner binds each change to an observed original digest
or an explicitly observed missing target. Applying after another edit cannot
silently reinterpret that edit as permission to overwrite it. Existing CLI
upstream updates retain their separate three-way merge behavior.

## Request and plan contracts

```ts
interface ChangeRequestV1 {
  schemaVersion?: 1
  snapshot: ProjectSnapshotV1
  registryVersion?: string // exact; otherwise use snapshot's resolved manifest
  candidates: Array<{ path: string; content: string; reason: string }>
  missingFiles?: string[] // host-observed absence; omission is not evidence
}

interface ChangePlanV1 {
  schemaVersion: 1
  id: string // lowercase SHA-256 of canonical plan JSON, excluding this field
  appRoot: string // selected app, relative to the CLI workspace; "." by default
  registryVersion: string
  operations: Array<{
    path: string // relative to appRoot, never an import alias
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

Exports from `@logic2b/scaffold/change-plan`:

- `validateChangeRequest(raw)` validates and normalizes bounded host input.
- `buildChangePlan(raw)` asynchronously derives the plan from that input.
- `validateChangePlan(raw)` asynchronously validates all nested fields, content
  hashes and the canonical plan id. It does not grant write authorization.
- `changePath(raw)`, `sha256(text)` and `canonicalChangePlan(plan)` share target
  and hash semantics between adapters. Hashing supports WebCrypto and Node 18
  environments without a global WebCrypto object.
- `analyzePackageChange(beforeContent, afterContent)` recomputes dependency and
  lifecycle policy from original/candidate package bytes during planning and
  local apply. `beforeContent: null` means the package manifest is absent.
- `ChangePlanError` identifies contract failures; `CHANGE_LIMITS` publishes the
  bounds. `@logic2b/scaffold/change-plan-schema` exports `CHANGE_INPUT_SCHEMA`
  and `CHANGE_PLAN_SCHEMA` for protocol validation.

The input accepts 1–32 candidates, each at most 128 KiB of UTF-8 text, with
256 KiB total source and a 2 MiB serialized request/plan limit. Project snapshot
limits from guide 10 also apply. Reasons/checks are bounded to 512 characters;
paths to 256. Unpaired UTF-16 surrogates are rejected rather than changed during
UTF-8 materialization. Empty candidate content is allowed. Unchanged candidates
produce no operation, so a valid plan can have zero operations.

Requested relative spellings such as `./src//customers.tsx` normalize to
`src/customers.tsx`. Serialized plan paths must already be canonical. Traversal,
absolute/Windows paths, aliases such as `@/`, reserved filesystem names,
wildcards, non-NFC spellings, Git/dependency/environment paths, `.logic2b` and
`.logic2b-change-*` transaction files reject. Duplicate targets, case collisions
and ancestor/descendant target combinations reject before any writes.

Object keys are serialized in lexicographic order for hashing. Candidate
operations, dependencies, conflicts and unsupported entries are assembled in a
deterministic order; the content bytes and operation preconditions contribute
to the id. A plan id is an integrity checksum, not a signature or authorization.

## Context and uncertainty

`change_plan` receives a full bounded project snapshot and explicit requested
source. It validates/assembles the delta; it does not synthesize arbitrary
business logic from prose or execute supplied source. The host performs that
reasoning. It must use confirmed component destinations from inspection and
supply actual app-relative paths; the planner never guesses that `@/` means
`src/` or chooses among workspace applications.

Current digests come from snapshot inventory and from hashing supplied
configuration bytes. If both sources describe a configuration but disagree,
the plan reports a conflict. Conflicting case/ancestor evidence or a target
marked both present and absent also produces conflicts. When neither a digest
nor explicit absence was supplied, the candidate is withheld and the plan
explains the missing evidence. Consumers must check `conflicts` and
`unsupported` before materializing anything.

A registry version must be exact. The default comes only from the observed
Logic2b install manifest's `resolvedVersion`; without that evidence the caller
must supply an exact version. Channels/ranges and guessed defaults reject.
An explicit version differing from the observed manifest is a conflict: handle
an upstream registry update through the existing update workflow and refresh
the snapshot. A snapshot still listing workspace application candidates is
unsupported until the host selects and inspects the intended app root.

## Package changes

Include `package.json` as a preconditioned operation. Updating it requires its
original configuration bytes as well as any inventory evidence, so the planner
can derive the actual dependency delta. New manifests require explicit absence.
Dependency metadata must match the candidate manifest; a standalone dependency
list cannot authorize an install.

The planner supports additions and version changes across `dependencies`,
`devDependencies`, `peerDependencies` and `optionalDependencies` when each changed
name has one unambiguous version. Dependency removals/moves, conflicting versions
across sections, local/Git/URL locators, lifecycle hook changes, nested package
manifests, bundled dependencies, overrides/resolutions, package manager settings
and workspace changes are explicitly unsupported. Ordinary scripts remain inert
manifest text. Existing lifecycle hooks can remain unchanged. Apply recomputes
this policy from the actual original bytes, so deleting an unsupported marker
and recomputing the plan checksum cannot permit a prohibited package change.

No plan supplies executable commands. `verification` is guidance describing
checks the authorized host should perform, not a shell program. Dependency
installation is a separately reported host step and is never run by apply.

## Local apply and recovery

CLI planning collects fresh target bytes and confirms presence/absence locally;
remote MCP returns a plan only and never assumes filesystem access. Both use
the shared core. CLI summaries expose operation paths/kinds/reasons, dependency
changes and conflicts before the host chooses full source detail or saves the
plan for explicit materialization.

Apply validates the schema, plan hash, content hashes and every target before
writing. If every target already equals its after hash, it reports
`already-applied`. Partially applied plans preserve matching files and operate
only on remaining targets that still match their before hashes. Any stale
precondition blocks the operation and reports a refreshed-plan instruction;
failed preflight changes no application files. Symlinks, hard-linked targets,
changed roots and unsafe parent paths reject. Local reads and original bytes
are bounded too.

The CLI stages proposed bytes and retains original bytes in a bounded local
journal under `.logic2b/changes/<transaction UUID>/`. The journal records each
write's state and checksum, and an active transaction prevents overlapping
Logic2b apply operations. Recovery takes an exclusive ownership generation
before modifying files and rechecks the journal and every precondition after
claiming it. Complete owner records are published through exclusive hard links;
subsequent recovery claims extend an immutable chain instead of replacing a
stale lock. A live, unfinished owner cannot be taken over. Completion markers
permit a later retry from the same process after an interrupted attempt. The
chain is bounded to 256 ownership generations, and releasing the active lock
requires the current owner's token.

File replacement is individually atomic where the supported local primitives
permit it; multiple files are **not** a universal filesystem transaction.
Portable APIs cannot eliminate the last race against unrelated concurrent
writers, so keep the workspace stable during apply.

Interrupted work remains discoverable through transaction status. Status lists
valid transactions and separate `issues` for incomplete or malformed history
entries; an orphan directory created before its journal was saved does not hide
other transactions. History enumeration is bounded to 256 entries. Recovery
validates the journal and hashes before restoring original bytes or removing
files created by that transaction. It refuses a newer user edit or changed
permissions, preserves files already applied before this transaction, and can
be repeated. Empty directories created during a transaction may remain. Journal
files contain original/proposed source; they are local recovery artifacts, not
telemetry, and should remain out of published artifacts.

Applying requires authorization appropriate to the requested change; do not add
a second confirmation when that exact work is already authorized. Upstream
three-way merge/update conflicts remain explicit rather than being transformed
into precondition bypasses.

## Verification

Shared-core tests cover create/update/no-op plans, byte-level determinism,
missing/conflicting evidence, exact versions/workspace selection, bounded unsafe
input, case/ancestor targets, package declarations, tampering and SHA-256 parity.
Adapter tests cover create, update, repeat apply, stale files, symlink escape,
package races, partial application, interrupted writes/recovery and recovery
that preserves newer user edits. CLI/MCP protocol and packed-consumer checks
verify the distributed adapters. See the execution entry for exact commands and
results actually run.

M2-02 adds consumer runtime verification. The M2-03
[customer-journey acceptance fixture](./15-customer-journey-acceptance.md) is in
progress and combines create/change/upstream-update with keyboard, mobile,
empty, retry, submitting and permission-denied states. It checks preservation
of a custom column, copy and token override. Static plan validation is not
evidence that those runtime checks passed; see the execution queue for results.
