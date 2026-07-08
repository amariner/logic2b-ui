import { BadgeCheck } from "lucide-react"

import { Badge } from "@/registry/ui/badge"

export default function BadgeIconDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge>
        <BadgeCheck />
        Verified
      </Badge>
      <Badge variant="secondary">3 new</Badge>
      <Badge variant="destructive">Overdue</Badge>
    </div>
  )
}
