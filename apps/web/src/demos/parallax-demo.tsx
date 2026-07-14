"use client"

import { Parallax } from "@/registry/ui/parallax"

export default function ParallaxDemo() {
  return (
    <div className="h-80 w-full overflow-y-auto rounded-lg border bg-muted/20">
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Scroll ↓
      </div>
      <Parallax range="16%" className="mx-4 h-56 rounded-xl border">
        <div className="from-primary/25 via-primary/10 to-background flex size-full items-center justify-center bg-gradient-to-br">
          <span className="font-heading text-2xl font-bold tracking-tight">
            Parallax
          </span>
        </div>
      </Parallax>
      <div className="flex h-64 items-start justify-center pt-6 text-sm text-muted-foreground">
        keep scrolling ↓
      </div>
    </div>
  )
}
