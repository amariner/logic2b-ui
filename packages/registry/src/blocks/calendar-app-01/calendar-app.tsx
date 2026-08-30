"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Avatar, AvatarFallback } from "@/registry/ui/avatar"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { Separator } from "@/registry/ui/separator"

type CalendarName = "Product" | "Design" | "Personal"
type CalendarEvent = {
  id: string
  date: string
  time: string
  end: string
  title: string
  calendar: CalendarName
  owner: string
  initials: string
  description: string
}

const EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    date: "2026-09-03",
    time: "09:30",
    end: "10:15",
    title: "Product planning",
    calendar: "Product",
    owner: "Maya Chen",
    initials: "MC",
    description: "Prioritize the October roadmap and confirm owners for the launch follow-ups.",
  },
  {
    id: "e2",
    date: "2026-09-03",
    time: "14:00",
    end: "14:45",
    title: "Design critique",
    calendar: "Design",
    owner: "Noah Williams",
    initials: "NW",
    description: "Review the updated navigation patterns and responsive component states.",
  },
  {
    id: "e3",
    date: "2026-09-08",
    time: "11:00",
    end: "11:30",
    title: "Research readout",
    calendar: "Design",
    owner: "Ava Patel",
    initials: "AP",
    description: "Share the findings from the latest onboarding usability sessions.",
  },
  {
    id: "e4",
    date: "2026-09-11",
    time: "16:00",
    end: "17:00",
    title: "Platform demo",
    calendar: "Product",
    owner: "Liam Johnson",
    initials: "LJ",
    description: "Walk through registry versioning, generated starters and the new release gates.",
  },
  {
    id: "e5",
    date: "2026-09-16",
    time: "10:00",
    end: "10:30",
    title: "Weekly sync",
    calendar: "Product",
    owner: "Maya Chen",
    initials: "MC",
    description: "A short cross-functional check-in on risks, decisions and delivery confidence.",
  },
  {
    id: "e6",
    date: "2026-09-22",
    time: "13:00",
    end: "14:00",
    title: "Lunch with Jordan",
    calendar: "Personal",
    owner: "Alex Morgan",
    initials: "AM",
    description: "Catch up over lunch near the studio.",
  },
  {
    id: "e7",
    date: "2026-09-28",
    time: "15:30",
    end: "16:15",
    title: "Launch retrospective",
    calendar: "Product",
    owner: "Noah Williams",
    initials: "NW",
    description: "Capture what worked, what slowed us down and what to change for the next release.",
  },
]

const CALENDARS: CalendarName[] = ["Product", "Design", "Personal"]
const CATEGORY_STYLE: Record<CalendarName, string> = {
  Product: "border-transparent bg-primary text-primary-foreground",
  Design: "border-transparent bg-secondary text-secondary-foreground",
  Personal: "border-border bg-background text-foreground",
}
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function monthGrid(offset: number) {
  const first = new Date(2026, 8 + offset, 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset)
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  )
}

function longDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export function CalendarApp({ className, ...props }: React.ComponentProps<"div">) {
  const [monthOffset, setMonthOffset] = React.useState(0)
  const [activeCalendars, setActiveCalendars] = React.useState(
    () => new Set<CalendarName>(CALENDARS)
  )
  const [selectedId, setSelectedId] = React.useState("e1")

  const days = monthGrid(monthOffset)
  const currentMonth = new Date(2026, 8 + monthOffset, 1)
  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
  const visibleEvents = EVENTS.filter((event) => activeCalendars.has(event.calendar))
  const selected = visibleEvents.find((event) => event.id === selectedId)

  function toggleCalendar(name: CalendarName) {
    setActiveCalendars((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div
      className={cn(
        "mx-auto grid h-[700px] w-full max-w-[1400px] overflow-hidden border bg-background lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_260px]",
        className
      )}
      {...props}
    >
      <aside className="hidden border-r p-4 lg:flex lg:flex-col" aria-label="Calendar filters">
        <Button className="mb-6 w-full justify-start">
          <PlusIcon className="size-4" />
          New event
        </Button>
        <h2 className="mb-2 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          My calendars
        </h2>
        <div className="space-y-1">
          {CALENDARS.map((name) => {
            const count = EVENTS.filter((event) => event.calendar === name).length
            return (
              <Button
                key={name}
                variant="ghost"
                className="w-full justify-start"
                aria-pressed={activeCalendars.has(name)}
                onClick={() => toggleCalendar(name)}
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full border",
                    CATEGORY_STYLE[name]
                  )}
                  aria-hidden="true"
                />
                {name}
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {count}
                </span>
              </Button>
            )
          })}
        </div>
        <div className="mt-auto rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-medium">Working hours</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Monday–Friday · 09:00–18:00
          </p>
          <Button variant="link" className="mt-1 h-auto px-0 text-xs">
            Edit availability
          </Button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col">
        <header className="flex min-h-16 flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
          <div className="mr-auto">
            <h1 className="font-heading text-xl font-semibold">{monthLabel}</h1>
            <p className="text-xs text-muted-foreground">Team calendar</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => setMonthOffset((value) => value - 1)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setMonthOffset(0)}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => setMonthOffset((value) => value + 1)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="More calendar options">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </header>

        <div
          className="min-h-0 flex-1 overflow-auto"
          role="region"
          aria-label={`${monthLabel} month grid`}
          tabIndex={0}
        >
          <table className="h-full min-w-[720px] w-full table-fixed border-collapse">
            <caption className="sr-only">{monthLabel} calendar</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((weekday) => (
                  <th
                    key={weekday}
                    scope="col"
                    className="h-9 border-b border-r px-2 text-right text-xs font-medium text-muted-foreground last:border-r-0"
                  >
                    {weekday}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, week) => (
                <tr key={week}>
                  {days.slice(week * 7, week * 7 + 7).map((date) => {
                    const key = dateKey(date)
                    const inMonth = date.getMonth() === currentMonth.getMonth()
                    const events = visibleEvents.filter((event) => event.date === key)
                    return (
                      <td
                        key={key}
                        className={cn(
                          "h-[102px] border-r border-b p-1.5 align-top last:border-r-0",
                          !inMonth && "bg-muted/25 text-muted-foreground"
                        )}
                      >
                        <time
                          dateTime={key}
                          className="ml-auto grid size-6 place-items-center text-xs tabular-nums"
                        >
                          {date.getDate()}
                        </time>
                        <div className="mt-1 space-y-1">
                          {events.map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => setSelectedId(event.id)}
                              className={cn(
                                "block w-full truncate rounded border px-1.5 py-1 text-left text-[11px] font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                CATEGORY_STYLE[event.calendar],
                                selected?.id === event.id && "ring-2 ring-ring"
                              )}
                              aria-label={`${event.title}, ${event.time}, ${longDate(event.date)}`}
                            >
                              <span className="mr-1 tabular-nums opacity-70">{event.time}</span>
                              {event.title}
                            </button>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <aside className="hidden border-l p-5 xl:block" aria-label="Event details">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-semibold">Event details</h2>
            <p className="text-xs text-muted-foreground">Selected event</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="More event options">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </div>
        <Separator className="my-5" />
        {selected ? (
          <div>
            <Badge className={CATEGORY_STYLE[selected.calendar]}>{selected.calendar}</Badge>
            <h3 className="mt-4 text-lg font-semibold leading-snug">{selected.title}</h3>
            <p className="mt-2 text-sm font-medium">{longDate(selected.date)}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {selected.time}–{selected.end}
            </p>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              {selected.description}
            </p>
            <Separator className="my-5" />
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{selected.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{selected.owner}</p>
                <p className="text-xs text-muted-foreground">Organizer</p>
              </div>
            </div>
            <Button variant="outline" className="mt-6 w-full">
              Open event
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a visible event to inspect its schedule and owner.
          </p>
        )}
      </aside>
    </div>
  )
}
