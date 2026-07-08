import * as React from "react"

import { Label } from "@/registry/ui/label"
import { Switch } from "@/registry/ui/switch"

export default function SwitchControlledDemo() {
  const [checked, setChecked] = React.useState(true)

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="switch-notifications"
        checked={checked}
        onCheckedChange={setChecked}
      />
      <Label htmlFor="switch-notifications">
        Notifications {checked ? "on" : "off"}
      </Label>
    </div>
  )
}
