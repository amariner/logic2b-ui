import { Progress } from "@/registry/ui/progress"

export default function ProgressLabeledDemo() {
  const value = 40

  return (
    <div className="grid w-[60%] gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Uploading…</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  )
}
