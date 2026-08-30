"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Button } from "@/registry/ui/button"
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

type Sample = {
  time: string
  requests: number
  errors: number
}

const INITIAL_REQUESTS = [78, 84, 81, 92, 98, 94, 103, 108, 101, 112, 118, 114]
const NEXT_REQUESTS = [121, 117, 126, 132, 125, 138, 142, 136, 148, 145, 153, 149]
const NEXT_ERRORS = [2, 1, 3, 2, 4, 2, 3, 5, 2, 3, 4, 2]

function timeLabel(index: number) {
  const seconds = index * 5
  const minute = Math.floor(seconds / 60)
  const second = String(seconds % 60).padStart(2, "0")
  return `12:${String(minute).padStart(2, "0")}:${second}`
}

function initialSamples(): Sample[] {
  return INITIAL_REQUESTS.map((requests, index) => ({
    time: timeLabel(index),
    requests,
    errors: [1, 2, 1, 3][index % 4],
  }))
}

const chartConfig = {
  requests: {
    label: "Requests / min",
    color: "var(--chart-1)",
  },
  errors: {
    label: "Errors / min",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export default function ChartRealtime01() {
  const [samples, setSamples] = React.useState(initialSamples)
  const [running, setRunning] = React.useState(false)
  const sequenceRef = React.useRef(0)

  React.useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => {
      const sequence = sequenceRef.current
      const next: Sample = {
        time: timeLabel(INITIAL_REQUESTS.length + sequence),
        requests: NEXT_REQUESTS[sequence % NEXT_REQUESTS.length],
        errors: NEXT_ERRORS[sequence % NEXT_ERRORS.length],
      }
      sequenceRef.current += 1
      setSamples((current) => [...current.slice(1), next])
    }, 500)
    return () => window.clearInterval(interval)
  }, [running])

  function reset() {
    setRunning(false)
    sequenceRef.current = 0
    setSamples(initialSamples())
  }

  const latest = samples.at(-1)!

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center gap-4 border-b">
        <div className="grid flex-1 gap-1">
          <div className="flex items-center gap-2">
            <CardTitle>Live API traffic</CardTitle>
            <span
              className="relative flex size-2"
              aria-hidden="true"
            >
              {running && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-1 opacity-60" />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-chart-1" />
            </span>
          </div>
          <CardDescription>Rolling one-minute window · deterministic demo feed</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={running ? "secondary" : "default"}
            size="sm"
            onClick={() => setRunning((current) => !current)}
          >
            {running ? "Pause stream" : "Start stream"}
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3 px-2">
          <div>
            <p className="text-xs text-muted-foreground">Latest throughput</p>
            <p className="text-2xl font-semibold tabular-nums">
              {latest.requests}
              <span className="ml-1 text-sm font-normal text-muted-foreground">req/min</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Errors</p>
            <p className="text-lg font-medium tabular-nums">{latest.errors}/min</p>
          </div>
          <p className="ml-auto text-xs text-muted-foreground" role="status" aria-live="polite">
            {running ? `Streaming · sample ${sequenceRef.current + 1}` : "Stream paused"}
          </p>
        </div>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <LineChart
            accessibilityLayer
            data={samples}
            margin={{ left: 0, right: 12, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={26}
              tickFormatter={(value) => String(value).slice(3)}
            />
            <YAxis
              yAxisId="requests"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={34}
              domain={[0, "dataMax + 20"]}
            />
            <YAxis yAxisId="errors" hide domain={[0, 12]} />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              yAxisId="requests"
              dataKey="requests"
              type="monotone"
              stroke="var(--color-requests)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="errors"
              dataKey="errors"
              type="stepAfter"
              stroke="var(--color-errors)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
