# Changelog

All notable changes to `@logic2b/mcp` are documented here.

## Unreleased

- Add the pure `review_ui` tool using the shared static JSX/TSX review engine:
  proven native accessible-name defects, opt-in semantic-color policy, explicit
  unknowns and reasoned suppressions. Inputs and evidence are bounded; nested
  schemas and text/structured equality are shared by stdio and HTTP. Supplied
  source is never imported or executed, and review performs no filesystem or
  network access. This is source implementation pending npm publication and
  remote deployment.

- Add the pure `agent_rules` tool with bounded editor-format plans, managed
  sections, preserved project instructions and current-file hash preconditions.
  Scaffold plans include AGENTS.md and DESIGN.md by default with an explicit
  `agentRules: false` opt-out recorded in project configuration.
- Include the canonical logic2b UI skill in the MCP tarball through a narrow
  allowlist and byte-identical prepack staging, with instructions that discover
  available tools before using them.
- Initialize WebCrypto in the Node server when the runtime lacks the global
  API, so Node 18 can hash rule preconditions and verify registry integrity.
- Add the pure `inspect_project` tool with shared schemaVersion 1 snapshot validation, compact/detail typed results, explicit host capabilities and bounded invalid-params errors across stdio/HTTP.
- Guide existing-app installs through confirmed aliases and inventory while retaining explicit empty-project scaffolding.

## 1.0.0-rc.3

- Add `list_presets`, a network-free view of the shared curated gallery with
  canonical ids, complete configs, studio/CLI handoff and measured audit notes.
- Add `demo:walkthrough`, a reproducible script that generates a preset-themed
  starter from the committed registry, customizes it, detects theme drift with
  `lint_theme` and corrects it with `apply_preset` while preserving local edits.
- Bound every tool input before registry or network work: documented limits
  for body bytes, batch length, item counts, name/query/preset lengths, CSS
  bytes, token maps, fetched documents and returned source. Unknown tools and
  invalid, oversized, duplicate or unsafe arguments are JSON-RPC `-32602`
  errors on both transports; tool execution failures stay `isError` results.
  The HTTP worker reads bodies with a streaming byte cap, rejects unsupported
  `Mcp-Protocol-Version` headers and distinguishes parse, envelope, method,
  argument and internal failures. Error messages never echo more than 80
  characters of caller input.
- Resolve an omitted `version` through the `next` registry channel instead of
  the mutable `/r/index.json` and `/r/<name>.json` mirrors. Every registry
  tool now resolves one immutable manifest per call, verifies each payload's
  SHA-256 (transitive dependencies included) and always reports
  `requestedVersion` and the exact `registryVersion`; `add_command` always
  pins `--registry-version`. Missing manifests, deleted payloads and integrity
  mismatches are errors with no unverified fallback. `list_registry_versions`
  reports `defaultChannel`. Legacy mirror readers are isolated in
  `registry-raw.ts` and unused by tools.
- Publish typed output schemas and read-only annotations for all 16 tools on
  both transports. Successful calls include `structuredContent` alongside the
  unchanged JSON text fallback; tool failures remain explicit `isError` results.
- Verify output contracts against unit fixtures, the HTTP route and actual
  registry payloads through every packed tool using the official MCP client.

## 1.0.0-rc.2

- Make the marketing scaffold request the canonical `landing-page-01` bundle
  and return its navbar, animated hero, animated feature grid, CTA and footer
  as verified transitive dependencies.
- Add selectable Lucide, Tabler, Phosphor and Hugeicons output to
  `install_plan` and preset-driven scaffolds, including verified export maps,
  exact dependency pins and matching update snapshots.
- Share the exact scaffold composer with the CLI so framework shells, starter
  compositions, presets and dependency pins cannot drift between surfaces.
- Add `.logic2b/manifest.json` to every scaffold plan, including resolved item
  files and integrity metadata, plus `.logic2b/base` snapshots so generated
  projects can use safe three-way updates immediately.
- Split analytics dashboards from the initial application shell so generated
  plans preserve a lightweight, accessible loading state around chart-heavy
  compositions.

## 1.0.0-rc.1

- Add immutable release/channel discovery, per-item changelogs and optional
  version selectors across registry, install, scaffold and theme tools.
- Add `export_tokens` for a portable DTCG-shaped representation of any preset,
  shared with the public Style Dictionary web/iOS/Android artifacts.
- Surface each UI item's machine-readable accessibility contract through
  component search summaries and full payload reads.
- Verify content-addressed payloads with SHA-256 and reject cross-origin
  manifest references or unsafe registry file paths.
- Add acting tools for complete install plans and shell-less project scaffolds.
- Add theme preset decoding/application, WCAG 2.2 + APCA contrast auditing and
  static theme.css contract linting with optional exact-preset verification.
- Add registry demos, validated add commands and complete registry search/read
  tools.
- Add exact-pinned Next.js, Vite and Astro starters for marketing, dashboard
  and authentication surfaces.
- Exact-pin the MCP SDK runtime dependency so clean consumer installs use the
  same protocol implementation exercised by the release gate.
- Production-build all nine framework/starter contracts across the unit and
  integration suites before release.

## 0.2.0

- Add local stdio access to the logic2b registry for coding agents.
