import { Checkbox } from "@/registry/ui/checkbox"
import { Label } from "@/registry/ui/label"

export default function CheckboxDemo() {
  return (
    <div className="flex items-center gap-3">
      <Checkbox id="checkbox-terms" />
      <Label htmlFor="checkbox-terms">Accept terms and conditions</Label>
    </div>
  )
}
