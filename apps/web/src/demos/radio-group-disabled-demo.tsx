import { Label } from "@/registry/ui/label"
import { RadioGroup, RadioGroupItem } from "@/registry/ui/radio-group"

export default function RadioGroupDisabledDemo() {
  return (
    <RadioGroup defaultValue="standard" className="gap-3">
      <div className="flex items-center gap-3">
        <RadioGroupItem value="standard" id="ship-standard" />
        <Label htmlFor="ship-standard">Standard shipping</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="express" id="ship-express" />
        <Label htmlFor="ship-express">Express shipping</Label>
      </div>
      <div className="flex items-center gap-3" data-disabled>
        <RadioGroupItem value="overnight" id="ship-overnight" disabled />
        <Label htmlFor="ship-overnight">Overnight (unavailable)</Label>
      </div>
    </RadioGroup>
  )
}
