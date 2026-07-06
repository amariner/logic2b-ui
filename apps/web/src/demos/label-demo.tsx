import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"

export default function LabelDemo() {
  return (
    <div className="grid gap-2">
      <Label htmlFor="label-email">Your email address</Label>
      <Input id="label-email" type="email" placeholder="Email" />
    </div>
  )
}
