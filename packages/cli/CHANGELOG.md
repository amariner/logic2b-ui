# Changelog

All notable changes to the `logic2b` CLI are documented here.

## 1.0.0-rc.2

- Make the marketing starter install the canonical `landing-page-01` bundle;
  its navbar, animated hero, animated feature grid, CTA and footer now resolve
  transitively from one requested registry item.
- Make the `/create` icon-library choice executable end to end: presets and
  `components.json` select Lucide, Tabler, Phosphor or Hugeicons, while add,
  update and scaffolding rewrite verified imports, npm dependencies and base
  snapshots together.
- Make `init --template <next|vite|astro>` generate complete, runnable projects
  directly from the same exact-pinned scaffold core used by MCP.
- Add marketing, dashboard and auth starters, `/create` preset application,
  immutable registry selection, a first-install `.logic2b/manifest.json` and
  `.logic2b/base` snapshots for safe three-way updates from the first release.
- Make `--monorepo` create a real Turbo workspace with the generated app in
  `apps/web`; support npm, pnpm, Yarn and Bun installation or `--no-install`.
- Refuse non-empty targets before fetching or writing, and confine every
  generated path to the selected project directory.
- Split analytics dashboards from the initial application shell so generated
  starters can paint a lightweight, accessible loading state before the chart
  runtime is ready.

## 1.0.0-rc.1

- Add immutable registry release resolution by exact semver, range or channel,
  with SHA-256 verification of content-addressed item payloads.
- Record exact registry/item versions, integrity and installed files in
  `.logic2b/manifest.json`; add `logic2b status` and version-aware
  add/update/diff/list commands.
- Add safe three-way `update` merges backed by `.logic2b/base` snapshots.
- Add `diff`, multi-component `add`, `--all`, package-manager detection and
  automatic dependency installation.
- Add exact `/create` preset support to `init` and preserve custom aliases from
  `components.json`.
- Validate registry payloads and resolve transitive registry dependencies.
- Reject cross-origin manifest references, mismatched item names and unsafe
  registry file paths before writing anything.
- Keep the documented Node 18 runtime contract by using exact-pinned Commander
  13.1.0.

## 0.4.0

- Introduce install snapshots and non-destructive component updates.
