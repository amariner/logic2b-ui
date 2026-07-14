"use client"

import * as React from "react"

export interface UseCountUpOptions {
  /** Animation length in milliseconds. Default `1200`. */
  duration?: number
  /** Gate the animation — pass `false` to hold at `0` until you flip it true
   *  (e.g. once the element scrolls into view). Default `true`. */
  start?: boolean
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/**
 * Animates a number from 0 up to `end` with an ease-out curve, driven by
 * `requestAnimationFrame`. Returns the current value to render (format it with
 * `Intl.NumberFormat` at the call site). Jumps straight to `end` when the user
 * prefers reduced motion.
 */
export function useCountUp(
  end: number,
  { duration = 1200, start = true }: UseCountUpOptions = {}
): number {
  const [value, setValue] = React.useState(() =>
    start && !prefersReducedMotion() ? 0 : end
  )

  React.useEffect(() => {
    if (!start) return
    if (prefersReducedMotion()) {
      setValue(end)
      return
    }

    let raf = 0
    let startTs: number | undefined

    const tick = (ts: number) => {
      if (startTs === undefined) startTs = ts
      const progress = Math.min((ts - startTs) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(end * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else setValue(end)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [end, duration, start])

  return value
}
