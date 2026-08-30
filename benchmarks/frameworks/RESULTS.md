# Framework benchmark results

Same interactive `stats-01-animated` registry block, React 19.2.7 and Tailwind
4.3.2. Median of 5 cold browser contexts with 4× CPU slowdown, 150 ms
latency and 195.3 KiB/s download throughput. Build size counts
production client JS + CSS; transferred JS comes from the browser Resource
Timing API. Lower is better in every numeric column.

| Framework | Build ms | Client gzip KiB | JS transferred KiB | Hydration ready ms | LCP ms | TTFB ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Next.js | 5436.2 | 184.6 | 143.5 | 1254.3 | 468 | 2.3 |
| Vite | 621.4 | 73.2 | 69.6 | 822.4 | 832 | 1.3 |
| Astro | 1586.2 | 74.6 | 71.5 | 981.9 | 400 | 1.5 |
| TanStack Start | 1208.2 | 112 | 108.7 | 1043.3 | 424 | 3.2 |

Generated 2026-08-29T10:33:46.768Z on darwin 25.2.0, Apple M2
(8 logical cores). Framework versions: Next.js 16.3.3, Vite 8.2.2, Astro 7.2.9, TanStack Start 1.168.49.

These are comparative lab results, not universal framework rankings. Re-run
`pnpm benchmark` on the same host before comparing changes over time; raw
data and the exact profile live in [results/latest.json](./results/latest.json).
