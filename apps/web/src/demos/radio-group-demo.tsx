import { Label } from "@/registry/ui/label"
import { RadioGroup, RadioGroupItem } from "@/registry/ui/radio-group"

export default function RadioGroupDemo() {
  return (
    <RadioGroup defaultValue="comfortable" className="gap-3">
      <div className="flex items-center gap-3">
        <RadioGroupItem value="default" id="radio-default" />
        <Label htmlFor="radio-default">Default</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="comfortable" id="radio-comfortable" />
        <Label htmlFor="radio-comfortable">Comfortable</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="compact" id="radio-compact" />
        <Label htmlFor="radio-compact">Compact</Label>
      </div>
    </RadioGroup>
  )
}
