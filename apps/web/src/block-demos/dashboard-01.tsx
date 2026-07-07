import { AppSidebar } from "@/registry/blocks/sidebar-01/app-sidebar"
import { ChartAreaInteractive } from "@/registry/blocks/dashboard-01/chart-area-interactive"
import { DataTable } from "@/registry/blocks/dashboard-01/data-table"
import { SectionCards } from "@/registry/blocks/dashboard-01/section-cards"
import { Separator } from "@/registry/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/registry/ui/sidebar"

export default function DashboardOneDemo() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">Dashboard</span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <SectionCards />
          <ChartAreaInteractive />
          <DataTable />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
