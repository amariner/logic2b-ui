# 10 — Project context before component selection

Status: proposed. Task: M1-02. Depends on M0 contracts/limits.

## Outcome and contract

The agent adapts to an existing app instead of assuming default aliases and an
empty `src/`. Implement `ProjectContextV1` in a small shared module consumed by
scaffold/CLI/MCP. Avoid a new package until dependency direction requires it.

```ts
interface ProjectContextV1 {
  schemaVersion: 1
  framework: { name: "next" | "vite" | "astro" | "unknown"; version?: string }
  reactVersion?: string
  tailwindVersion?: string
  sourceRoot?: string
  aliases: Record<string, string[]>
  stylesheets: string[]
  iconLibrary?: string
  preset?: string
  registryVersion?: string
  installed: Array<{ name: string; files: Array<{ path: string; sha256: string; modified?: boolean }> }>
  capabilities: { fileWrites: boolean; dependencyInstall: boolean; browser: boolean }
  evidence: Array<{ field: string; source: string; confidence: "known" | "inferred" }>
  unknowns: string[]
}
```

The CLI collector reads bounded package.json, tsconfig, components.json and
`.logic2b` manifests plus explicitly selected files. The MCP `inspect_project`
validates a host-supplied snapshot; it never implies remote filesystem access.
Unknowns are returned, not replaced by guesses. Framework detection conflicts
must be reported, including monorepos with multiple plausible applications.
Capabilities are supplied by the host, not inferred from the presence of a CLI.

## Steps

1. Define schema and limits (128 KiB configuration input, 1,000 inventory entries,
   256-char relative paths). Use normalized project-relative paths; reject
   traversal, absolute paths, symlinks escaping the selected root and duplicate
   normalized targets. Do not read env files or dependency directories.
2. Implement pure snapshot validation/detection with explicit uncertainty.
3. Add the local collector and `logic2b inspect --json` with app-root selection.
4. Add MCP `inspect_project` with the same result schema, compact summary and
   optional requested details. Do not transmit sources merely to count files.
5. Teach install/scaffold guidance to use confirmed aliases and installed
   inventory. Preserve an explicit from-empty path for true scaffolding.

## Acceptance

Fixtures: Next root alias, Vite src alias, Astro React islands, monorepo with two
apps, custom UI folder, existing shadcn project, unsupported framework and
partially missing configuration. Assert no writes and deterministic output.
Test escaped paths, malformed JSON, oversized inputs and unknown versions.
Measure result size; full inventory is opt-in above the compact response budget.
Run collector tests/type checks and CLI/MCP consumer smoke. Handoff schema
version, supported detections, unresolved cases and M2-01 integration points.
