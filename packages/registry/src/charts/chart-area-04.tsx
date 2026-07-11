"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select"

const chartData = [
  { date: "2024-04-01", desktop: 260, mobile: 289 },
  { date: "2024-04-02", desktop: 380, mobile: 355 },
  { date: "2024-04-03", desktop: 397, mobile: 334 },
  { date: "2024-04-04", desktop: 498, mobile: 389 },
  { date: "2024-04-05", desktop: 485, mobile: 353 },
  { date: "2024-04-06", desktop: 455, mobile: 391 },
  { date: "2024-04-07", desktop: 507, mobile: 337 },
  { date: "2024-04-08", desktop: 451, mobile: 358 },
  { date: "2024-04-09", desktop: 390, mobile: 291 },
  { date: "2024-04-10", desktop: 426, mobile: 302 },
  { date: "2024-04-11", desktop: 372, mobile: 230 },
  { date: "2024-04-12", desktop: 328, mobile: 159 },
  { date: "2024-04-13", desktop: 391, mobile: 175 },
  { date: "2024-04-14", desktop: 366, mobile: 115 },
  { date: "2024-04-15", desktop: 444, mobile: 144 },
  { date: "2024-04-16", desktop: 425, mobile: 99 },
  { date: "2024-04-17", desktop: 400, mobile: 144 },
  { date: "2024-04-18", desktop: 461, mobile: 112 },
  { date: "2024-04-19", desktop: 410, mobile: 168 },
  { date: "2024-04-20", desktop: 343, mobile: 143 },
  { date: "2024-04-21", desktop: 360, mobile: 118 },
  { date: "2024-04-22", desktop: 271, mobile: 174 },
  { date: "2024-04-23", desktop: 179, mobile: 144 },
  { date: "2024-04-24", desktop: 188, mobile: 192 },
  { date: "2024-04-25", desktop: 111, mobile: 152 },
  { date: "2024-04-26", desktop: 147, mobile: 191 },
  { date: "2024-04-27", desktop: 104, mobile: 144 },
  { date: "2024-04-28", desktop: 79, mobile: 178 },
  { date: "2024-04-29", desktop: 166, mobile: 131 },
  { date: "2024-04-30", desktop: 166, mobile: 87 },
  { date: "2024-05-01", desktop: 169, mobile: 131 },
  { date: "2024-05-02", desktop: 267, mobile: 99 },
  { date: "2024-05-03", desktop: 259, mobile: 157 },
  { date: "2024-05-04", desktop: 241, mobile: 140 },
  { date: "2024-05-05", desktop: 308, mobile: 213 },
  { date: "2024-05-06", desktop: 268, mobile: 208 },
  { date: "2024-05-07", desktop: 223, mobile: 288 },
  { date: "2024-05-08", desktop: 275, mobile: 286 },
  { date: "2024-05-09", desktop: 237, mobile: 281 },
  { date: "2024-05-10", desktop: 306, mobile: 355 },
  { date: "2024-05-11", desktop: 291, mobile: 338 },
  { date: "2024-05-12", desktop: 290, mobile: 396 },
  { date: "2024-05-13", desktop: 396, mobile: 362 },
  { date: "2024-05-14", desktop: 410, mobile: 402 },
  { date: "2024-05-15", desktop: 424, mobile: 352 },
  { date: "2024-05-16", desktop: 527, mobile: 379 },
  { date: "2024-05-17", desktop: 519, mobile: 319 },
  { date: "2024-05-18", desktop: 493, mobile: 258 },
  { date: "2024-05-19", desktop: 546, mobile: 281 },
  { date: "2024-05-20", desktop: 484, mobile: 225 },
  { date: "2024-05-21", desktop: 506, mobile: 256 },
  { date: "2024-05-22", desktop: 423, mobile: 210 },
  { date: "2024-05-23", desktop: 339, mobile: 252 },
  { date: "2024-05-24", desktop: 359, mobile: 216 },
  { date: "2024-05-25", desktop: 292, mobile: 266 },
  { date: "2024-05-26", desktop: 238, mobile: 234 },
  { date: "2024-05-27", desktop: 294, mobile: 201 },
  { date: "2024-05-28", desktop: 263, mobile: 248 },
  { date: "2024-05-29", desktop: 237, mobile: 207 },
  { date: "2024-05-30", desktop: 309, mobile: 244 },
  { date: "2024-05-31", desktop: 277, mobile: 192 },
  { date: "2024-06-01", desktop: 333, mobile: 217 },
  { date: "2024-06-02", desktop: 280, mobile: 156 },
  { date: "2024-06-03", desktop: 215, mobile: 175 },
  { date: "2024-06-04", desktop: 240, mobile: 111 },
  { date: "2024-06-05", desktop: 166, mobile: 49 },
  { date: "2024-06-06", desktop: 95, mobile: 76 },
  { date: "2024-06-07", desktop: 131, mobile: 30 },
  { date: "2024-06-08", desktop: 86, mobile: 70 },
  { date: "2024-06-09", desktop: 59, mobile: 38 },
  { date: "2024-06-10", desktop: 148, mobile: 99 },
  { date: "2024-06-11", desktop: 155, mobile: 84 },
  { date: "2024-06-12", desktop: 172, mobile: 159 },
  { date: "2024-06-13", desktop: 291, mobile: 154 },
  { date: "2024-06-14", desktop: 309, mobile: 151 },
  { date: "2024-06-15", desktop: 415, mobile: 229 },
  { date: "2024-06-16", desktop: 410, mobile: 219 },
  { date: "2024-06-17", desktop: 391, mobile: 288 },
  { date: "2024-06-18", desktop: 454, mobile: 266 },
  { date: "2024-06-19", desktop: 409, mobile: 320 },
  { date: "2024-06-20", desktop: 359, mobile: 285 },
  { date: "2024-06-21", desktop: 406, mobile: 327 },
  { date: "2024-06-22", desktop: 362, mobile: 283 },
  { date: "2024-06-23", desktop: 328, mobile: 237 },
  { date: "2024-06-24", desktop: 401, mobile: 276 },
  { date: "2024-06-25", desktop: 387, mobile: 234 },
  { date: "2024-06-26", desktop: 476, mobile: 279 },
  { date: "2024-06-27", desktop: 469, mobile: 246 },
  { date: "2024-06-28", desktop: 456, mobile: 301 },
  { date: "2024-06-29", desktop: 528, mobile: 276 },
  { date: "2024-06-30", desktop: 487, mobile: 338 },
]

const chartConfig = {
  visitors: { label: "Visitors" },
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig

export default function ChartArea04() {
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Area Chart - Interactive</CardTitle>
          <CardDescription>
            Showing total visitors for the last 3 months
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
