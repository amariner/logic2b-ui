import {
  Timeline,
  TimelineContent,
  TimelineDescription,
  TimelineIndicator,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from "@/registry/ui/timeline"

const events = [
  {
    time: "Mar 2024",
    title: "Registry shipped",
    description: "50+ shadcn-compatible components served as JSON.",
  },
  {
    time: "May 2024",
    title: "Theme studio",
    description: "A live two-page canvas with round-trippable preset ids.",
  },
  {
    time: "Jul 2024",
    title: "Remote MCP endpoint",
    description: "The registry tools with zero local install, no shell.",
  },
]

export default function TimelineDemo() {
  return (
    <Timeline className="w-full max-w-sm">
      {events.map((event) => (
        <TimelineItem key={event.title}>
          <TimelineIndicator />
          <TimelineContent>
            <TimelineTime>{event.time}</TimelineTime>
            <TimelineTitle>{event.title}</TimelineTitle>
            <TimelineDescription>{event.description}</TimelineDescription>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  )
}
