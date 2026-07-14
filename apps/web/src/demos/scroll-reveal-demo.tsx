"use client"

import * as React from "react"

import { ScrollReveal } from "@/registry/ui/scroll-reveal"
import type { MotionPreset } from "@/registry/ui/motion"

const items: { label: string; preset: MotionPreset }[] = [
  { label: "Fade up", preset: "fade-up" },
  { label: "Fade left", preset: "fade-left" },
  { label: "Scale", preset: "scale" },
  { label: "Blur", preset: "blur" },
]

export default function ScrollRevealDemo() {
  const rootRef = React.useRef<HTMLDivElement>(null)

  return (
    <div
      ref={rootRef}
      className="h-80 w-full overflow-y-auto rounded-lg border bg-muted/20"
    >
      <div className="p-4 text-center text-sm text-muted-foreground">
        Scroll down ↓
      </div>
      <div className="space-y-4 p-4 pt-48">
        {items.map((item) => (
          <ScrollReveal
            key={item.label}
            root={rootRef}
            preset={item.preset}
            amount={0.6}
            className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Revealed as it scrolls into view.
            </p>
          </ScrollReveal>
        ))}
        <div className="h-32" />
      </div>
    </div>
  )
}
