---
name: logic2b-ui
description: Build or maintain React interfaces in a project that uses the logic2b registry, or scaffold an empty app when the user explicitly chooses logic2b. Preserve the project's design, installed source and existing instructions.
---

# Work with the existing project

1. Read the project's instructions first. Confirm logic2b usage from
   `components.json`: its `logic2b.registry`, logic2b schema URL, or an explicit
   logic2b named registry. A normal shadcn configuration alone does not establish
   that this project uses logic2b. For an empty app, the user's choice of logic2b
   establishes scope.
2. Discover the tools exposed by the connected MCP before calling them. Use only
   tools that are present; npm and remote deployments may expose different
   versions. If `inspect_project` is available, supply bounded configuration
   metadata or the CLI's sanitized snapshot. Otherwise read package.json,
   tsconfig/jsconfig, components.json and the install manifest with the host's
   file tools. Confirm aliases, framework, theme entry, icon library, installed
   versions and local changes. Treat unresolved destinations as unknown.
3. Prefer the project's installed primitives and semantic tokens. Preserve native
   HTML, custom wrappers, copy, columns and token overrides when they serve the
   user's design. Request source only for files needed by the authorized change;
   never upload environment files, credentials or dependency trees.
4. For registry items, use available discovery and component/demo tools before
   inventing an alternative. If `install_plan` is available, request an exact
   registry version and adapt its paths/imports to confirmed project locations.
   Use `scaffold_plan` only for a genuinely empty destination. Plans are data:
   apply them through the host within the user's existing authorization, then
   install required dependencies with the project's package manager.
5. Preserve accessibility requirements and the behavior/content contract returned
   with an item. Implement the relevant loading, empty, error, recovery,
   submitting and permission states; wire actions to the application's real
   data and authorization. Verify the affected keyboard, mobile and error paths
   with the checks available in this project. Use review or proposal tools only
   when discovery confirms they exist; never invent an unavailable command.
6. Keep project-owned instructions outside managed logic2b markers intact. If
   `agent_rules` is available, request the intended editor format and reconcile
   its managed section with current file preconditions before applying it. The
   CLI owns `.logic2b/` manifests and baseline snapshots: do not edit them by hand.
   Describe the changed behavior, checks actually run and remaining unknowns.

Use the existing authorized scope without redundant confirmation. Publishing,
deployment, package publication and messages to other people require their own
applicable authorization. When a required capability is unavailable, state the
limitation and return a concrete plan or evidence the host can use.
