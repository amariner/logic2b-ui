import { Checkbox } from "@/registry/ui/checkbox"
import { Label } from "@/registry/ui/label"

export default function CheckboxWithTextDemo() {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id="checkbox-notifications" defaultChecked />
      <div className="grid gap-1.5">
        <Label htmlFor="checkbox-notifications">Enable notifications</Label>
        <p className="text-muted-foreground text-sm">
          You can turn these off at any time in settings.
        </p>
      </div>
    </div>
  )
}
