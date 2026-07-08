import { Separator } from "@/registry/ui/separator"

export default function SeparatorLabeledDemo() {
  return (
    <div className="flex w-72 items-center gap-3 text-sm">
      <Separator className="flex-1" />
      <span className="text-muted-foreground">or continue with</span>
      <Separator className="flex-1" />
    </div>
  )
}
