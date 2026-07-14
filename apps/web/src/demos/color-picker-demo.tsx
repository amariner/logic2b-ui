"use client"

import * as React from "react"

import { ColorPicker } from "@/registry/ui/color-picker"

export default function ColorPickerDemo() {
  const [color, setColor] = React.useState("#3b82f6")

  return (
    <div className="flex flex-col items-center gap-3">
      <ColorPicker value={color} onValueChange={setColor} />
      <p className="text-muted-foreground font-mono text-sm uppercase">
        {color}
      </p>
    </div>
  )
}
