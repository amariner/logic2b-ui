import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/registry/ui/hover-card"

export default function HoverCardAlignDemo() {
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href="#"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          Hover for details
        </a>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72">
        <p className="text-sm font-medium">Instant preview</p>
        <p className="text-muted-foreground mt-1 text-sm">
          This card opens after a shorter delay and is aligned to the start
          edge of the trigger.
        </p>
      </HoverCardContent>
    </HoverCard>
  )
}
