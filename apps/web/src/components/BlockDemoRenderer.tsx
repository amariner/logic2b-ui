import * as React from "react"

const demos = import.meta.glob<{ default: React.ComponentType }>(
  "../block-demos/*.tsx",
  { eager: true }
)

export function BlockDemoRenderer({ name }: { name: string }) {
  const mod = demos[`../block-demos/${name}.tsx`]
  if (!mod) {
    return (
      <p className="p-6 text-sm text-destructive">
        Block &quot;{name}&quot; not found.
      </p>
    )
  }
  const Demo = mod.default
  return <Demo />
}
