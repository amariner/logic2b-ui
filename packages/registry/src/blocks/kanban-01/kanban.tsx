"use client"

import * as React from "react"

import { cn } from "@/registry/lib/utils"
import { Badge } from "@/registry/ui/badge"

type Task = { id: string; title: string; tag?: string }
type ColumnId = "todo" | "doing" | "done"

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "In progress" },
  { id: "done", title: "Done" },
]

const INITIAL: Record<ColumnId, Task[]> = {
  todo: [
    { id: "t1", title: "Draft the launch post", tag: "Marketing" },
    { id: "t2", title: "Audit color contrast", tag: "A11y" },
  ],
  doing: [
    { id: "t3", title: "Wire up the MCP endpoint", tag: "Backend" },
    { id: "t4", title: "Motion presets", tag: "Design" },
  ],
  done: [{ id: "t5", title: "Ship the registry", tag: "Platform" }],
}

export function Kanban({ className, ...props }: React.ComponentProps<"div">) {
  const [columns, setColumns] = React.useState(INITIAL)
  const [dragging, setDragging] = React.useState<{
    task: Task
    from: ColumnId
  } | null>(null)
  const [over, setOver] = React.useState<ColumnId | null>(null)

  const drop = (to: ColumnId) => {
    setOver(null)
    if (!dragging) return
    const { task, from } = dragging
    setDragging(null)
    if (from === to) return
    setColumns((prev) => ({
      ...prev,
      [from]: prev[from].filter((t) => t.id !== task.id),
      [to]: [...prev[to], task],
    }))
  }

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-5xl gap-4 px-6 py-10 sm:grid-cols-3",
        className
      )}
      {...props}
    >
      {COLUMNS.map((column) => (
        <div
          key={column.id}
          data-over={over === column.id ? "" : undefined}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(column.id)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setOver((c) => (c === column.id ? null : c))
          }}
          onDrop={() => drop(column.id)}
          className="bg-muted/30 data-over:border-ring data-over:bg-accent/40 flex flex-col rounded-lg border p-3 transition-colors"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">{column.title}</h3>
            <Badge variant="secondary" className="tabular-nums">
              {columns[column.id].length}
            </Badge>
          </div>
          <div className="flex min-h-16 flex-col gap-2">
            {columns[column.id].map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => setDragging({ task, from: column.id })}
                onDragEnd={() => {
                  setDragging(null)
                  setOver(null)
                }}
                data-slot="kanban-card"
                className="bg-card cursor-grab rounded-md border p-3 shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing"
              >
                <p className="text-sm font-medium">{task.title}</p>
                {task.tag && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {task.tag}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
