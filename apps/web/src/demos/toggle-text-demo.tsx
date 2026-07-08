import { BoldIcon } from "lucide-react"

import { Toggle } from "@/registry/ui/toggle"

export default function ToggleTextDemo() {
  return (
    <Toggle aria-label="Toggle bold" className="px-3">
      <BoldIcon />
      Bold
    </Toggle>
  )
}
