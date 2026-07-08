import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

import { Button } from "@/registry/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/ui/collapsible"

export default function CollapsibleControlledDemo() {
  const [open, setOpen] = React.useState(false)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="w-[350px] space-y-2"
    >
      <div className="flex items-center justify-between space-x-4 px-4">
        <h4 className="text-sm font-semibold">
          {open ? "Hide" : "Show"} environment variables
        </h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <ChevronsUpDown />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-3 font-mono text-sm">
        NEXT_PUBLIC_API_URL
      </div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-3 font-mono text-sm">
          DATABASE_URL
        </div>
        <div className="rounded-md border px-4 py-3 font-mono text-sm">
          SESSION_SECRET
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
