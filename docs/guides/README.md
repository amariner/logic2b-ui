# Implementation guides

Start with [ROADMAP.md](../../ROADMAP.md), [the execution queue](../EXECUTION.md)
and [AGENTS.md](../../AGENTS.md). The queue is authoritative for milestone order,
ownership and completion. Earlier v1.0/v1.1 labels below are historical targets,
not a reason to skip current dependencies. All new guides are proposed until
the queue records implementation and evidence.

## Current delivery contracts

| Guide | Scope | Queue |
| --- | --- | --- |
| [00 — Public beta](./00-public-beta.md) | Honest onboarding, distribution and launch evidence | M0-01, M0-05 |
| [10 — Project context](./10-project-context.md) | Local collection and bounded host-supplied context | M1-02 |
| [11 — Incremental change plans](./11-incremental-change-plan.md) | Diffs, preconditions, apply/recovery | M2-01 |
| [12 — Consumer verification](./12-consumer-verification.md) | Independent browser checks in generated apps | M2-02 |
| [13 — MCP contracts](./13-mcp-contracts.md) | Output schemas, version resolution, bounds | M0-02..04 |
| [14 — Outcome evaluation](./14-outcome-evaluation.md) | Baselines, repeated attempts and human corrections | EVAL-01 |

The earlier nine guides remain below and have been amended where the direction
changed: structured composition, evidence-based review, exact-version previews,
available-tool rules and an agent-run-first AI kit.

Each file in this directory is a self-contained brief for one roadmap
initiative: why it matters to the **person who ends up using the interface**,
what ships, the contract, where the code goes, the steps in order and the
gates that must pass before it merges. They are written so that a coding agent
(Claude Code, Cursor, Copilot) or a human can pick one up cold and execute it
without re-deriving the design.

Their milestones are described in [ROADMAP.md](../../ROADMAP.md).
The thesis in one line: agents already build fast
with logic2b ui; the next gap is whether what they build is *good for the
person using it*. Every guide here moves one of four levers:

| Lever | Question it answers | Guides |
| --- | --- | --- |
| Understand intent | Did the agent build the right screens for the brief? | 01, 06 |
| Guarantee quality | Are the states, copy, a11y, motion and tokens right for a real user? | 02, 03, 05, 08 |
| Keep the human in the loop | Can the person see and adjust what the agent proposes before it lands? | 04, 07 |
| Learn from outcomes | Do we know what agents get wrong, and does that feed back into the surfaces? | 09 |

## Index

| # | Guide | Ships | Target |
| --- | --- | --- | --- |
| 01 | [`compose_plan` — brief to composition](./01-compose-plan.md) | MCP tool + `logic2b compose` | v1.1 |
| 02 | [UI states & content contract](./02-ui-states-and-content-contract.md) | registry metadata, docs, MCP | v1.0 |
| 03 | [`review_ui` — design-system review as a tool](./03-review-ui.md) | `packages/review`, MCP tool, `logic2b review` | v1.0 |
| 04 | [Proposal links — human in the loop](./04-proposal-links.md) | composition codec, `/proposal` page | v1.0 |
| 05 | [AI product kit](./05-ai-product-kit.md) | components, blocks, patterns guide | v1.1 |
| 06 | [`form_plan` and `table_plan`](./06-form-and-table-plan.md) | MCP tools + CLI | v1.1 |
| 07 | [Agent rules distribution](./07-agent-rules-distribution.md) | CLI/MCP `AGENTS.md`, editor rules, skill | v1.0 |
| 08 | [User preferences — density, contrast, motion, text size](./08-user-preferences.md) | preset axes, hook, component | v1.1 |
| 09 | [Outcome feedback loop (opt-in)](./09-outcome-feedback-loop.md) | `report_outcome`, `/r/insights.json` | v1.2 |

## Conventions every guide follows

- **Deterministic servers.** Nothing in the MCP server or the site calls a
  model. Tools return grounded, verifiable data (real registry items, exact
  files, rule ids). The intelligence stays in the host agent; the tools
  guarantee grounding and completeness. This keeps the remote endpoint on
  Cloudflare Workers with no keys and makes every tool testable with fixtures.
- **One core, three surfaces.** Logic lives in a workspace package
  (`packages/scaffold`, `packages/tokens`, or the new `packages/review`) and
  is consumed by the CLI, the MCP server and `apps/web`. Never implement a
  second copy in the site.
- **Plans, not mutations.** MCP tools return file writes and findings; the
  host decides what to apply. Same rule as `install_plan`.
- **UI only.** Blocks stay pure UI with static sample data. The only
  server-side code this lane adds is project infrastructure (the aggregate
  endpoint in guide 09), which lives in the site worker like `/mcp` does.
- **Gates before merge.** Every guide lists its tests. A guide is done when
  its required gates pass and relevant regressions run in CI, not when the
  feature demos. Record partial slices without marking the full feature done.
- **Backward-compatible codecs.** Preset and composition ids minted before a
  change must keep decoding. Add fields at the end, default the old ones.
- **Budgets are part of the contract.** Browser JS, registry payload and
  `AGENTS.md` size budgets are asserted, because context and bytes both cost
  the user.

## How to execute one

1. Read the guide end to end, then the files it names.
2. Land the contract/types first with tests, then the shared core, then the
   MCP tool, then the CLI command, then the site surface, then docs.
3. Add the gate to CI in the same PR.
4. Update the guide's **Status** line and tick the roadmap item.
