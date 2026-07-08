import { Label } from "@/registry/ui/label"
import { Switch } from "@/registry/ui/switch"

export default function SwitchDisabledDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Switch id="switch-off" disabled />
        <Label htmlFor="switch-off">Disabled</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="switch-on" defaultChecked disabled />
        <Label htmlFor="switch-on">Disabled, on</Label>
      </div>
    </div>
  )
}
