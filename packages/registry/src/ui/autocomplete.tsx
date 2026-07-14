"use client"

import * as React from "react"

import { cn } from "@/registry/lib/utils"

export interface AutocompleteProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "onChange"
  > {
  /** The suggestion list, filtered against what the user types. */
  options: string[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Shown when nothing matches. Default `"No results."`. */
  emptyMessage?: string
}

/**
 * A free-text input with a filtered suggestion list — the editable ARIA
 * combobox pattern. Unlike a select-style combobox it accepts arbitrary text;
 * the list just offers matches. Fully keyboard-driven (↑/↓ to move, Enter to
 * pick, Esc to close) and dependency-free.
 */
function Autocomplete({
  className,
  options,
  value,
  defaultValue,
  onValueChange,
  emptyMessage = "No results.",
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: AutocompleteProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const query = isControlled ? (value as string) : internal
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const reactId = React.useId()
  const listId = `${reactId}-list`

  const filtered = React.useMemo(
    () =>
      options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  )

  const setQuery = (v: string) => {
    if (!isControlled) setInternal(v)
    onValueChange?.(v)
  }

  const choose = (v: string) => {
    setQuery(v)
    setOpen(false)
    setActive(-1)
  }

  return (
    <div data-slot="autocomplete" className={cn("relative", className)}>
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 ? `${reactId}-opt-${active}` : undefined
        }
        data-slot="autocomplete-input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={(e) => {
          setOpen(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setOpen(false)
          onBlur?.(e)
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, filtered.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === "Enter" && open && active >= 0) {
            e.preventDefault()
            choose(filtered[active])
          } else if (e.key === "Escape") {
            setOpen(false)
            setActive(-1)
          }
        }}
        className={cn(
          "border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        )}
        {...props}
      />
      {open && (
        <ul
          role="listbox"
          id={listId}
          data-slot="autocomplete-list"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border p-1 shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="text-muted-foreground px-2 py-1.5 text-sm">
              {emptyMessage}
            </li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt}
                id={`${reactId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                data-slot="autocomplete-option"
                onMouseDown={(e) => {
                  // Keep focus on the input so onBlur doesn't close before the pick.
                  e.preventDefault()
                  choose(opt)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none",
                  i === active && "bg-accent text-accent-foreground"
                )}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export { Autocomplete }
