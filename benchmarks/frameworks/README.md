# Framework performance benchmark

This suite renders the exact same interactive logic2b registry block in
Next.js App Router, Vite + React, Astro with a `client:load` React island and
TanStack Start. Framework and runtime versions are exact-pinned in the isolated
workspace and its lockfile; the main monorepo build does not install or run
these fixtures.

## Run

From this directory:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm benchmark
```

`prepare-scenario.mjs` copies the current `stats-01-animated` block and its
transitive registry source into an ignored generated directory before every
run. This prevents fixture drift while keeping the benchmark dependency graph
isolated from the product workspace.

The runner deletes only each fixture's build output, records cold production
build time and client asset size, starts the production preview, then opens five
fresh Chromium contexts. Chrome DevTools Protocol applies a 4× CPU slowdown,
150 ms latency, 200,000 bytes/s download and 93,750 bytes/s upload. The shared
scenario marks its first React effect as “hydration ready”; LCP, TTFB and
transferred script bytes come from browser Performance APIs. Medians are written
to [RESULTS.md](./RESULTS.md) and [results/latest.json](./results/latest.json).

The comparison deliberately measures framework delivery overhead for one real
interactive block. It does not claim that a single route predicts a large
application, serverless cold starts, caching behavior or framework developer
experience.
