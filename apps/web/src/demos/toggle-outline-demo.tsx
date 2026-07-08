import { ItalicIcon } from "lucide-react"

import { Toggle } from "@/registry/ui/toggle"

export default function ToggleOutlineDemo() {
  return (
    <Toggle variant="outline" aria-label="Toggle italic">
      <ItalicIcon />
    </Toggle>
  )
}
