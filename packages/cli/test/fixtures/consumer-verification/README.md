# Generated consumer verification fixture

`scripts/verify-consumer.mts prepare <new-directory>` runs the actual local CLI
scaffolder and component installer against the committed, immutable
`1.0.0-rc.18` registry. It verifies copied source bytes and content-addressed
payload integrity, writes this independent consumer host, and emits a bounded
`verification-suite.json`. The fixture never imports website demos or registry
implementation code as its expected result.

Preparation, dependency installation, compilation and browser checking are
separate operations:

```sh
pnpm --filter logic2b consumer:prepare /tmp/logic2b-consumer
pnpm --dir /tmp/logic2b-consumer install --frozen-lockfile=false
pnpm --dir /tmp/logic2b-consumer run build
pnpm --filter logic2b build
pnpm --filter logic2b test:consumer /tmp/logic2b-consumer /tmp/logic2b-consumer-evidence
```

Install the matching Chromium explicitly with
`pnpm --dir /tmp/logic2b-consumer exec playwright install chromium`, or select
an existing executable with `PLAYWRIGHT_CHROMIUM_PATH`. The checker owns a local
static server for the existing `dist`, invokes the built `logic2b verify`, and
validates the full report, summary, coverage and evidence hashes. It does not
install, build, execute package scripts, modify installed components or remove
the generated project. Evidence destinations must be new.

Ten scenarios at 390px and 1280px exercise synthetic customer data, filtering,
stable consumer-owned sorting, loading, empty data, retry, create, edit,
validation and linked errors, keyboard tab order and opener focus, save
failure with a preserved draft, success, denied actions, translations, long
names and 200% text. The expected row order and field messages are independent
literal assertions. Axe includes color contrast; no rules are disabled.
Screenshots capture reviewable evidence, not a visual-regression verdict.

The 200% text scenario may produce four `unknown` axe checks: list and edit at
each viewport. The scrollable table clips cells whose background axe cannot
measure. The fixture gate permits only those exact check identities, with zero
violations and every incomplete finding restricted to `color-contrast` /
`elmPartiallyObscured`. It rejects other unknowns, any failures and skipped
checks. The report retains `unknown`, the invoked CLI retains exit 2, and
`fixture-contrast-review.json` records required human review across scroll
positions. A successful fixture command therefore means complete declared
coverage with a bounded review requirement, not complete accessibility approval.

The host deliberately uses an in-memory service. A passing fixture does not
verify a real backend, server authorization, persistence across reloads,
every browser, every viewport, all registry blocks or WCAG conformance.
