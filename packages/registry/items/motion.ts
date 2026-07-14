import type { RegistryItem } from "../types.ts"

/**
 * Motion presets — the first entry in the Design Plus kit. Enter/exit/hover
 * recipes expressed as token-driven classes over tw-animate-css (zero runtime
 * deps). `motion` is the shared engine (the `<Motion>` primitive plus the
 * recipe maps and helpers); the `motion-*` items are thin, preconfigured
 * presets so `logic2b add motion-fade` gives you exactly one effect.
 */
export const items: RegistryItem[] = [
  {
    name: "motion",
    type: "registry:ui",
    title: "Motion",
    description:
      "Enter/exit/hover animation recipes on tokens, built on tw-animate-css (zero runtime deps). Ships the <Motion> primitive (plays an enter preset on mount, with duration/delay/hover props and asChild) plus the recipe maps and helpers (motionEnter, motionExit, motionHover) to drop the same effects onto any element or a Radix data-[state] node. Presets: fade, fade-up/down/left/right, scale, blur. Respects prefers-reduced-motion.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/motion.tsx", type: "registry:ui" }],
  },
  {
    name: "motion-fade",
    type: "registry:ui",
    title: "Motion Fade",
    description:
      "Fade a mounting element in — the preconfigured <MotionFade> preset built on the motion engine. Zero runtime deps (tw-animate-css).",
    registryDependencies: ["motion"],
    files: [{ path: "src/ui/motion-fade.tsx", type: "registry:ui" }],
  },
  {
    name: "motion-slide",
    type: "registry:ui",
    title: "Motion Slide",
    description:
      "Slide a mounting element in from a direction (up/down/left/right) while it fades — the <MotionSlide> preset built on the motion engine. Zero runtime deps (tw-animate-css).",
    registryDependencies: ["motion"],
    files: [{ path: "src/ui/motion-slide.tsx", type: "registry:ui" }],
  },
  {
    name: "motion-scale",
    type: "registry:ui",
    title: "Motion Scale",
    description:
      "Zoom a mounting element in from 95% while it fades — the <MotionScale> preset built on the motion engine. Zero runtime deps (tw-animate-css).",
    registryDependencies: ["motion"],
    files: [{ path: "src/ui/motion-scale.tsx", type: "registry:ui" }],
  },
  {
    name: "motion-blur",
    type: "registry:ui",
    title: "Motion Blur",
    description:
      "Sharpen a mounting element in from an 8px blur while it fades — the <MotionBlur> preset built on the motion engine. Zero runtime deps (tw-animate-css).",
    registryDependencies: ["motion"],
    files: [{ path: "src/ui/motion-blur.tsx", type: "registry:ui" }],
  },
  {
    name: "use-count-up",
    type: "registry:hook",
    title: "useCountUp",
    description:
      "A React hook that animates a number from 0 up to a target with an ease-out curve (requestAnimationFrame). Format the returned value with Intl.NumberFormat. Gates on a `start` flag and jumps straight to the target under prefers-reduced-motion. Powers the count-up in the animated stats block.",
    registryDependencies: [],
    files: [{ path: "src/hooks/use-count-up.ts", type: "registry:hook" }],
  },
]
