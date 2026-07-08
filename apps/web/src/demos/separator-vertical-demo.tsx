import { Separator } from "@/registry/ui/separator"

export default function SeparatorVerticalDemo() {
  return (
    <div className="flex h-5 items-center gap-4 text-sm">
      <span>Profile</span>
      <Separator orientation="vertical" />
      <span>Billing</span>
      <Separator orientation="vertical" />
      <span>Settings</span>
    </div>
  )
}
