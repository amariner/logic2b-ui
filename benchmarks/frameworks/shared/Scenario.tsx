"use client"

import * as React from "react"

import { Stats } from "../generated/registry/blocks/stats"

declare global {
  interface Window {
    __logic2bHydrated?: number
  }
}
export function BenchmarkScenario() {
  React.useEffect(() => {
    window.__logic2bHydrated = performance.now()
  }, [])

  return (
    <main data-benchmark-ready="stats-01-animated">
      <Stats />
    </main>
  )
}
