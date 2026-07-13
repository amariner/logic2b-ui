"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"

/**
 * Tags input — free-form multi-value entry rendered as removable chips.
 * Enter or comma commits the draft, paste splits on commas, Backspace on an
 * empty draft removes the last tag. Duplicates are ignored; `max` caps the
 * list.
 */

function TagsInput({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder,
  max,
  disabled,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  max?: number
  disabled?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [draft, setDraft] = React.useState("")
  const [internal, setInternal] = React.useState(defaultValue ?? [])
  const isControlled = valueProp !== undefined
  const value = isControlled ? valueProp : internal
  const setValue = (next: string[]) => {
    if (!isControlled) setInternal(next)
    onValueChange?.(next)
  }

  const atMax = max !== undefined && value.length >= max

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const tags = parts.filter((t) => !value.includes(t))
    if (tags.length > 0) {
      const next = [...value, ...tags]
      setValue(max !== undefined ? next.slice(0, max) : next)
    }
    // Consume the draft even when everything was a duplicate.
    setDraft("")
  }

  const remove = (tag: string) => setValue(value.filter((t) => t !== tag))

  return (
    <div
      data-slot="tags-input"
      data-disabled={disabled || undefined}
      className={cn(
        "border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className
      )}
      onClick={() => inputRef.current?.focus()}
      {...props}
    >
      {value.map((tag) => (
        <span
          key={tag}
          data-slot="tags-input-tag"
          className="bg-secondary text-secondary-foreground inline-flex max-w-full items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium"
        >
          <span className="truncate">{tag}</span>
          <button
            type="button"
            data-slot="tags-input-remove"
            aria-label={`Remove ${tag}`}
            tabIndex={-1}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-xs outline-none focus-visible:ring-2"
            onClick={(event) => {
              event.stopPropagation()
              remove(tag)
            }}
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        data-slot="tags-input-field"
        type="text"
        value={draft}
        disabled={disabled || atMax}
        placeholder={atMax ? undefined : placeholder}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className="placeholder:text-muted-foreground min-w-16 flex-1 bg-transparent py-0.5 outline-none disabled:cursor-not-allowed"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault()
            commit(draft)
          } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
            remove(value[value.length - 1])
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text")
          if (text.includes(",")) {
            event.preventDefault()
            commit(draft + text)
          }
        }}
        onBlur={() => commit(draft)}
      />
    </div>
  )
}

export { TagsInput }
