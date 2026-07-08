import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/registry/ui/toggle-group"

export default function ToggleGroupSingleDemo() {
  return (
    <ToggleGroup type="single" defaultValue="left">
      <ToggleGroupItem value="left" aria-label="Align left">
        <AlignLeftIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Align center">
        <AlignCenterIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Align right">
        <AlignRightIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
