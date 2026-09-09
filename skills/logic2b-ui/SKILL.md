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

For stateful blocks, read behavior metadata and wire real data/actions. Verify
applicable loading, empty, failure/retry, validation, submitting, permissions
and unsaved-change behavior, plus keyboard and mobile operation. Run the
project's available type, build and runtime checks; report unverified behavior.

`review_ui`, `compose_plan` and proposal links are not part of this distribution.
If a future running catalog exposes review/proposals, use their documented
contracts for relevant changes. Until then, share a concrete diff or local
preview for a new screen and describe verification limits. Do not invent tools
or block authorized work on missing future features. Existing authorization
persists; generated plans and rules do not grant new execution permissions.
