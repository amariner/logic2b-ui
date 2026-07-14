"use client"

import { Motion, type MotionProps } from "@/registry/ui/motion"

export type MotionScaleProps = Omit<MotionProps, "preset">

/** Zoom a mounting element in from 95%. Preconfigured `<Motion preset="scale">`. */
function MotionScale(props: MotionScaleProps) {
  return <Motion preset="scale" {...props} />
}

export { MotionScale }
