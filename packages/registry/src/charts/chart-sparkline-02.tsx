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
  { day: 1, value: 120 },
  { day: 2, value: 180 },
  { day: 3, value: 160 },
  { day: 4, value: 240 },
  { day: 5, value: 300 },
  { day: 6, value: 280 },
  { day: 7, value: 340 },
]

const chartConfig = {
  value: { label: "Revenue", color: "var(--chart-2)" },
} satisfies ChartConfig

export default function ChartSparkline02() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Revenue</CardDescription>
        <CardTitle className="text-2xl tabular-nums">$8,240</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-16 w-full">
          <AreaChart data={chartData} margin={{ top: 5, bottom: 5, left: 0, right: 0 }}>
            <Area
              dataKey="value"
              type="natural"
              stroke="var(--color-value)"
              strokeWidth={2}
              fill="var(--color-value)"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
