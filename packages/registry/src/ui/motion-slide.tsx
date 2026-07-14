"use client"

import { Motion, type MotionPreset, type MotionProps } from "@/registry/ui/motion"

export type MotionSlideDirection = "up" | "down" | "left" | "right"

export interface MotionSlideProps extends Omit<MotionProps, "preset"> {
  /** Direction the element travels from as it fades in. Default `"up"`. */
  direction?: MotionSlideDirection
}

const presetFor: Record<MotionSlideDirection, MotionPreset> = {
  up: "fade-up",
  down: "fade-down",
  left: "fade-left",
  right: "fade-right",
}

/** Slide a mounting element in from a direction while it fades. */
function MotionSlide({ direction = "up", ...props }: MotionSlideProps) {
  return <Motion preset={presetFor[direction]} {...props} />
}

export { MotionSlide }
