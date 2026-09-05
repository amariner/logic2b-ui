# 04 — Proposal links: the human sees it before it lands

**Status:** proposed · **Lane:** keep the human in the loop · **Target:** v1.0 ·
**Depends on:** nothing (guide 02 improves it; guide 01 consumes it).

## Why (the user)

Theme presets already round-trip as one id: the studio, the CLI, the MCP and a
share link all agree on what a theme is. Compositions do not. When an agent
says "I will scaffold a marketing site with `hero-01-animated`, `pricing-01`
and `faq-01` in the Ember preset", the person it works for has to imagine it
or accept it blind. A **proposal link** is a URL that renders exactly that
composition, in that theme, light and dark, at any viewport, where the person
can swap a section, adjust the theme and send the agent back an id that
encodes their decision. No account, no server state: the URL is the state,
like `/create` today.

## What ships

- A composition codec in `@logic2b/tokens` (`encodeComposition` /
  `decodeComposition`), versioned and backward-compatible.
- `/proposal?c=<id>` page: live preview of the composition with the preset
  applied, per-section swap from the same category, theme rail reuse from
  `/create`, viewport toggle, Approve (copies the id + a Copy Prompt / MCP
  call / CLI command that reproduces it).
- `scaffold_plan`, `install_plan` and (later) `compose_plan` return
  `proposalUrl`; the CLI prints it after `init --template` and `compose`.
- An OG card per proposal (generated at request time from the id, cached at
  the edge) so the link previews sensibly in chat tools.

## Design

### Codec

```ts
interface Composition {
  v: 1
  registryVersion: string             // exact immutable version, never a channel
  stack: "next" | "vite" | "astro"
  preset?: string                     // theme+typeset+icons id, unchanged
  pages: Array<{
    route: string
    sections: string[]                // registry block names, in order
  }>
  states?: Record<string, StateName>  // optional: preview a block in a state (guide 02)
}
```

Encoding: canonical JSON → deflate-raw → base64url, prefixed `c1.`. Item
names are validated against the registry index on decode; unknown names are
reported, not dropped silently. Budget: ids for the three starters must stay
under 400 characters; a composition with 6 pages × 8 sections under 1.5 KB so
the full URL stays below 2 KB.

Reject oversized compressed/decompressed payloads, unsafe routes and unknown
schema versions. Preview only supported assets for the selected version; show
an explicit unsupported state rather than today's components for an older id.
Never execute arbitrary source from a URL. Preview and generation use the same
canonical composition and manifest. Copying an approval id does not itself
authorize the host to write files or execute a tool.

The preset id stays a separate, untouched field so every existing preset link
keeps working and the theme tools keep accepting it.

### Page

`/proposal` reuses the machinery that renders `/demos/launch/<name>` (full
hydrated compositions of canonical blocks) and the theme rail from
`/create`. Sections render in iframes from `/blocks/preview/<name>` with the
preset applied (the existing preview route already takes theme parameters
for the studio canvas). Interactions:

- **Swap** — a popover per section listing blocks of the same category
  (from `/r/index.json` `categories`); choosing one rewrites the id in the URL.
- **Theme** — the `/create` rail; edits rewrite the `preset` field.
- **States** — a segmented control per data-owning block once guide 02 lands.
- **Approve** — copies the id; the Get Code dialog offers the three
  reproductions: `logic2b init --template <stack> --composition <id>`, the
  MCP call (`scaffold_plan` with `composition`), and a Copy Prompt.
- **Nothing is stored.** The page never posts; "approve" is a copy action.

### Where it lives

| Piece | Path |
| --- | --- |
| Codec + tests | `packages/tokens/src/composition.ts`, `packages/tokens/test/composition.test.ts` |
| Page | `apps/web/src/pages/proposal.astro`, islands under `apps/web/src/components/proposal/` |
| Preview reuse | `apps/web/src/demos/*`, `apps/web/src/pages/blocks/preview/[name].astro` |
| OG at the edge | `apps/web/src/pages/proposal/og.png.ts` (Worker route; static generator in `apps/web/scripts` reused) |
| MCP | `packages/mcp/src/scaffold.ts`, `packages/mcp/src/plan.ts` (`proposalUrl`) |
| CLI | `packages/cli/src/scaffold.ts` (`--composition`, print URL) |
| Scaffold core | `packages/scaffold/src/index.ts` (accept a `Composition` instead of only a starter name) |

## Implementation steps

1. Codec with golden tests (round-trip, unknown item reporting, size budget,
   old ids remain decodable when `v` bumps).
2. Teach `packages/scaffold` to compose from a `Composition` (starter names
   become sugar for canonical compositions). Contract test: the three
   starters produce byte-identical output whether requested by name or by
   their canonical composition id.
3. `scaffold_plan` and `install_plan` return `proposalUrl`; CLI prints it.
4. Build `/proposal` with read-only rendering first (URL → preview), then
   swap, then the theme rail, then Approve.
5. Edge OG route with an in-memory + cache-API cache; budget the image.
6. Docs: a section in `/docs/llms` and `/docs/integration-paths` ("show the
   human before you write").
7. Add the page to the axe, visual and Lighthouse suites; add a functional
   Playwright test that swaps a section and asserts the URL and preview.

## Gates

- Codec tests, size budget test, starter-equivalence contract test.
- `test:scaffolds` still installs and builds all three starters.
- axe + visual + Lighthouse on `/proposal` with the three canonical ids.
- Functional test: swap, theme edit, approve → clipboard content decodes to
  the expected composition.

## Out of scope

- Accounts, saved proposals, comments. If people want persistence, the id in
  a chat message *is* the persistence.
- Free-form layout editing inside the page.

## Watching

- **M3-04 MCP Apps pilot.** Deliver one proposal resource in one verified host
  using the official extension, capability negotiation, bounded messages and
  CSP. Keep the web fallback. Measure packaging differences instead of assuming
  an iframe is sufficient. Record the supported host/version explicitly.
  [Official overview](https://modelcontextprotocol.io/extensions/apps/overview).
