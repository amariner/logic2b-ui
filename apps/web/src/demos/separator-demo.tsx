import { Separator } from "@/registry/ui/separator"

export default function SeparatorDemo() {
  return (
    <div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">logic2b ui</h4>
        <p className="text-sm text-muted-foreground">
          Copy-paste components, AI-assisted.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Components</div>
        <Separator orientation="vertical" />
        <div>Registry</div>
      </div>
    </div>
  )
}
