import * as React from "react"

import { cn } from "@/registry/lib/utils"

/**
 * A vertical timeline for activity feeds, changelogs and process histories.
 * Composable: each `TimelineItem` holds a `TimelineIndicator` (the dot + the
 * connector line to the next item) and a `TimelineContent`. The connector is
 * hidden on the last item automatically.
 */
function Timeline({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="timeline"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function TimelineItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="timeline-item"
      className={cn("relative flex gap-4 pb-8 last:pb-0", className)}
      {...props}
    />
  )
}

function TimelineIndicator({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-indicator"
      className={cn("relative flex flex-col items-center", className)}
      {...props}
    >
      {children ?? (
        <span className="border-primary bg-background z-10 mt-1 size-3 shrink-0 rounded-full border-2" />
      )}
      {/* Connector: fills the gap down to the next item; hidden on the last. */}
      <span className="bg-border mt-1 w-px flex-1 [li:last-child_&]:hidden" />
    </div>
  )
}

function TimelineContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-content"
      className={cn("flex-1 pt-0.5", className)}
      {...props}
    />
  )
}

function TimelineTime({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="timeline-time"
      className={cn(
        "text-muted-foreground text-xs font-medium tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function TimelineTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="timeline-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function TimelineDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="timeline-description"
      className={cn("text-muted-foreground mt-1 text-sm", className)}
      {...props}
    />
  )
}

export {
  Timeline,
  TimelineItem,
  TimelineIndicator,
  TimelineContent,
  TimelineTime,
  TimelineTitle,
  TimelineDescription,
}
