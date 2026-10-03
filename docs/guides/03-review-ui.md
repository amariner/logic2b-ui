# 03 — Evidence-based static UI review

**Status:** M1-04 implemented in source · **Updated:** 4 October 2026.
Canonical scope: [ROADMAP](../../ROADMAP.md) and [execution queue](../EXECUTION.md).
Publication and deployment are separate from source implementation.

## First vertical slice

The private `@logic2b/review` package owns a pure synchronous `reviewUi` engine,
strict request/result JSON schemas, validation, rule metadata and fixture corpus.
The CLI `logic2b review` and local/HTTP MCP `review_ui` call that same engine.
The source is parsed as inert JSX/TSX. It is never executed, imported, fetched,
written or sent to analytics. The CLI alone collects explicitly selected files.

The dated queue prioritizes proof-backed naming and explicit token policy.
This delivery implements four stable rule ids:

| Id | Severity | Category | Scope |
| --- | --- | --- | --- |
| `L2B-A11Y-001` | error | defect | Native dialog/alertdialog accessible names |
| `L2B-A11Y-002` | error | defect | Native form-control accessible names |
| `L2B-A11Y-003` | error | defect | Native button accessible names |
| `L2B-TOK-001` | warning | design-policy | Recognized literal colors only with `policy.semanticColors: true` |

A native element is not a policy violation. Custom/imported components remain
unknown: neither a name such as `Button` nor registry accessibility prose proves
what a customized wrapper renders. There is no hardcoded registry-name table.
Literal native nested/external labels and `aria-labelledby` targets are resolved
within directly connected static JSX trees; dynamic content, spreads, ambiguous
labels and different render scopes remain unknown. Every emitted finding has
high confidence in the supplied static evidence, not a runtime certificate.

This is a deliberate narrowing of the old proposal. Import/registry-contract
resolution, state coverage, icons, motion, form validation, touch targets and
primitive preferences remain later work. No rule claims absent local state
branches are defects. Browser verification remains M2-02. No source-level
finding proves CSS cascade, actual focus behavior or visual accessibility.

## Versioned contract

```ts
interface ReviewRequest {
  schemaVersion: 1
  files: Array<{ path: string; content: string }>
  policy?: { semanticColors?: boolean }
  suppressions?: Array<{ file: string; rule: ReviewRule; line: number; reason: string }>
}

interface ReviewFinding {
  rule: ReviewRule
  severity: "error" | "warning" | "info"
  category: "defect" | "design-policy"
  confidence: "high"
  evidence: string[]
  file: string
  line: number
  column: number
  message: string
  fix: string
  docs: string
}

interface ReviewResult {
  schemaVersion: 1
  engineVersion: "1"
  summary: { errors: number; warnings: number; info: number }
  findings: ReviewFinding[]
  unknowns: Array<{ rule: ReviewRule; file: string; line: number; column: number; reason: string }>
  suppressed: Array<{ finding: ReviewFinding; reason: string }>
  evaluatedRules: ReviewRule[]
  limitations: string[]
}
```

No registry is consulted, so the result does not invent a registry version.
`evaluatedRules` means enabled rules, not complete coverage of every element.
Counts exclude suppressions; a suppression retains the full original finding
and a concrete reason of 3+ words / 12–512 characters. Unknowns and syntax gaps
never count as passes. There is no score, auto-fix or execution plan.

Limits: 64 files, safe relative `.jsx`/`.tsx` paths of at most 256 characters,
128 KiB UTF-8 per file / 256 KiB total source, 256 suppressions, 512 combined
findings/unknowns/suppressions and 512 KiB result JSON. Paths reject traversal,
absolute paths, backslashes, control characters and case collisions. Unknown
fields and unsupported versions fail. AST traversal is limited to 50,000 nodes
and depth 256; naming analysis has a shared 250,000-step per-review budget, including
reference scans and recursive expansion. Parse/syntax/complexity failures return
rule-scoped unknowns; work exhaustion discards partial findings for that file
and marks remaining files unknown without repeating the expensive analysis.
Oversized results fail and request a smaller batch instead of silently dropping
findings. Text and structured MCP representations duplicate the result; total
wire bytes exceed the JSON value size and remain subject to MCP protocol limits.

## Parser and distribution

Use `@babel/parser` 7.29.7, an existing pinned transitive dependency made explicit
for this package. It provides real JSX/TypeScript parsing without bundling the
full TypeScript compiler. This replaces the old proposed compiler API approach.
The package is DOM-, filesystem- and network-free. CLI/MCP tarballs inline both
the private engine and parser, and must run in a clean consumer installation.
Installed parser source is 512,666 bytes versus 9,144,216 bytes for the installed
TypeScript compiler module (source-file sizes, not deployment measurements).
The final built MCP subtree measured 757,422 bytes raw / 175,187 gzip across two
chunks. Its regression caps are 800 KiB raw and 192 KiB gzip; browser limits stay
unchanged. Measurements and commands are recorded in the execution handoff.
Remote Worker measurements must include dependent chunks; lazy imports or a
small entry chunk alone are not evidence of a small deployed parser.

## Adapters and user instructions

`logic2b review <paths...> --cwd <app> --json --fail-on error|warning` reads only
explicit regular files beneath the selected root. Symlinks/special files,
invalid UTF-8 and detected replacements fail; it checks descriptor and ancestor
identity before/after reads. No directory recursion or glob expansion is
implemented. `--semantic-colors` enables policy; `--suppressions <relative.json>`
reads a bounded 64 KiB JSON array. Exit 1 means the chosen finding threshold was
met; invalid input/read failures also fail. Unknowns remain visible separately.

`review_ui` receives the request directly, advertises read-only/closed-world
annotations, and returns matching typed/text results. Invalid input/budget
failures are bounded JSON-RPC -32602 errors before any I/O. It cannot inspect a
host filesystem. A host must discover this capability before naming it in rules.

English/Spanish `/docs/review` pages show examples and limitations. The rule
reference derives ids/categories/descriptions from `REVIEW_RULES` for both HTML
and Markdown. The packaged agent skill uses review only if advertised and keeps
browser verification and customization preservation explicit.

The benchmark's `pnpm --dir benchmarks/agents review <request.json>` produces
advisory evidence with these same rule ids. It does not rewrite historical v1
scores, make the intervention its own acceptance judge, or mark the complete v2
workflow available. Build/browser/human acceptance stays independent.

## Gates and handoff

- `pnpm --filter @logic2b/review test` and `lint`: positive/negative cases,
  wrappers/native/external labels, inert malicious source, syntax/complexity,
  UTF-8/path/output bounds, suppressions and zero-error registry/demo corpus.
- CLI real-command tests: JSON/text, threshold exits, unsafe files, unchanged
  trees, aliases/wrappers and source never executed or uploaded.
- MCP direct, actual stdio and HTTP tests: nested schemas, typed/text equality,
  negative corpus, limits and no fetches.
- `pnpm lint`, `pnpm test --concurrency=2`, `pnpm build`,
  `pnpm test:release-artifacts`, `pnpm benchmark:agents:test` and site budgets.
- Built `/docs/review` and `/es/docs/review`: HTML/Markdown rule parity, valid
  fragment links, keyboard/mobile overflow and structural axe checks. Inspect
  retained screenshots; do not update existing visual baselines automatically.

Record exact final commands, bundle measurements, limitations and commit in
[EXECUTION](../EXECUTION.md). A passing static corpus does not assert all runtime
accessibility requirements; native and wrapper unknowns must be retained.
