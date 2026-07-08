"use client"

import * as React from "react"

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/registry/ui/context-menu"

export default function ContextMenuCheckboxDemo() {
  const [showBookmarks, setShowBookmarks] = React.useState(true)
  const [showUrls, setShowUrls] = React.useState(false)
  const [position, setPosition] = React.useState("bottom")

  return (
    <ContextMenu>
      <ContextMenuTrigger className="border-input flex h-32 w-full max-w-sm items-center justify-center rounded-md border border-dashed text-sm">
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuCheckboxItem
          checked={showBookmarks}
          onCheckedChange={setShowBookmarks}
        >
          Show Bookmarks
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={showUrls}
          onCheckedChange={setShowUrls}
        >
          Show Full URLs
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuLabel inset>Panel Position</ContextMenuLabel>
        <ContextMenuRadioGroup value={position} onValueChange={setPosition}>
          <ContextMenuRadioItem value="top">Top</ContextMenuRadioItem>
          <ContextMenuRadioItem value="bottom">Bottom</ContextMenuRadioItem>
          <ContextMenuRadioItem value="right">Right</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
