import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/registry/ui/toggle-group"

export default function ToggleGroupSizesDemo() {
  return (
    <div className="flex flex-col items-start gap-4">
      <ToggleGroup type="multiple" variant="outline" size="sm">
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <BoldIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <ItalicIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <UnderlineIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="multiple" variant="outline" size="lg">
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <BoldIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <ItalicIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <UnderlineIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
