"use client"

import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/registry/lib/utils"

/**
 * Motion presets — enter/exit/hover recipes expressed as token-driven class
 * strings on top of `tw-animate-css` (zero runtime deps). The `<Motion>`
 * primitive plays an enter recipe once on mount; the exported maps and helpers
 * let you drop the same recipes onto anything else (a Radix `data-[state]`
 * element, a hand-rolled transition).
 *
 * Timing rides the CSS custom properties tw-animate-css reads:
 *  - default duration/easing come from the static `duration-*`/`ease-*` classes
 *    baked into `motionEnter`,
 *  - the `duration`/`delay` props override them per-instance via
 *    `--tw-animation-duration` / `--tw-animation-delay` (no arbitrary Tailwind
 *    class is generated at runtime, so it works with any value).
 *
 * Everything degrades under `prefers-reduced-motion`: the enter animation is
 * dropped (content shows immediately) and hover transitions are disabled.
 */

export type MotionPreset =
  | "fade"
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale"
  | "blur"

export type MotionHover = "lift" | "sink" | "scale" | "glow"

/** Enter recipes: tw-animate-css `animate-in` sets the keyframe `from` state,
 *  the element animates to its natural rendered state. */
export const motionEnterPresets: Record<MotionPreset, string> = {
  fade: "fade-in",
  "fade-up": "fade-in slide-in-from-bottom-3",
  "fade-down": "fade-in slide-in-from-top-3",
  "fade-left": "fade-in slide-in-from-right-3",
  "fade-right": "fade-in slide-in-from-left-3",
  scale: "fade-in zoom-in-95",
  blur: "fade-in blur-in-8",
}

/** Exit recipes: the mirror of each enter preset, for `animate-out` on a
 *  Radix `data-[state=closed]` element. */
export const motionExitPresets: Record<MotionPreset, string> = {
  fade: "fade-out",
  "fade-up": "fade-out slide-out-to-top-3",
  "fade-down": "fade-out slide-out-to-bottom-3",
  "fade-left": "fade-out slide-out-to-left-3",
  "fade-right": "fade-out slide-out-to-right-3",
  scale: "fade-out zoom-out-95",
  blur: "fade-out blur-out-8",
}

/** Hover recipes: plain Tailwind transitions, no keyframes. */
export const motionHoverPresets: Record<MotionHover, string> = {
  lift: "transition-transform duration-200 ease-out hover:-translate-y-1",
  sink: "transition-transform duration-200 ease-out hover:translate-y-0.5",
  scale: "transition-transform duration-200 ease-out hover:scale-[1.03]",
  glow: "transition-shadow duration-200 ease-out hover:shadow-lg",
}

/** Build the class string for an enter recipe (plays on mount). */
export function motionEnter(preset: MotionPreset, className?: string) {
  return cn(
    "animate-in fill-mode-both duration-500 ease-out motion-reduce:animate-none",
    motionEnterPresets[preset],
    className
  )
}

/** Build the class string for an exit recipe (pair with `animate-out`). */
export function motionExit(preset: MotionPreset, className?: string) {
  return cn(
    "animate-out fill-mode-both duration-300 ease-in motion-reduce:animate-none",
    motionExitPresets[preset],
    className
  )
}

/** Build the class string for a hover recipe. */
export function motionHover(hover: MotionHover, className?: string) {
  return cn("motion-reduce:transition-none", motionHoverPresets[hover], className)
}

/** Per-instance timing overrides, applied through the custom properties
 *  tw-animate-css reads so any numeric value works without a Tailwind class. */
function motionVars(duration?: number, delay?: number): React.CSSProperties {
  const style: Record<string, string> = {}
  if (duration != null) style["--tw-animation-duration"] = `${duration}ms`
  if (delay != null) style["--tw-animation-delay"] = `${delay}ms`
  return style as React.CSSProperties
}

export interface MotionProps extends React.ComponentProps<"div"> {
  /** Enter recipe to play on mount. Default `"fade"`. */
  preset?: MotionPreset
  /** Optional hover recipe applied to the same element. */
  hover?: MotionHover
  /** Enter duration in milliseconds. Overrides the 500ms default. */
  duration?: number
  /** Enter delay in milliseconds — the knob for staggering a list. */
  delay?: number
  /** Merge props onto the single child instead of rendering a wrapper. */
  asChild?: boolean
}

function Motion({
  className,
  preset = "fade",
  hover,
  duration,
  delay,
  asChild = false,
  style,
  ...props
}: MotionProps) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="motion"
      className={cn(motionEnter(preset), hover && motionHover(hover), className)}
      style={{ ...motionVars(duration, delay), ...style }}
      {...props}
    />
  )
}

export { Motion }
