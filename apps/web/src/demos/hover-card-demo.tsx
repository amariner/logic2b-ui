import { CalendarIcon } from "lucide-react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/registry/ui/hover-card"

export default function HoverCardDemo() {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a
          href="#"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          @logic2b
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">@logic2b</h4>
            <p className="text-sm">
              A clone of shadcn/ui optimized for Cloudflare Workers and LLMs.
            </p>
            <div className="flex items-center pt-2">
              <CalendarIcon className="mr-2 size-4 opacity-70" />
              <span className="text-muted-foreground text-xs">
                Joined December 2023
              </span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
