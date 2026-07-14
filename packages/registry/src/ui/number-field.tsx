"use client"

import * as React from "react"
import { MinusIcon, PlusIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"

export interface NumberFieldProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "onChange" | "type"
  > {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
}

/**
 * A numeric input with decrement/increment steppers, min/max clamping and step.
 * Controlled via `value`/`onValueChange` or uncontrolled via `defaultValue`.
 * Renders a real `<input type="number">` so native form submission and keyboard
 * work; the native spinners are hidden in favor of the styled buttons.
 */
function NumberField({
  className,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 1,
  disabled,
  ...props
}: NumberFieldProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(defaultValue ?? 0)
  const current = isControlled ? (value as number) : internal

  const clamp = (n: number) => {
    if (min !== undefined) n = Math.max(min, n)
    if (max !== undefined) n = Math.min(max, n)
    return n
  }

  const commit = (n: number) => {
    const next = Number.isNaN(n) ? NaN : clamp(n)
    if (!isControlled) setInternal(next)
    onValueChange?.(next)
  }

  const stepBy = (direction: 1 | -1) => {
    const base = Number.isNaN(current) ? (min ?? 0) : current
    // Trim floating-point noise from repeated steps (0.1 + 0.2 …).
    const raw = base + direction * step
    commit(Math.round((raw + Number.EPSILON) * 1e6) / 1e6)
  }

  const atMin = min !== undefined && !Number.isNaN(current) && current <= min
  const atMax = max !== undefined && !Number.isNaN(current) && current >= max

  const buttonClass =
    "flex h-full aspect-square items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:text-foreground outline-none"

  return (
    <div
      data-slot="number-field"
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/50 inline-flex h-9 items-center rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
    >
      <button
        type="button"
        data-slot="number-field-decrement"
        aria-label="Decrement"
        tabIndex={-1}
        disabled={disabled || atMin}
        onClick={() => stepBy(-1)}
        className={cn(buttonClass, "border-r")}
      >
        <MinusIcon className="size-4" />
      </button>
      <input
        type="number"
        inputMode="decimal"
        data-slot="number-field-input"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(current) ? "" : current}
        onChange={(e) =>
          commit(e.target.value === "" ? NaN : Number(e.target.value))
        }
        className={cn(
          "h-full w-16 min-w-0 bg-transparent text-center text-sm tabular-nums outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        )}
        {...props}
      />
      <button
        type="button"
        data-slot="number-field-increment"
        aria-label="Increment"
        tabIndex={-1}
        disabled={disabled || atMax}
        onClick={() => stepBy(1)}
        className={cn(buttonClass, "border-l")}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  )
}

export { NumberField }
