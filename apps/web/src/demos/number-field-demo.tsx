"use client"

import * as React from "react"

import { NumberField } from "@/registry/ui/number-field"

export default function NumberFieldDemo() {
  const [value, setValue] = React.useState(3)

  return (
    <div className="flex flex-col items-center gap-3">
      <NumberField
        value={value}
        onValueChange={setValue}
        min={0}
        max={10}
        aria-label="Quantity"
      />
      <p className="text-muted-foreground text-sm">Quantity: {value} / 10</p>
    </div>
  )
}
