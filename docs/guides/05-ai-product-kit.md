# 05 — AI product kit

**Status:** proposed · **Lane:** guarantee quality · **Target:** v1.1 ·
**Depends on:** [02 UI states & content contract](./02-ui-states-and-content-contract.md)
(the kit ships with its contract from day one).

## Why (the user)

The interfaces agents are asked to build are, more and more, interfaces *for*
AI products: chat, copilots inside an app, agent runs that need approval,
inline edits with a diff to accept. `ai-chat-01` proved the demand. Those
screens have hard UX problems the average hand-rolled version gets wrong:
streaming text that jumps under the reader, no way to stop, tool calls that
are invisible or terrifying, no provenance, no feedback path, no cost
visibility, screen readers flooded by token-by-token updates. A kit of
primitives that gets those right — with reduced motion, live-region
throttling and explicit human approval built in — is the fastest way to make
AI products *humane* by default.

## What ships

### Components (`registry:ui`)

| Item | What it is |
| --- | --- |
| `message` | Role-aware message container (user / assistant / system / tool) with avatar slot, timestamp, actions slot, streaming cursor and `data-state` |
| `streaming-markdown` | Incremental Markdown renderer: stable layout while streaming, code blocks via `code-block`, links safe by default, throttled `aria-live` announcements |
| `tool-call` | Collapsible card for a tool invocation: name, arguments, status (pending / running / done / failed / needs-approval), result, duration; approval buttons slot |
| `reasoning` | Collapsible "thinking" region with a reduced-motion-safe indicator and a summary line |
| `citations` | Source chips with hover/press popover, numbered, keyboard reachable |
| `feedback` | Thumbs up/down with an optional reason sheet; controlled, no network |
| `prompt-composer` | Textarea that grows, attachments list, slash-command suggestions, send/stop with keyboard shortcuts documented |
| `suggestions` | Follow-up chips row, wraps, keyboard navigable |
| `usage-meter` | Context/token/cost meter with thresholds on chart tokens |
| `model-picker` | Select with capability badges (vision, tools, context) |
| `approval-bar` | Sticky bar for "the agent wants to do X" with approve / edit / deny |

### Blocks

| Item | What it is |
| --- | --- |
| `ai-chat-02` | `ai-chat-01` rebuilt on the kit; keeps its deterministic streaming demo |
| `ai-assistant-panel-01` | Side panel inside an app shell (dashboard + assistant), resizable, collapsible |
| `ai-inline-edit-01` | Text editor with "ask AI" → proposed diff → accept/reject per hunk |
| `ai-agent-run-01` | Agent run timeline: steps, tool calls, approvals, artifacts, final summary — the human-in-the-loop screen |

### Docs

`/docs/ai-ui-patterns`: streaming without layout shift, stop/continue,
optimistic vs. confirmed state, provenance and citations, action consent,
cost transparency, error and retry, accessibility for live content, when
*not* to animate.

## Design

- **Deterministic demos, no keys.** Every demo streams from a static script
  with a seeded timer, exactly like `ai-chat-01`. The kit never fetches.
- **Live regions done right.** `streaming-markdown` announces at sentence
  boundaries with a ≥ 1 s throttle, never per token; the composer's send/stop
  state is announced once. Documented in the accessibility contract.
- **Approval is a first-class state.** `tool-call` has `needs-approval`;
  `approval-bar` and `ai-agent-run-01` show the pattern. This is the
  interface counterpart of "plans, not mutations".
- **Tokens only.** Status colors come from `--chart-*` and `--destructive`;
  no new palette.
- **Reduced motion.** Cursor blink, shimmer and reveal all sit behind the
  motion presets and `prefers-reduced-motion`.

### Where it lives

| Piece | Path |
| --- | --- |
| Components | `packages/registry/src/ui/<name>.tsx`, items in `packages/registry/items/ai.ts` |
| Blocks | `packages/registry/src/blocks/<name>/`, items in `packages/registry/items/blocks.ts` |
| Contracts | `packages/registry/accessibility.ts`, `packages/registry/states.ts` |
| Demos, playgrounds | `apps/web/src/demos`, `apps/web/src/block-demos` |
| Docs | `apps/web/src/content/docs/components/<name>.mdx`, `apps/web/src/content/docs/ai-ui-patterns.mdx` (+ `docs-es`) |
| Categories | new `ai` category in `registry:ui` and `registry:block` `categories` |

## Implementation steps

1. `message`, `streaming-markdown`, `prompt-composer` first (they unblock
   `ai-chat-02`), with accessibility + states contracts and API extraction.
2. `tool-call`, `approval-bar`, `reasoning`, `citations`, `feedback`,
   `suggestions`, `usage-meter`, `model-picker`.
3. `ai-chat-02`; keep `ai-chat-01` for one release, mark it superseded in its
   changelog.
4. `ai-assistant-panel-01`, `ai-inline-edit-01`, `ai-agent-run-01`.
5. Patterns doc; link it from `AGENTS.md` for any project that installs an
   `ai` item.
6. Playgrounds, demos, OG cards, ES translations of the new component docs.

## Gates

- Registry lint + API extraction + accessibility/states tests for every new
  item.
- axe, light/dark visual and playground functional checks for each item and
  block; the streaming demos must be deterministic under the visual suite's
  animation freeze.
- Bundle budgets unchanged for the docs shell (demos lazy-load as today).
- `review_ui` (guide 03) yields zero errors on the kit's own sources.

## Out of scope

- Any provider SDK, transport or hook that performs network requests.
- Voice, audio, or video surfaces.
