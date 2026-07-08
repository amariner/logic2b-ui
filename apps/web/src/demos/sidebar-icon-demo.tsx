import { Calendar, Home, Inbox, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/registry/ui/sidebar"

const items = [
  { title: "Home", icon: Home },
  { title: "Inbox", icon: Inbox },
  { title: "Calendar", icon: Calendar },
  { title: "Settings", icon: Settings },
]

// `collapsible="icon"` keeps the icon rail visible when collapsed —
// toggle it with the trigger in the header.
export default function SidebarIconDemo() {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg border [transform:translateZ(0)]">
      <SidebarProvider className="h-full min-h-0">
        <Sidebar collapsible="icon" className="h-full">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="!list-none">
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton tooltip={item.title}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <span className="text-muted-foreground text-sm">Collapse me</span>
          </header>
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Page content
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
