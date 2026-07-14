import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/registry/ui/chart"

const chartData = [
  { month: "January", revenue: 186, orders: 120 },
  { month: "February", revenue: 305, orders: 160 },
  { month: "March", revenue: 237, orders: 140 },
  { month: "April", revenue: 273, orders: 180 },
  { month: "May", revenue: 309, orders: 210 },
  { month: "June", revenue: 344, orders: 240 },
]

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  orders: { label: "Orders", color: "var(--chart-2)" },
} satisfies ChartConfig

export default function ChartComposed01() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Composed Chart</CardTitle>
        <CardDescription>Revenue bars with an orders trend line</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            <Line
              dataKey="orders"
              type="natural"
              stroke="var(--color-orders)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
