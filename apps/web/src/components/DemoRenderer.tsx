import * as React from "react"

const demos = import.meta.glob<{ default: React.ComponentType }>(
  "../demos/*.tsx",
  { eager: true }
)

export function DemoRenderer({ name }: { name: string }) {
  const mod = demos[`../demos/${name}.tsx`]
  if (!mod) {
    return (
      <p className="text-sm text-destructive">
        Demo &quot;{name}&quot; not found.
      </p>
    )
  }
  const Demo = mod.default
  return <Demo />
}
