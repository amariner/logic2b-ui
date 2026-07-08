import { Badge } from "@/registry/ui/badge"

export default function BadgeLinkDemo() {
  return (
    <Badge asChild variant="outline">
      <a href="/docs/components/badge">View docs</a>
    </Badge>
  )
}
