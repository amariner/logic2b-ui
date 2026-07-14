"use client"

import * as React from "react"

import { cn } from "@/registry/lib/utils"

/**
 * A scroll-linked parallax layer for marketing sections: the inner layer drifts
 * as the section passes through the viewport, driven entirely by CSS
 * scroll-driven animations (`animation-timeline: view()`). Zero JS on the scroll
 * path and zero runtime deps.
 *
 * Guarded by `@supports (animation-timeline: view())`, so browsers without
 * scroll-driven animations render the layer static — the content is always
 * visible, the motion is pure progressive enhancement.
 *
 * The container is position-relative with `overflow-clip`; give it a height
 * (e.g. `className="h-72"`). Put an oversized, `object-cover` image or a
 * gradient inside — the layer is intentionally taller than the container so the
 * drift never reveals an edge.
 */
const PARALLAX_CSS = `
@supports (animation-timeline: view()) {
  @keyframes l2b-parallax {
    from { transform: translateY(calc(var(--l2b-parallax-range, 12%) * -1)); }
    to { transform: translateY(var(--l2b-parallax-range, 12%)); }
  }
  [data-slot="parallax-layer"] {
    animation: l2b-parallax linear both;
    animation-timeline: view(block);
    will-change: transform;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-slot="parallax-layer"] { animation: none; }
  }
}
`

export interface ParallaxProps extends React.ComponentProps<"div"> {
  /** How far the layer drifts, any CSS length/percentage. Default `"12%"`. */
  range?: string
}

function Parallax({ className, range = "12%", children, ...props }: ParallaxProps) {
  const layerStyle = {
    "--l2b-parallax-range": range,
    top: `calc(${range} * -1)`,
    bottom: `calc(${range} * -1)`,
  } as React.CSSProperties

  return (
    <div className={cn("relative overflow-clip", className)} {...props}>
      <style>{PARALLAX_CSS}</style>
      <div
        data-slot="parallax-layer"
        className="absolute inset-x-0"
        style={layerStyle}
      >
        {children}
      </div>
    </div>
  )
}

export { Parallax }
