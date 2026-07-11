import * as React from "react"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import ChartArea04 from "@/registry/charts/chart-area-04"
import ChartBar04 from "@/registry/charts/chart-bar-04"
import ChartPie03 from "@/registry/charts/chart-pie-03"
import ChartRadial02 from "@/registry/charts/chart-radial-02"

const stats = [
  { label: "Total revenue", value: "$45,231.89", delta: "+20.1%", up: true },
  { label: "Subscriptions", value: "2,350", delta: "+180.1%", up: true },
  { label: "Active now", value: "573", delta: "+201", up: true },
  { label: "Churn", value: "1.2%", delta: "-0.4%", up: false },
]

export function AnalyticsDashboard({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-6 py-10", className)}
      {...props}
    >
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A snapshot of performance across the last quarter.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.up ? TrendingUpIcon : TrendingDownIcon
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="font-heading text-2xl tracking-tight tabular-nums">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Icon className="text-foreground size-3.5" />
                  <span className="text-foreground font-medium">
                    {stat.delta}
                  </span>
                  vs last month
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ChartArea04 />
        </div>
        <ChartBar04 />
        <div className="grid gap-4 sm:grid-cols-2">
          <ChartPie03 />
          <ChartRadial02 />
        </div>
      </div>
    </div>
  )
}
