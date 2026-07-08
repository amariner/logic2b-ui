"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import {
  Group as ResizablePanelGroupPrimitive,
  Panel as ResizablePanelPrimitive,
  Separator as ResizableSeparatorPrimitive,
} from "react-resizable-panels"

import { cn } from "@/registry/lib/utils"

const ResizableDirectionContext = React.createContext<
  "horizontal" | "vertical"
>("horizontal")

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  ...props
}: React.ComponentProps<typeof ResizablePanelGroupPrimitive> & {
  direction?: "horizontal" | "vertical"
}) {
  return (
    <ResizableDirectionContext.Provider value={direction}>
      <ResizablePanelGroupPrimitive
        data-slot="resizable-panel-group"
        orientation={direction}
        className={cn(
          "flex h-full w-full",
          direction === "vertical" && "flex-col",
          className
        )}
        {...props}
      />
    </ResizableDirectionContext.Provider>
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePanelPrimitive>) {
  return <ResizablePanelPrimitive data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizableSeparatorPrimitive> & {
  withHandle?: boolean
}) {
  const direction = React.useContext(ResizableDirectionContext)
  const isVertical = direction === "vertical"

  return (
    <ResizableSeparatorPrimitive
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex items-center justify-center after:absolute focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
        isVertical
          ? "h-px w-full after:inset-x-0 after:top-1/2 after:h-1 after:-translate-y-1/2 after:translate-x-0"
          : "w-px after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "bg-border z-10 flex items-center justify-center rounded-xs border",
            isVertical ? "h-3 w-4 rotate-90" : "h-4 w-3"
          )}
        >
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizableSeparatorPrimitive>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
