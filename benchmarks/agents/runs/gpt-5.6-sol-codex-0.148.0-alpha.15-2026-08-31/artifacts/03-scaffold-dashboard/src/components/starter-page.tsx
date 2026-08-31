import { lazy, Suspense } from "react"

const AnalyticsDashboard = lazy(() =>
  import("@/components/dashboard-02/analytics-dashboard").then((module) => ({
    default: module.AnalyticsDashboard,
  }))
)

export function StarterPage() {
  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <Suspense
        fallback={
          <div className="grid min-h-[24rem] place-items-center text-sm text-muted-foreground" role="status">
            Loading dashboard…
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </main>
  )
}
