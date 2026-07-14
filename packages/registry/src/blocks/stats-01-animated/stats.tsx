import * as React from "react"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { useCountUp } from "@/registry/hooks/use-count-up"
import { cn } from "@/registry/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { Motion } from "@/registry/ui/motion"

// The animated twin of stats-01: the KPI values count up on mount and the
// cards cascade in as a staggered fade-up. Values are stored as numbers with
// format metadata so the count-up can animate them; the display is rebuilt each
// frame with Intl.NumberFormat.
const stats = [
  {
    label: "Total revenue",
    value: 45231.89,
    prefix: "$",
    decimals: 2,
    delta: "+20.1%",
    up: true,
  },
  { label: "Subscriptions", value: 2350, delta: "+180.1%", up: true },
  { label: "Active now", value: 573, delta: "+201", up: true },
  { label: "Churn", value: 1.2, suffix: "%", decimals: 1, delta: "-0.4%", up: false },
]

function StatValue({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const current = useCountUp(value, { duration: 1200 })
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(current)
  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  )
}

export function Stats({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-6 py-16", className)}
      {...props}
    >
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Overview
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Your key metrics for the last 30 days.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.up ? TrendingUpIcon : TrendingDownIcon
          return (
            <Motion asChild key={stat.label} preset="fade-up" delay={i * 100}>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="font-heading text-2xl tracking-tight tabular-nums">
                    <StatValue
                      value={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                    />
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
            </Motion>
          )
        })}
      </div>
    </div>
  )
}
