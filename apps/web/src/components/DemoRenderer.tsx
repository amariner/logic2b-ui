import * as React from "react"

const demos = import.meta.glob<{ default: React.ComponentType }>(
  "../demos/*.tsx",
  { eager: true }
)

// Installable charts render straight from the registry — single source of truth.
const charts = import.meta.glob<{ default: React.ComponentType }>(
  "../../../../packages/registry/src/charts/*.tsx",
  { eager: true }
)

export function DemoRenderer({ name }: { name: string }) {
  const mod =
    demos[`../demos/${name}.tsx`] ??
    charts[`../../../../packages/registry/src/charts/${name}.tsx`]
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
