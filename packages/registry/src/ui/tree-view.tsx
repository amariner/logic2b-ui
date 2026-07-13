"use client"

import * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"

/**
 * Tree view — WAI-ARIA tree pattern, hand-rolled (no Radix primitive exists).
 * Branch/leaf is inferred from children; expansion and selection are
 * controllable. Keyboard: arrows move through visible items, right/left
 * expand/collapse (left also jumps to the parent), Home/End, Enter/Space
 * select.
 */

function useControllableState<T>(
  prop: T | undefined,
  defaultProp: T,
  onChange?: (value: T) => void
) {
  const [state, setState] = React.useState(defaultProp)
  const isControlled = prop !== undefined
  const value = isControlled ? prop : state
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setState(next)
      onChange?.(next)
    },
    [isControlled, onChange]
  )
  return [value, set] as const
}

interface TreeViewContextValue {
  expanded: string[]
  toggle: (value: string) => void
  selected: string | null
  select: (value: string) => void
}

const TreeViewContext = React.createContext<TreeViewContextValue | null>(null)
const TreeLevelContext = React.createContext(1)

function useTreeView() {
  const ctx = React.useContext(TreeViewContext)
  if (!ctx) throw new Error("TreeItem must be used within a TreeView.")
  return ctx
}

const visibleItems = (tree: HTMLElement) =>
  Array.from(
    tree.querySelectorAll<HTMLElement>(
      '[role="treeitem"]:not([aria-disabled="true"])'
    )
  )

function TreeView({
  className,
  children,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  ...props
}: Omit<React.ComponentProps<"ul">, "onSelect"> & {
  expanded?: string[]
  defaultExpanded?: string[]
  onExpandedChange?: (expanded: string[]) => void
  selected?: string | null
  defaultSelected?: string | null
  onSelectedChange?: (selected: string | null) => void
}) {
  const ref = React.useRef<HTMLUListElement>(null)
  const [hasFocusWithin, setHasFocusWithin] = React.useState(false)
  const [expanded, setExpanded] = useControllableState(
    expandedProp,
    defaultExpanded ?? [],
    onExpandedChange
  )
  const [selected, setSelected] = useControllableState<string | null>(
    selectedProp,
    defaultSelected ?? null,
    onSelectedChange
  )

  const toggle = React.useCallback(
    (value: string) =>
      setExpanded(
        expanded.includes(value)
          ? expanded.filter((v) => v !== value)
          : [...expanded, value]
      ),
    [expanded, setExpanded]
  )

  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(
      '[role="treeitem"]'
    )
    const tree = ref.current
    if (!item || !tree) return
    const items = visibleItems(tree)
    const index = items.indexOf(item)
    const isBranch = item.hasAttribute("aria-expanded")
    const isExpanded = item.getAttribute("aria-expanded") === "true"
    const value = item.dataset.value ?? ""
    const focus = (el?: HTMLElement) => el?.focus()

    switch (event.key) {
      case "ArrowDown":
        focus(items[index + 1])
        break
      case "ArrowUp":
        focus(items[index - 1])
        break
      case "ArrowRight":
        if (isBranch && !isExpanded) toggle(value)
        else if (isBranch) focus(items[index + 1])
        break
      case "ArrowLeft":
        if (isBranch && isExpanded) toggle(value)
        else focus(item.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? undefined)
        break
      case "Home":
        focus(items[0])
        break
      case "End":
        focus(items[items.length - 1])
        break
      case "Enter":
      case " ":
        setSelected(value)
        if (isBranch) toggle(value)
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <TreeViewContext.Provider value={{ expanded, toggle, selected, select: setSelected }}>
      <ul
        ref={ref}
        role="tree"
        data-slot="tree-view"
        tabIndex={hasFocusWithin ? -1 : 0}
        className={cn(
          "flex flex-col gap-px text-sm outline-none select-none",
          className
        )}
        onFocus={(event) => {
          setHasFocusWithin(true)
          if (event.target !== ref.current) return
          const tree = ref.current
          const target =
            tree.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]') ??
            visibleItems(tree)[0]
          target?.focus()
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setHasFocusWithin(false)
          }
        }}
        onKeyDown={onKeyDown}
        {...props}
      >
        {children}
      </ul>
    </TreeViewContext.Provider>
  )
}

function TreeItem({
  className,
  children,
  value,
  label,
  icon,
  disabled,
  ...props
}: Omit<React.ComponentProps<"li">, "onSelect"> & {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}) {
  const { expanded, toggle, selected, select } = useTreeView()
  const level = React.useContext(TreeLevelContext)
  const isBranch = React.Children.count(children) > 0
  const isExpanded = isBranch && expanded.includes(value)
  const isSelected = selected === value

  return (
    <li
      role="treeitem"
      data-slot="tree-item"
      data-value={value}
      aria-level={level}
      aria-selected={isSelected}
      aria-expanded={isBranch ? isExpanded : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      className={cn("group/tree-item outline-none", className)}
      {...props}
    >
      <div
        data-slot="tree-item-row"
        className={cn(
          "hover:bg-accent hover:text-accent-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors",
          "group-focus-visible/tree-item:border-ring group-focus-visible/tree-item:ring-ring/50 group-focus-visible/tree-item:ring-[3px]",
          isSelected && "bg-accent text-accent-foreground",
          disabled && "pointer-events-none opacity-50"
        )}
        style={{ paddingLeft: `calc(${level - 1} * 1rem + 0.5rem)` }}
        onClick={() => {
          if (disabled) return
          select(value)
          if (isBranch) toggle(value)
        }}
      >
        {isBranch ? (
          <ChevronRightIcon
            data-slot="tree-item-chevron"
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
            onClick={(event) => {
              event.stopPropagation()
              if (!disabled) toggle(value)
            }}
          />
        ) : (
          <span className="size-4 shrink-0" />
        )}
        {icon && (
          <span
            data-slot="tree-item-icon"
            className="text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0"
          >
            {icon}
          </span>
        )}
        <span data-slot="tree-item-label" className="truncate">
          {label}
        </span>
      </div>
      {isExpanded && (
        <ul role="group" data-slot="tree-item-group" className="flex flex-col gap-px">
          <TreeLevelContext.Provider value={level + 1}>
            {children}
          </TreeLevelContext.Provider>
        </ul>
      )}
    </li>
  )
}

export { TreeView, TreeItem }
