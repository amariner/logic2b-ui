"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"

/**
 * Stepper — a multi-step progress indicator for wizards and onboarding
 * flows. Steps derive their state (completed / active / upcoming) from the
 * root value; the active step carries aria-current="step".
 */

interface StepperContextValue {
  value: number
  setValue: (step: number) => void
  orientation: "horizontal" | "vertical"
}

const StepperContext = React.createContext<StepperContextValue | null>(null)
const StepItemContext = React.createContext<{
  step: number
  state: "completed" | "active" | "upcoming"
  disabled: boolean
} | null>(null)

function useStepper() {
  const ctx = React.useContext(StepperContext)
  if (!ctx) throw new Error("Stepper parts must be used within a Stepper.")
  return ctx
}

function useStepItem() {
  const ctx = React.useContext(StepItemContext)
  if (!ctx) throw new Error("StepperItem parts must be used within a StepperItem.")
  return ctx
}

function Stepper({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  ...props
}: Omit<React.ComponentProps<"ol">, "defaultValue"> & {
  value?: number
  defaultValue?: number
  onValueChange?: (step: number) => void
  orientation?: "horizontal" | "vertical"
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? 1)
  const isControlled = valueProp !== undefined
  const value = isControlled ? valueProp : internal
  const setValue = React.useCallback(
    (step: number) => {
      if (!isControlled) setInternal(step)
      onValueChange?.(step)
    },
    [isControlled, onValueChange]
  )

  return (
    <StepperContext.Provider value={{ value, setValue, orientation }}>
      <ol
        data-slot="stepper"
        data-orientation={orientation}
        className={cn(
          "group/stepper flex",
          orientation === "horizontal"
            ? "w-full flex-row items-center"
            : "flex-col",
          className
        )}
        {...props}
      />
    </StepperContext.Provider>
  )
}

function StepperItem({
  className,
  step,
  disabled = false,
  ...props
}: React.ComponentProps<"li"> & {
  step: number
  disabled?: boolean
}) {
  const { value, orientation } = useStepper()
  const state =
    step < value ? "completed" : step === value ? "active" : "upcoming"

  return (
    <StepItemContext.Provider value={{ step, state, disabled }}>
      <li
        data-slot="stepper-item"
        data-state={state}
        aria-current={state === "active" ? "step" : undefined}
        className={cn(
          "group/stepper-item relative flex items-center gap-2",
          orientation === "horizontal"
            ? "flex-1 not-last:pr-2"
            : "w-full flex-col items-start not-last:pb-2 [&:not(:last-child)]:min-h-16",
          className
        )}
        {...props}
      />
    </StepItemContext.Provider>
  )
}

function StepperTrigger({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { setValue } = useStepper()
  const { step, disabled } = useStepItem()
  return (
    <button
      type="button"
      data-slot="stepper-trigger"
      disabled={disabled}
      onClick={() => setValue(step)}
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex items-center gap-3 rounded-md text-left outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function StepperIndicator({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  const { step, state } = useStepItem()
  return (
    <span
      data-slot="stepper-indicator"
      data-state={state}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
        state === "completed" && "bg-primary text-primary-foreground",
        state === "active" && "bg-primary text-primary-foreground ring-primary/20 ring-4",
        state === "upcoming" && "bg-muted text-muted-foreground",
        className
      )}
      {...props}
    >
      {children ??
        (state === "completed" ? <CheckIcon className="size-3.5" /> : step)}
    </span>
  )
}

function StepperTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stepper-title"
      className={cn("text-sm leading-tight font-medium", className)}
      {...props}
    />
  )
}

function StepperDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stepper-description"
      className={cn("text-muted-foreground text-xs leading-tight", className)}
      {...props}
    />
  )
}

function StepperSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { orientation } = useStepper()
  const { state } = useStepItem()
  return (
    <div
      data-slot="stepper-separator"
      data-state={state}
      aria-hidden="true"
      className={cn(
        "bg-border transition-colors",
        state === "completed" && "bg-primary",
        orientation === "horizontal"
          ? "mx-2 h-px flex-1"
          : "absolute top-8 left-3 h-[calc(100%-2.5rem)] w-px -translate-x-1/2",
        className
      )}
      {...props}
    />
  )
}

export {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperDescription,
  StepperSeparator,
}
