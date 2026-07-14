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
      {/* Desktop: a visible search field (like the reference docs sites);
          mobile: the compact icon. Both open the same ⌘K dialog. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        title="Search (⌘K)"
        className="hidden h-8 w-56 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground md:inline-flex lg:w-64"
      >
        <SearchIcon className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-left text-xs">
          Search documentation...
        </span>
        <kbd className="pointer-events-none flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        title="Search (⌘K)"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
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
