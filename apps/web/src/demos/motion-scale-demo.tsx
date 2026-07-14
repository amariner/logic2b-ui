"use client"

import * as React from "react"

import { Button } from "@/registry/ui/button"
import { MotionScale } from "@/registry/ui/motion-scale"

export default function MotionScaleDemo() {
  const [run, setRun] = React.useState(0)

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <MotionScale
        key={run}
        hover="lift"
        className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground"
      >
        <p className="text-sm font-medium">Scale in</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Zooms in from 95% on mount, then lifts on hover.
        </p>
      </MotionScale>
    </div>
  )
}
