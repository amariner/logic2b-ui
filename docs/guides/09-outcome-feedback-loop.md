# 09 — Outcome feedback loop (opt-in)

**Status:** proposed · **Lane:** learn from outcomes · **Target:** v1.2 ·
**Depends on:** [03 review_ui](./03-review-ui.md) for rule ids; benefits
from every other guide.

## Why (the user)

We measure agents in a benchmark, but we do not know what happens after a
real install: which blocks get hand-edited within the hour (a sign the block
missed a state or a slot), which `review_ui` rules fire most (a sign our docs
or `AGENTS.md` are not landing), which briefs `compose_plan` answers with
`low` confidence (a sign of a catalog gap). Without that signal the roadmap is
guesswork. With it — anonymous, aggregate, opt-in — the registry improves
where people are actually hurt, and the benchmark rubric weights what
matters in the field.

## What ships

- MCP tool `report_outcome` and CLI `logic2b telemetry on|off|status`, with
  `add`, `update`, `review`, `compose`, `form`, `table` sending one event
  when enabled.
- An aggregate-only endpoint in the site worker (`POST /api/outcomes`) that
  increments counters; no bodies are stored.
- Public `/r/insights.json` (daily) and a **Field insights** panel on
  `/docs/agent-benchmarks`: install counts, edit-after-install rate per item,
  top review rules, low-confidence brief themes.
- Documented policy at `/docs/telemetry`.

## Design

### Event shape (the entire payload)

```ts
interface OutcomeEvent {
  v: 1
  kind: "install" | "update" | "edit-after-install" | "review" | "compose" | "plan"
  items?: string[]                  // registry item names only
  rules?: string[]                  // review rule ids only
  confidence?: "high" | "medium" | "low"
  intents?: string[]                // closed vocabulary from guide 02, never the brief text
  stack?: "next" | "vite" | "astro" | "other"
  surface: "cli" | "mcp-local" | "mcp-remote" | "site"
  registryVersion: string
  agent?: string                    // host name only, from a closed list, else "other"
}
```

Explicitly never sent: file contents, paths, brief text, preset ids
(they can encode brand choices), IPs (dropped at the edge), timestamps
finer than the day, anything identifying a project or person.

`edit-after-install` is computed locally by the CLI on the next `update` or
`diff` (the `.logic2b/base` snapshot makes it cheap): it reports *that* an
item diverged, never *how*.

### Consent

- Off by default everywhere. The CLI asks once, interactively, on the first
  command after install, with the exact payload printed; non-interactive
  runs never enable it. Stored in `.logic2b/telemetry.json` and overridable
  by `LOGIC2B_TELEMETRY=0`.
- MCP: `report_outcome` exists but the host must call it; the `AGENTS.md`
  rule (guide 07) says "only if the user enabled telemetry for this
  project", and the tool description repeats it. The remote server never
  infers consent.

### Storage and publication

Cloudflare Analytics Engine (or a D1 counter table) keyed by day × kind ×
item/rule/intent × surface. A scheduled Worker writes `/r/insights.json`
with thresholds (no cell published below 20 events) so nothing is
re-identifiable. The site renders the panel from that file at build time.

This is project infrastructure, not shipped UI, so it lives with `/mcp` in
`apps/web` and does not reopen the "UI only" scope decision.

### Where it lives

| Piece | Path |
| --- | --- |
| Event types + validator | `packages/scaffold/src/outcomes.ts` (shared by CLI and MCP) |
| CLI consent + sender | `packages/cli/src/telemetry.ts`, hooks in `index.ts` |
| MCP tool | `packages/mcp/src/tools.ts` |
| Endpoint + cron | `apps/web/src/pages/api/outcomes.ts`, `apps/web/wrangler.jsonc` (binding + trigger) |
| Insights | `apps/web/public/r/insights.json` (generated), panel in `apps/web/src/content/docs/agent-benchmarks.mdx` |
| Policy | `apps/web/src/content/docs/telemetry.mdx` (+ `docs-es`) |

## Implementation steps

1. Types + strict validator (closed vocabularies, no free text) with tests
   that reject anything outside the shape.
2. CLI consent flow and sender (fire-and-forget, 2 s timeout, never blocks a
   command or changes its exit code).
3. MCP `report_outcome` with the consent wording; `AGENTS.md` rule.
4. Endpoint with validation, rate limiting and IP drop; Analytics Engine
   binding; cron publishing `insights.json` with thresholds.
5. Docs panel + policy page; link from the CLI's consent prompt.
6. Feed the loop: a quarterly roadmap section that cites insights, and a
   benchmark rubric review that reweights rules by field frequency.

## Gates

- Validator tests: every forbidden field is rejected; payload ≤ 1 KB.
- CLI tests: telemetry off by default; non-interactive never enables; env
  override wins; commands succeed when the endpoint is unreachable.
- Endpoint contract test with a mocked binding; `insights.json` schema test
  with the threshold rule.
- `test:release-artifacts` allowlist unchanged apart from the new module.

## Out of scope

- Session replay, error reporting, per-project dashboards, any identifier.
- Using the data for anything but the registry, docs, prompts and benchmark.
