import * as React from "react"

import { Calendar } from "@/registry/ui/calendar"

export default function CalendarDropdownDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      captionLayout="dropdown"
      className="rounded-md border"
    />
  )
}
