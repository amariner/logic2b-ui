"use client"

import * as React from "react"
import { StarIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"

/**
 * Rating — a star (or custom icon) rating following the radio-group
 * pattern: each star is a radio, arrows move the value, hover previews it.
 * `readOnly` renders a static, labelled image instead.
 */

function Rating({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  max = 5,
  readOnly = false,
  disabled = false,
  icon,
  "aria-label": ariaLabel = "Rating",
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  max?: number
  readOnly?: boolean
  disabled?: boolean
  icon?: React.ReactNode
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? 0)
  const [hovered, setHovered] = React.useState(0)
  const isControlled = valueProp !== undefined
  const value = isControlled ? valueProp : internal
  const setValue = (next: number) => {
    if (!isControlled) setInternal(next)
    onValueChange?.(next)
  }

  const shown = hovered || value
  const interactive = !readOnly && !disabled

  const star = (n: number, active: boolean) => (
    <span
      data-slot="rating-icon"
      data-state={active ? "active" : "inactive"}
      className={cn(
        "transition-colors [&_svg]:size-5",
        active
          ? "text-primary [&_svg]:fill-current"
          : "text-muted-foreground/40"
      )}
    >
      {icon ?? <StarIcon />}
    </span>
  )

  if (readOnly) {
    return (
      <div
        role="img"
        data-slot="rating"
        aria-label={`${ariaLabel}: ${value} out of ${max}`}
        className={cn("flex items-center gap-0.5", className)}
        {...props}
      >
        {Array.from({ length: max }, (_, i) => (
          <React.Fragment key={i}>{star(i + 1, i + 1 <= value)}</React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      data-slot="rating"
      aria-label={ariaLabel}
      data-disabled={disabled || undefined}
      className={cn(
        "flex items-center gap-0.5",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onMouseLeave={() => setHovered(0)}
      onKeyDown={(event) => {
        if (!interactive) return
        let next: number | null = null
        if (event.key === "ArrowRight" || event.key === "ArrowUp")
          next = Math.min(value + 1, max)
        if (event.key === "ArrowLeft" || event.key === "ArrowDown")
          next = Math.max(value - 1, 0)
        if (event.key === "Home") next = 1
        if (event.key === "End") next = max
        if (next === null) return
        event.preventDefault()
        setValue(next)
        const radios = event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')
        radios[Math.max(next - 1, 0)]?.focus()
      }}
      {...props}
    >
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1
        return (
          <button
            key={n}
            type="button"
            role="radio"
            data-slot="rating-item"
            aria-checked={value === n}
            aria-label={`${n} out of ${max}`}
            disabled={disabled}
            tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
            className="focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
            onClick={() => setValue(value === n ? 0 : n)}
            onMouseEnter={() => setHovered(n)}
          >
            {star(n, n <= shown)}
          </button>
        )
      })}
    </div>
  )
}

export { Rating }
