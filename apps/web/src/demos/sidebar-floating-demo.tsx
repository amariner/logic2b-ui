import { LifeBuoy, Send, Sparkles } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/registry/ui/sidebar"

const items = [
  { title: "Assistant", icon: Sparkles },
  { title: "Support", icon: LifeBuoy },
  { title: "Feedback", icon: Send },
]

// `variant="floating"` detaches the sidebar into a rounded, bordered card.
export default function SidebarFloatingDemo() {
  return (
    // The wrapper's transform gives the fixed-position sidebar a local
    // containing block so it stays inside this preview box.
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg border [transform:translateZ(0)]">
      <SidebarProvider className="h-full min-h-0">
        <Sidebar variant="floating" className="h-full">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Help</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="!list-none">
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton>
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
            <span className="text-muted-foreground text-sm">Workspace</span>
          </header>
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Page content
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
