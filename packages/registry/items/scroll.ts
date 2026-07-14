import type { RegistryItem } from "../types.ts"

/**
 * Scroll & parallax recipes — the scroll-linked lane of the Design Plus kit.
 * `scroll-reveal` plays the motion engine's enter recipes when an element
 * scrolls into view (IntersectionObserver); `parallax` drives a marketing-image
 * drift purely with CSS scroll-driven animations, with an `@supports` fallback.
 */
export const items: RegistryItem[] = [
  {
    name: "use-in-view",
    type: "registry:hook",
    title: "useInView",
    description:
      "A React hook that tracks whether an element is scrolled into view via IntersectionObserver. Returns [ref, inView] with `once`, `amount` (threshold), `margin` (rootMargin) and a `root` scroll-container option. Falls back to visible when IntersectionObserver is unavailable. Powers scroll-reveal.",
    registryDependencies: [],
    files: [{ path: "src/hooks/use-in-view.ts", type: "registry:hook" }],
  },
  {
    name: "scroll-reveal",
    type: "registry:ui",
    title: "Scroll Reveal",
    description:
      "Plays a motion enter recipe when the element scrolls into view instead of on mount. Shares the motion engine's presets (fade, fade-up/down/left/right, scale, blur), timing (duration/delay) and prefers-reduced-motion fallback, with once/amount/margin/root controls from useInView. SSR- and no-JS-safe: renders visible until armed. Supports asChild.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils", "motion", "use-in-view"],
    files: [{ path: "src/ui/scroll-reveal.tsx", type: "registry:ui" }],
  },
  {
    name: "parallax",
    type: "registry:ui",
    title: "Parallax",
    description:
      "A scroll-linked parallax layer for marketing sections: the inner layer drifts as the section passes through the viewport, driven entirely by CSS scroll-driven animations (animation-timeline: view()). Zero JS on the scroll path, zero runtime deps, and guarded by @supports so unsupported browsers render it static. Give the container a height and put an oversized object-cover image or gradient inside.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/parallax.tsx", type: "registry:ui" }],
  },
]
