import * as React from "react"

type DemoModule = { default: React.ComponentType }

const demos = import.meta.glob<DemoModule>("../block-demos/*.tsx")

export function BlockDemoRenderer({ name }: { name: string }) {
  const loader = demos[`../block-demos/${name}.tsx`]
  const Demo = React.useMemo(
    () => (loader ? React.lazy(loader) : null),
    [loader]
  )

  if (!Demo) {
    return (
      <p className="p-6 text-sm text-destructive">
        Block &quot;{name}&quot; not found.
      </p>
    )
  }

  return (
    <React.Suspense
      fallback={
        <div
          aria-label={`Loading ${name} preview`}
          className="m-6 h-10 animate-pulse rounded-md bg-muted"
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
