# 00 — A public beta people can understand and reproduce

Status: proposed. Tasks: M0-01, M0-05. Direction: [ROADMAP](../../ROADMAP.md).

## Outcome

A developer can explain the product's purpose, connect their agent and install
the demonstrated candidate without assistance from the maintainer. This is
onboarding work, not authorization to change visibility or publish packages.

## Delivery

1. M0-01: route the landing MCP announcement to human documentation. Keep the
   protocol endpoint at `/mcp`; its GET 405 is not itself a protocol defect.
   State explicitly that remote tools return plans and require a host able to
   write files and a runtime able to install/build dependencies.
2. Define one shared CLI/MCP package-selector policy for install commands. While
   the showcased product is an RC, use `@next` or the verified exact candidate.
   Update current site prompts, Markdown twins, extension and MCP commands.
   Preserve archived benchmarks and immutable registry payloads.
3. M0-05: make the landing promise concrete: "Your design system, ready for
   agents." Two primary paths: use with an agent and browse components. Show a
   complete interface, then its mobile and failure states as they become real.
   Explain reproducibility and maintenance with executable examples. Do not
   market planned review/composition tools as installed features.
4. Add contribution and security-reporting instructions, issue templates and a
   stable/beta compatibility table (React/Tailwind, framework, host capabilities,
   CLI/MCP/registry versions). Avoid unsupported security or performance claims.
5. Record a 60–90 second demonstration: preset → existing scaffold → local
   customization → theme drift detection/correction. Build the demo from the
   same canonical fixture as the docs. Add state/review steps only when shipped.

## Files and checks

Site: `apps/web/src/pages/index.astro`, current docs and `src/lib/prompts.ts`.
Distribution: shared selector module, `packages/mcp/src/tools.ts`, VS Code
command builder. Test selector parity rather than loose text replacement.

Run affected package tests/type checks and the package consumer smoke gate for
distribution changes. For layout changes run the relevant functional, axe and
visual checks; inspect desktop/mobile output. Do not update all baselines for a
copy/link-only change. Verify GET on every human-facing CTA and an MCP handshake
on the endpoint separately. Record which published artifact was actually used.

## Pilot

Recruit five developers only with user authorization for outreach. Observe
first-use success, time, misunderstandings and manual corrections. Store only
consented findings. Absence of participants does not block implementation;
record the external pilot as pending instead of inventing evidence.
