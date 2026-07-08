import { Button } from "@/registry/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/ui/popover"

export default function PopoverAlignDemo() {
  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Top</Button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-40 text-sm">
          Opens above the trigger.
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">End</Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 text-sm">
          Aligned to the end edge.
        </PopoverContent>
      </Popover>
    </div>
  )
}
