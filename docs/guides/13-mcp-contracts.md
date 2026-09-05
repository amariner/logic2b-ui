# 13 — Reliable, bounded MCP contracts

Status: proposed. Tasks: M0-02, M0-03, M0-04.

## Outcome

Agents can parse tool results, reproduce the selected release and recover from
invalid requests without relying on prose or downloading the entire catalog.
Local and remote transports expose the same shared tool definitions and core.

## M0-02: structured results

- Declare an accurate `outputSchema` for each successful object result. Require
  its identifying fields and model nested items/files/findings; no empty catch-all
  schema. Keep source-compatible text JSON for older hosts.
- Return `structuredContent` equal to the text JSON value, without wrapping the
  existing object in a new envelope. Errors remain `isError: true`, do not claim
  success-schema conformance and should retain useful human-readable messages.
- Annotate existing tools as read-only and non-destructive: they return data,
  not filesystem mutations. Clarify that open-world registry reads can change
  unless a version is resolved. Avoid implying authorization through metadata.
- Contract-test every tool success shape against its declared schema and ensure
  failure shapes are distinguishable. Exercise stdio through the packed package
  with the official MCP client, plus the shared definitions used by HTTP.
- Keep tool names stable. Do not combine schema work with a new set of tools.

## M0-03: reproducible default

Resolve omitted registry versions through an explicit default channel and
return the exact selected version. Resolve once per plan, then read only its
manifest/content-addressed payloads, verifying SHA-256 throughout dependency
closure. Reject missing/malformed manifests and integrity failures; never fall
back to mutable mirrors when a verified request fails. Clearly isolate any
legacy raw-reader compatibility API and document its weaker guarantees.

Version-independent token operations need no artificial registry fetch. Tests
cover omitted/exact/range/channel, channel movement between reads, deleted item,
tampered transitive item and unavailable manifest. Update immutable fixture
builders instead of loosening production checks to satisfy old mocks.

## M0-04: limits and protocol failures

Set documented constants for maximum body bytes, batch length, array items,
source/CSS bytes, search results and response source bytes. Read streaming bodies
with a byte cap; Content-Length alone is insufficient. Validate input types and
bounds before registry/network work. Reject duplicate/excessive work early.
Distinguish invalid JSON-RPC, unsupported methods, invalid tool arguments and
tool execution failures. Preserve stateless HTTP notifications and supported
protocol-version behavior. Test both local dispatch and HTTP envelopes.

Use timeouts and bounded errors; do not echo full submitted source in a failure.
Measure worker bundle size. No accounts/auth backend is required for the public
read-only registry; edge abuse controls can be configured separately when needed.

## Progressive detail (follow-up after M0)

Add compact summaries and explicit detail modes/resource references when real
context measurements warrant them. Measure returned bytes and duplicate source
between `files` and `snapshots`. Preserve existing consumers through additive
options; the full plan remains available. Do not fetch every file to answer a
catalog question. Add output-budget tests and compare actual host tool-call cost.

## Verification and references

Run MCP tests/type checks, shared consumer smoke and HTTP-specific tests for
transport changes. Record what was not tested on a real host. Sources checked
5 September 2026: [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
and [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview).
Re-check current compatibility when implementing protocol-specific changes.
