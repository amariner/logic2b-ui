"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/ui/command"
import type { SearchIndexItem } from "@/lib/search-index"

export function CommandMenu({ items }: { items: SearchIndexItem[] }) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const groups = React.useMemo(() => {
    const byGroup = new Map<string, SearchIndexItem[]>()
    for (const item of items) {
      const list = byGroup.get(item.group) ?? []
      list.push(item)
      byGroup.set(item.group, list)
    }
    return [...byGroup.entries()]
  }, [items])

  function onSelect(url: string) {
    setOpen(false)
    window.location.href = url
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        title="Search (⌘K)"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <SearchIcon className="size-4" />
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search docs"
        description="Search components and documentation"
      >
        <CommandInput placeholder="Search docs and components..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groups.map(([group, groupItems]) => (
            <CommandGroup key={group} heading={group}>
              {groupItems.map((item) => (
                <CommandItem
                  key={item.url}
                  value={`${item.title} ${item.description}`}
                  onSelect={() => onSelect(item.url)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
