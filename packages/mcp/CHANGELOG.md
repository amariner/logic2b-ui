# Changelog

All notable changes to `@logic2b/mcp` are documented here.

## Unreleased

- Publish typed output schemas and read-only annotations for all 15 tools on
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
