"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { cn } from "@/registry/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/registry/ui/chart"

const KPIS = [
  { label: "Revenue", value: "$128,400", delta: "+14.2%" },
  { label: "Orders", value: "3,842", delta: "+9.1%" },
  { label: "Conversion", value: "3.6%", delta: "+0.4pt" },
  { label: "Sessions", value: "106,900", delta: "+5.8%" },
]

const revenue = [
  { month: "January", revenue: 14200 },
  { month: "February", revenue: 16800 },
  { month: "March", revenue: 15400 },
  { month: "April", revenue: 19100 },
  { month: "May", revenue: 22600 },
  { month: "June", revenue: 24400 },
]

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig

const topProducts = [
  { name: "Hypernova Headphones", units: 1240, revenue: 161200, share: 100 },
  { name: "AeroGlow Desk Lamp", units: 980, revenue: 39160, share: 78 },
  { name: "Gamer Gear Pro Controller", units: 760, revenue: 45524, share: 61 },
  { name: "Luminous VR Headset", units: 410, revenue: 81959, share: 33 },
]

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

export function AdminAnalytics({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-6 py-10", className)} {...props}>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Store performance over the last 6 months.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground text-xs font-medium">
                {kpi.delta}{" "}
                <span className="text-muted-foreground font-normal">vs last period</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Monthly gross revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <AreaChart accessibilityLayer data={revenue} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="revenue"
                  type="natural"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  fill="var(--color-revenue)"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {topProducts.map((product) => (
              <div key={product.name} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{product.name}</span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {money(product.revenue)}
                  </span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${product.share}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {product.units.toLocaleString()} units
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
