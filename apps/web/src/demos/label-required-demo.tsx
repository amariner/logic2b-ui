import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"

export default function LabelRequiredDemo() {
  return (
    <div className="grid gap-2">
      <Label htmlFor="label-name">
        Full name
        <span className="text-muted-foreground font-normal">(required)</span>
      </Label>
      <Input id="label-name" placeholder="Ada Lovelace" required />
    </div>
  )
}
