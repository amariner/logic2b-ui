"use client"

import * as React from "react"

export interface UseInViewOptions {
  /** Stop observing after the first time the element enters view. Default `true`. */
  once?: boolean
  /** Fraction of the element that must be visible to count as in view (0–1).
   *  Default `0.3`. */
  amount?: number
  /** IntersectionObserver `rootMargin`, e.g. `"-10% 0px"`. Default `"0px"`. */
  margin?: string
  /** Scroll container to observe within. Defaults to the viewport. */
  root?: React.RefObject<Element | null>
}

/**
 * Tracks whether the referenced element is scrolled into view, via
 * IntersectionObserver. Returns `[ref, inView]`. Falls back to `true` when
 * IntersectionObserver is unavailable (old browsers / SSR consumers) so content
 * is never trapped hidden.
 */
export function useInView<T extends Element = HTMLDivElement>(
  options: UseInViewOptions = {}
): [React.RefObject<T | null>, boolean] {
  const { once = true, amount = 0.3, margin = "0px", root } = options
  const ref = React.useRef<T>(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold: amount, rootMargin: margin, root: root?.current ?? null }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once, amount, margin, root])

  return [ref, inView]
}
