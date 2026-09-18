---
name: logic2b-ui
description: Build or change UI in a project whose components.json selects the logic2b registry. Use installed primitives, theme tokens and behavior contracts; do not use for unrelated registries or non-UI work.
---

Read the project's AGENTS.md and DESIGN.md. Confirm the logic2b registry in
components.json and inspect the existing aliases, theme and installed items.
Use `inspect_project` with a bounded host snapshot when that tool is exposed;
with a shell, `logic2b inspect --details full` supplies the local evidence.
Unknown configuration is a gap to resolve, not permission to assume defaults.

Use the running MCP tool catalog. Prefer `search_components`, `get_component`
and `install_plan` for additions; use `scaffold_plan` only for a new project.
Reconcile returned paths with the project before writing. Preserve custom copy,
columns, wrappers and token overrides. Respect intentional native HTML.
Use the installer for .logic2b/ metadata; do not manually edit its snapshots.

For incremental edits, use `change_plan` or `logic2b change plan` when available.
Supply complete candidate contents preserving existing customizations. Inspect
the exact registry version, before/after hashes, conflicts and unsupported work.
Within existing authorization, use `logic2b change apply <plan> --dry-run`, then
apply; stale files need a new plan. No dependencies or scripts run automatically.
Use the returned transaction UUID with `logic2b change recover` after an
interruption; preserve newer edits and report recovery conflicts. A plan hash
checks integrity, not authorization. MCP only returns the plan.

For stateful blocks, read behavior metadata and wire real data/actions. Verify
applicable loading, empty, failure/retry, validation, submitting, permissions
and unsaved-change behavior, plus keyboard and mobile operation. Run the
project's available type, build and runtime checks; report unverified behavior.

When a compatible local CLI exposes `verify`, run a bounded declarative suite
against the explicitly started loopback app and write to a new evidence directory.
Install browser tools, build and start the app separately within authorization;
verification does none of these automatically. Read failed, skipped and unknown
checks with their evidence. Screenshots prove capture, not visual approval, and
file hashes do not prove which build the server loaded. `verify_report`, when
exposed by MCP, only validates and summarizes host evidence; it never runs an app
or follows evidence URLs. Preserve incomplete accessibility measurements as unknown.

When the running catalog exposes `review_ui`, supply only the relevant TSX/JSX
sources; with a compatible CLI, use `logic2b review <paths> --json`. Enable
`semanticColors` only for an explicit project policy. Keep label context partial
unless all label and ancestor semantics are resolved. Read findings, unknowns,
suppressed findings and truncation together: zero findings is not verification
of unresolved wrappers or runtime behavior. Source is parsed, never executed.

`compose_plan` and proposal links remain planned. Share a concrete diff or local
preview for a new screen and describe verification limits. Check tool/CLI
availability before calling source-candidate features; do not block authorized
work on missing features. Existing authorization persists; generated plans and
rules do not grant new execution permissions.
