"use client"

import * as React from "react"

import { Button } from "@/registry/ui/button"
import { Motion, type MotionPreset } from "@/registry/ui/motion"

const presets: MotionPreset[] = ["fade", "fade-up", "fade-left", "scale", "blur"]

export default function MotionDemo() {
  const [run, setRun] = React.useState(0)

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <div key={run} className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {presets.map((preset, i) => (
          <Motion
            key={preset}
            preset={preset}
            delay={i * 120}
            className="flex h-20 items-center justify-center rounded-lg border bg-card text-sm font-medium text-card-foreground"
          >
            {preset}
          </Motion>
        ))}
      </div>
    </div>
  )
}
