import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "chart",
    type: "registry:ui",
    description:
      "A composable chart container built on Recharts. Exposes ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend and ChartLegendContent, plus a ChartConfig type for mapping data keys to labels, icons and CSS colors (--color-*). Use it to build area, bar, line and pie charts with automatic light/dark theme colors and a theme-aware tooltip and legend.",
    dependencies: ["recharts"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/chart.tsx", type: "registry:ui" }],
  },
  ...charts([
    {
      name: "chart-area-01",
      title: "Area Chart",
      category: "area",
      description:
        "A simple area chart with a single series, month labels on the X axis and a line-indicator tooltip. Use it to show one metric's trend over time.",
    },
    {
      name: "chart-area-02",
      title: "Area Chart - Stacked",
      category: "area",
      description:
        "A stacked area chart with two series (desktop and mobile) sharing one X axis. Use it to show how parts contribute to a total over time.",
    },
    {
      name: "chart-bar-01",
      title: "Bar Chart",
      category: "bar",
      description:
        "A vertical bar chart with two series side by side per month and rounded bar tops. Use it to compare two metrics across discrete periods.",
    },
    {
      name: "chart-bar-02",
      title: "Bar Chart - Horizontal",
      category: "bar",
      description:
        "A horizontal bar chart with a single series and category labels on the Y axis. Use it when category names are long or there are many categories.",
    },
    {
      name: "chart-line-01",
      title: "Line Chart",
      category: "line",
      description:
        "A single-series line chart with a smooth monotone curve and no dots. Use it for a clean view of one metric's trend.",
    },
    {
      name: "chart-line-02",
      title: "Line Chart - Multiple",
      category: "line",
      description:
        "A line chart with two series in different chart colors. Use it to compare trends between two metrics over the same period.",
    },
    {
      name: "chart-pie-01",
      title: "Pie Chart",
      category: "pie",
      description:
        "A pie chart with per-slice colors driven by the chart config (--color-*) and a labelled tooltip. Use it to show proportions of a whole.",
    },
    {
      name: "chart-pie-02",
      title: "Pie Chart - Donut",
      category: "pie",
      description:
        "A donut chart (pie with inner radius) with per-slice colors and a hoverable tooltip. Use it when you want proportions plus room for a center label.",
    },
    {
      name: "chart-radar-01",
      title: "Radar Chart",
      category: "radar",
      description:
        "A radar chart plotting one series across categorical axes on a polar grid. Use it to compare a profile of values across dimensions.",
    },
    {
      name: "chart-radial-01",
      title: "Radial Chart",
      category: "radial",
      description:
        "A radial bar chart where each ring is a category colored via the chart config. Use it as a compact, decorative alternative to a bar chart.",
    },
  ]),
]

/** All installable charts share the same shape: a single file, recharts, and
 *  the card + chart primitives. Only name, title, category and description vary. */
function charts(
  defs: { name: string; title: string; category: string; description: string }[]
): RegistryItem[] {
  return defs.map(({ name, title, category, description }) => ({
    name,
    type: "registry:block",
    title,
    description,
    dependencies: ["recharts"],
    registryDependencies: ["card", "chart"],
    categories: ["charts", `charts-${category}`],
    files: [{ path: `src/charts/${name}.tsx`, type: "registry:block" }],
  }))
}
