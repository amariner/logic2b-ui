import * as React from "react"

type DemoModule = { default: React.ComponentType }
type DemoLoader = () => Promise<DemoModule>

const demos = import.meta.glob<DemoModule>("../demos/*.tsx")

// Installable charts render straight from the registry — single source of truth.
const charts = import.meta.glob<DemoModule>(
  "../../../../packages/registry/src/charts/*.tsx"
)

const loaders: Record<string, DemoLoader> = { ...demos, ...charts }

export function DemoRenderer({ name }: { name: string }) {
  const loader =
    loaders[`../demos/${name}.tsx`] ??
    loaders[`../../../../packages/registry/src/charts/${name}.tsx`]
  const Demo = React.useMemo(
    () => (loader ? React.lazy(loader) : null),
    [loader]
  )

  if (!Demo) {
    return (
      <p className="text-sm text-destructive">
        Demo &quot;{name}&quot; not found.
      </p>
    )
  }

  return (
    <React.Suspense
      fallback={
        <div
          aria-label={`Loading ${name} preview`}
          className="h-10 w-full animate-pulse rounded-md bg-muted"
          role="status"
        />
      }
    >
      <div className="contents" data-preview-ready={name}>
        <Demo />
      </div>
    </React.Suspense>
  )
}
