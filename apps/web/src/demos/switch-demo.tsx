import { Label } from "@/registry/ui/label"
import { Switch } from "@/registry/ui/switch"

export default function SwitchDemo() {
  return (
    <div className="flex items-center gap-3">
      <Switch id="switch-airplane-mode" />
      <Label htmlFor="switch-airplane-mode">Airplane mode</Label>
    </div>
  )
}
