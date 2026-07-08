import { Label } from "@/registry/ui/label"
import { Switch } from "@/registry/ui/switch"

const settings = [
  { id: "marketing", label: "Marketing emails", defaultChecked: true },
  { id: "security", label: "Security alerts", defaultChecked: true },
  { id: "digest", label: "Weekly digest", defaultChecked: false },
]

export default function SwitchSettingsDemo() {
  return (
    <div className="flex w-[320px] flex-col gap-4">
      {settings.map((setting) => (
        <div key={setting.id} className="flex items-center justify-between">
          <Label htmlFor={`switch-${setting.id}`}>{setting.label}</Label>
          <Switch
            id={`switch-${setting.id}`}
            defaultChecked={setting.defaultChecked}
          />
        </div>
      ))}
    </div>
  )
}
