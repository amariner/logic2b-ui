import * as React from "react"

import { cn } from "@/registry/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const WEEKS = 18

// Intensity buckets mapped to token colors (opacity ramps a single token — no
// hardcoded colors). Index 0 = empty, 4 = most active.
const LEVELS = [
  "bg-muted",
  "bg-primary/20",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
]

// Deterministic pattern (no Math.random — keeps SSR and client markup identical).
const level = (day: number, week: number) => (day * 3 + week * 2 + ((day + week) % 5)) % 5

export default function ChartHeatmap01() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Heatmap</CardTitle>
        <CardDescription>Contributions over the last 18 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="w-fit space-y-1">
            {DAYS.map((day, d) => (
              <div key={day} className="flex items-center gap-1">
                <span className="text-muted-foreground w-8 shrink-0 text-xs">
                  {day}
                </span>
                {Array.from({ length: WEEKS }).map((_, w) => {
                  const lv = level(d, w)
                  return (
                    <span
                      key={w}
                      data-slot="heatmap-cell"
                      className={cn("size-3 shrink-0 rounded-[2px]", LEVELS[lv])}
                      title={`${lv} contributions`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
          <span>Less</span>
          {LEVELS.map((cls, i) => (
            <span key={i} className={cn("size-3 rounded-[2px]", cls)} />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}
