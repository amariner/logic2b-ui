import { Checkbox } from "@/registry/ui/checkbox"
import { Label } from "@/registry/ui/label"

export default function CheckboxDisabledDemo() {
  return (
    <div className="flex items-center gap-3">
      <Checkbox id="checkbox-disabled" disabled />
      <Label htmlFor="checkbox-disabled">Accept terms (unavailable)</Label>
    </div>
  )
}
