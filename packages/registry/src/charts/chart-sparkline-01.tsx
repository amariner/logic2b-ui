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
  { day: 1, value: 240 },
  { day: 2, value: 300 },
  { day: 3, value: 280 },
  { day: 4, value: 360 },
  { day: 5, value: 340 },
  { day: 6, value: 420 },
  { day: 7, value: 480 },
]

const chartConfig = {
  value: { label: "Visitors", color: "var(--chart-1)" },
} satisfies ChartConfig

export default function ChartSparkline01() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Visitors</CardDescription>
        <CardTitle className="text-2xl tabular-nums">12,480</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-16 w-full">
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
