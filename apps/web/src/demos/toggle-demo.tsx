import { ItalicIcon } from "lucide-react"

import { Toggle } from "@/registry/ui/toggle"

export default function ToggleDemo() {
  return (
    <Toggle aria-label="Toggle italic">
      <ItalicIcon />
    </Toggle>
  )
}
