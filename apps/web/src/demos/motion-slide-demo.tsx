"use client"

import * as React from "react"

import { Button } from "@/registry/ui/button"
import {
  MotionSlide,
  type MotionSlideDirection,
} from "@/registry/ui/motion-slide"

const directions: MotionSlideDirection[] = ["up", "down", "left", "right"]

export default function MotionSlideDemo() {
  const [run, setRun] = React.useState(0)

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <div key={run} className="grid w-full grid-cols-2 gap-3">
        {directions.map((direction, i) => (
          <MotionSlide
            key={direction}
            direction={direction}
            delay={i * 100}
            className="flex h-20 items-center justify-center rounded-lg border bg-card text-sm font-medium text-card-foreground"
          >
            {direction}
          </MotionSlide>
        ))}
      </div>
    </div>
  )
}
