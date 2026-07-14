import { Line, LineChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { ChartContainer, type ChartConfig } from "@/registry/ui/chart"

const chartData = [
  { month: 1, value: 2600 },
  { month: 2, value: 2500 },
  { month: 3, value: 2550 },
  { month: 4, value: 2400 },
  { month: 5, value: 2380 },
  { month: 6, value: 2340 },
]

const chartConfig = {
  value: { label: "Active users", color: "var(--chart-4)" },
} satisfies ChartConfig

export default function ChartKpi02() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Active users</CardDescription>
        <CardTitle className="text-3xl tabular-nums">2,340</CardTitle>
        <p className="text-destructive text-xs font-medium">
          ↓ 4.5%{" "}
          <span className="text-muted-foreground font-normal">
            vs last month
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-20 w-full">
          <LineChart data={chartData} margin={{ top: 5, bottom: 5, left: 0, right: 0 }}>
            <Line
              dataKey="value"
              type="natural"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
