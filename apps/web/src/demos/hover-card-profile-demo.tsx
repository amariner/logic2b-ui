import { CalendarIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/registry/ui/avatar"
import { Button } from "@/registry/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/registry/ui/hover-card"

export default function HoverCardProfileDemo() {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@logic2b</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex gap-4">
          <Avatar>
            <AvatarFallback>L2</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">@logic2b</h4>
            <p className="text-sm">
              A component registry you copy into your project.
            </p>
            <div className="text-muted-foreground flex items-center pt-2 text-xs">
              <CalendarIcon className="mr-2 size-4 opacity-70" />
              Joined December 2023
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
