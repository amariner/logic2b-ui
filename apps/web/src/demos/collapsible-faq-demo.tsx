import { ChevronDown } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/ui/collapsible"

export default function CollapsibleFaqDemo() {
  return (
    <Collapsible className="w-[350px] rounded-md border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
        Can I use this in my project?
        <ChevronDown className="size-4 transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground border-t px-4 py-3 text-sm">
        Yes. It is free to use for personal and commercial projects. No
        attribution required.
      </CollapsibleContent>
    </Collapsible>
  )
}
