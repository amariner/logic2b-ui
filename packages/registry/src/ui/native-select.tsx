import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/registry/lib/utils"

const nativeSelectVariants = cva(
  "border-input dark:bg-input/30 dark:hover:bg-input/50 has-[select:disabled]:pointer-events-none has-[select:disabled]:opacity-50 relative flex w-fit items-center rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] outline-none",
  {
    variants: {
      size: {
        sm: "h-8",
        default: "h-9",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function NativeSelect({
  className,
  size,
  disabled,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<"select"> & VariantProps<typeof nativeSelectVariants>) {
  return (
    <div
      data-slot="native-select"
      data-disabled={disabled ? "" : undefined}
      className={cn(
        nativeSelectVariants({ size }),
        "has-[select:focus-visible]:border-ring has-[select:focus-visible]:ring-ring/50 has-[select:focus-visible]:ring-[3px]",
        ariaInvalid &&
          "border-destructive ring-destructive/20 dark:ring-destructive/40",
        className
      )}
    >
      <select
        data-slot="native-select-control"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className="text-foreground w-full appearance-none bg-transparent py-1 pr-8 pl-3 text-sm outline-none disabled:cursor-not-allowed"
        {...props}
      />
      <ChevronDownIcon className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 opacity-50" />
    </div>
  )
}

export { NativeSelect }
