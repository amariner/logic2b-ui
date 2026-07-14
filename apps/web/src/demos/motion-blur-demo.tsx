"use client"

import * as React from "react"

import { Button } from "@/registry/ui/button"
import { MotionBlur } from "@/registry/ui/motion-blur"

export default function MotionBlurDemo() {
  const [run, setRun] = React.useState(0)

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <MotionBlur
        key={run}
        duration={700}
        className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground"
      >
        <p className="text-lg font-semibold">Sharpen in</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The content resolves from an 8px blur as it mounts.
        </p>
      </MotionBlur>
    </div>
  )
}
