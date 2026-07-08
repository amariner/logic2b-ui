import * as React from "react"
import { type DateRange } from "react-day-picker"

import { Calendar } from "@/registry/ui/calendar"

export default function CalendarRangeDemo() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: undefined,
  })

  return (
    <Calendar
      mode="range"
      selected={range}
      onSelect={setRange}
      numberOfMonths={2}
      className="rounded-md border"
    />
  )
}
