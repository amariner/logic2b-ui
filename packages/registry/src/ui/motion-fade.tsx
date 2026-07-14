"use client"

import { Motion, type MotionProps } from "@/registry/ui/motion"

export type MotionFadeProps = Omit<MotionProps, "preset">

/** Fade a mounting element in. Preconfigured `<Motion preset="fade">`. */
function MotionFade(props: MotionFadeProps) {
  return <Motion preset="fade" {...props} />
}

export { MotionFade }
