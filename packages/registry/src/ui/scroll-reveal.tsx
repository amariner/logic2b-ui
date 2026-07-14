"use client"

import * as React from "react"
import { Slot } from "radix-ui"

import { useInView, type UseInViewOptions } from "@/registry/hooks/use-in-view"
import { cn } from "@/registry/lib/utils"
import { motionEnter, type MotionPreset } from "@/registry/ui/motion"

/**
 * Plays a motion enter recipe when the element scrolls into view (rather than on
 * mount like `<Motion>`). Built on the `useInView` IntersectionObserver hook and
 * the motion engine's recipes, so it shares the same presets, timing and
 * prefers-reduced-motion fallback.
 *
 * SSR- and no-JS-safe: it renders visible until it has mounted and armed, so
 * search engines and scriptless clients always see the content.
 */
export interface ScrollRevealProps
  extends React.ComponentProps<"div">,
    Pick<UseInViewOptions, "once" | "amount" | "margin" | "root"> {
  /** Enter recipe to play when revealed. Default `"fade-up"`. */
  preset?: MotionPreset
  /** Reveal duration in milliseconds. Overrides the 500ms default. */
  duration?: number
  /** Reveal delay in milliseconds — the knob for staggering a group. */
  delay?: number
  /** Merge props onto the single child instead of rendering a wrapper. */
  asChild?: boolean
}

function ScrollReveal({
  className,
  preset = "fade-up",
  duration,
  delay,
  asChild = false,
  once = true,
  amount = 0.3,
  margin = "0px",
  root,
  style,
  ...props
}: ScrollRevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ once, amount, margin, root })
  const [armed, setArmed] = React.useState(false)
  React.useEffect(() => setArmed(true), [])

  const timing: React.CSSProperties = {}
  if (duration != null)
    (timing as Record<string, string>)["--tw-animation-duration"] = `${duration}ms`
  if (delay != null)
    (timing as Record<string, string>)["--tw-animation-delay"] = `${delay}ms`

  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      ref={ref}
      data-slot="scroll-reveal"
      data-in-view={inView ? "" : undefined}
      className={cn(
        inView ? motionEnter(preset) : armed ? "opacity-0" : undefined,
        className
      )}
      style={{ ...timing, ...style }}
      {...props}
    />
  )
}

export { ScrollReveal }
