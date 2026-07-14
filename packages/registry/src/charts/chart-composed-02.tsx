import {
  Area,
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
  { month: "January", traffic: 400, conversions: 90 },
  { month: "February", traffic: 520, conversions: 130 },
  { month: "March", traffic: 480, conversions: 120 },
  { month: "April", traffic: 610, conversions: 170 },
  { month: "May", traffic: 700, conversions: 210 },
  { month: "June", traffic: 760, conversions: 250 },
]

const chartConfig = {
  traffic: { label: "Traffic", color: "var(--chart-3)" },
  conversions: { label: "Conversions", color: "var(--chart-1)" },
} satisfies ChartConfig

export default function ChartComposed02() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Composed Chart - Area + Line</CardTitle>
        <CardDescription>Traffic area under a conversions line</CardDescription>
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
            <Area
              dataKey="traffic"
              type="natural"
              fill="var(--color-traffic)"
              fillOpacity={0.2}
              stroke="var(--color-traffic)"
            />
            <Line
              dataKey="conversions"
              type="natural"
              stroke="var(--color-conversions)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
