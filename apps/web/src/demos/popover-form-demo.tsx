import { Button } from "@/registry/ui/button"
import { Label } from "@/registry/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/registry/ui/radio-group"

export default function PopoverFormDemo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Filter</Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="grid gap-3">
          <p className="text-sm font-medium">Sort by</p>
          <RadioGroup defaultValue="recent" className="gap-2">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="recent" id="popover-recent" />
              <Label htmlFor="popover-recent">Most recent</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="popular" id="popover-popular" />
              <Label htmlFor="popover-popular">Most popular</Label>
            </div>
          </RadioGroup>
        </div>
      </PopoverContent>
    </Popover>
  )
}
