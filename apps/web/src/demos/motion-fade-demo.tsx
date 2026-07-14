"use client"

import * as React from "react"

import { Button } from "@/registry/ui/button"
import { MotionFade } from "@/registry/ui/motion-fade"

export default function MotionFadeDemo() {
  const [run, setRun] = React.useState(0)

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <MotionFade
        key={run}
        duration={600}
        className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground"
      >
        <p className="text-sm font-medium">Fade in</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The card fades up into place when it mounts.
        </p>
      </MotionFade>
    </div>
  )
}
