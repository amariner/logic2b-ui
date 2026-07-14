"use client"

import { Motion, type MotionProps } from "@/registry/ui/motion"

export type MotionBlurProps = Omit<MotionProps, "preset">

/** Sharpen a mounting element in from an 8px blur. Preconfigured
 *  `<Motion preset="blur">`. */
function MotionBlur(props: MotionBlurProps) {
  return <Motion preset="blur" {...props} />
}

export { MotionBlur }
