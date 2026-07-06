import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "chart",
    type: "registry:ui",
    description:
      "A composable chart container built on Recharts. Exposes ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend and ChartLegendContent, plus a ChartConfig type for mapping data keys to labels, icons and CSS colors (--color-*). Use it to build area, bar, line and pie charts with automatic light/dark theme colors and a shadcn-style tooltip and legend.",
    dependencies: ["recharts"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/chart.tsx", type: "registry:ui" }],
  },
]
