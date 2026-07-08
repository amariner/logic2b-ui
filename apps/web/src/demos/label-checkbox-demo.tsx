import { Checkbox } from "@/registry/ui/checkbox"
import { Label } from "@/registry/ui/label"

export default function LabelCheckboxDemo() {
  return (
    <Label
      htmlFor="label-terms"
      className="flex items-center gap-3 rounded-md border p-3"
    >
      <Checkbox id="label-terms" defaultChecked />
      Accept terms and conditions
    </Label>
  )
}
