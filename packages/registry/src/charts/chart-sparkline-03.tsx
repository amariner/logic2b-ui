import { Bar, BarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { ChartContainer, type ChartConfig } from "@/registry/ui/chart"

const chartData = [
  { day: 1, value: 40 },
  { day: 2, value: 72 },
  { day: 3, value: 58 },
  { day: 4, value: 90 },
  { day: 5, value: 66 },
  { day: 6, value: 84 },
  { day: 7, value: 100 },
]

const chartConfig = {
  value: { label: "Orders", color: "var(--chart-3)" },
} satisfies ChartConfig

export default function ChartSparkline03() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Orders</CardDescription>
        <CardTitle className="text-2xl tabular-nums">1,204</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-16 w-full">
          <BarChart data={chartData} margin={{ top: 5, bottom: 5, left: 0, right: 0 }}>
            <Bar dataKey="value" fill="var(--color-value)" radius={2} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
