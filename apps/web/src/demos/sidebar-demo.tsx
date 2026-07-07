import { Home, Inbox, Search, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/registry/ui/sidebar"

const items = [
  { title: "Home", url: "#", icon: Home },
  { title: "Inbox", url: "#", icon: Inbox },
  { title: "Search", url: "#", icon: Search },
  { title: "Settings", url: "#", icon: Settings },
]

export default function SidebarDemo() {
  return (
    // The wrapper's transform gives fixed-position descendants (the sidebar
    // panel) a local containing block, so it stays inside this preview box
    // instead of docking to the real browser viewport.
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg border [transform:translateZ(0)]">
      <SidebarProvider className="h-full min-h-0">
        <Sidebar className="h-full">
          <SidebarHeader>
            <div className="px-2 py-1 text-sm font-semibold">Acme Inc</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Application</SidebarGroupLabel>
              <SidebarGroupContent>
                {/* !list-none: the docs article wrapper applies list-disc to
                    any nested <ul>; this demo needs to override it locally. */}
                <SidebarMenu className="!list-none">
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </header>
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Page content
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
