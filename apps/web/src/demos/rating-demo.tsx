"use client"

import * as React from "react"

import { Rating } from "@/registry/ui/rating"

export default function RatingDemo() {
  const [value, setValue] = React.useState(3)

  return (
    <div className="flex flex-col items-center gap-2">
      <Rating value={value} onValueChange={setValue} aria-label="Rate this" />
      <p className="text-muted-foreground text-sm">
        {value > 0 ? `${value} out of 5` : "Not rated yet"}
      </p>
    </div>
  )
}
