import { StarIcon } from "lucide-react"

import { Toggle } from "@/registry/ui/toggle"

export default function ToggleSizesDemo() {
  return (
    <div className="flex items-center gap-2">
      <Toggle size="sm" variant="outline" aria-label="Favorite, small">
        <StarIcon />
      </Toggle>
      <Toggle size="default" variant="outline" aria-label="Favorite, default">
        <StarIcon />
      </Toggle>
      <Toggle size="lg" variant="outline" aria-label="Favorite, large">
        <StarIcon />
      </Toggle>
    </div>
  )
}
