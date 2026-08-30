import { AnalyticsDashboard } from "@/registry/blocks/dashboard-02/analytics-dashboard"
import { LandingPage } from "@/registry/blocks/landing-page-01/landing-page"
import { LoginForm } from "@/registry/blocks/login-01/login-form"
import type { ScaffoldStarter } from "@logic2b/scaffold"

export function LaunchDemo({ starter }: { starter: ScaffoldStarter }) {
  if (starter === "marketing") {
    return <LandingPage />
  }

  if (starter === "dashboard") {
    return (
      <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
        <AnalyticsDashboard />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  )
}
