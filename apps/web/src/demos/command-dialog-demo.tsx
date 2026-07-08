"use client"

import * as React from "react"
import { CalculatorIcon, CalendarIcon, SmileIcon } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/ui/command"
import { Kbd, KbdGroup } from "@/registry/ui/kbd"

export default function CommandDialogDemo() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
        Press{" "}
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>J</Kbd>
        </KbdGroup>{" "}
        or{" "}
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => setOpen(true)}
        >
          open the menu
        </button>
        .
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <CalendarIcon />
              Calendar
            </CommandItem>
            <CommandItem>
              <SmileIcon />
              Search Emoji
            </CommandItem>
            <CommandItem>
              <CalculatorIcon />
              Calculator
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
