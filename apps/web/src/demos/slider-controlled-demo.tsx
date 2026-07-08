import * as React from "react"

import { Label } from "@/registry/ui/label"
import { Slider } from "@/registry/ui/slider"

export default function SliderControlledDemo() {
  const [value, setValue] = React.useState([40])

  return (
    <div className="flex w-[60%] flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="volume">Volume</Label>
        <span className="text-muted-foreground text-sm tabular-nums">
          {value[0]}
        </span>
      </div>
      <Slider
        id="volume"
        value={value}
        onValueChange={setValue}
        max={100}
        step={5}
      />
    </div>
  )
}
