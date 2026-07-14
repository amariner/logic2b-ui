import { Area, AreaChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { ChartContainer, type ChartConfig } from "@/registry/ui/chart"

const chartData = [
  { month: 1, value: 3200 },
  { month: 2, value: 3600 },
  { month: 3, value: 3400 },
  { month: 4, value: 4100 },
  { month: 5, value: 4400 },
  { month: 6, value: 5200 },
]

const chartConfig = {
  value: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig

export default function ChartKpi01() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Revenue</CardDescription>
        <CardTitle className="text-3xl tabular-nums">$45,231.89</CardTitle>
        <p className="text-foreground text-xs font-medium">
          ↑ 20.1%{" "}
          <span className="text-muted-foreground font-normal">
            vs last month
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-20 w-full">
          <AreaChart data={chartData} margin={{ top: 5, bottom: 5, left: 0, right: 0 }}>
            <Area
              dataKey="value"
              type="natural"
              stroke="var(--color-value)"
              strokeWidth={2}
              fill="var(--color-value)"
              fillOpacity={0.15}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
