import { PlusIcon } from "lucide-react"

import { Button } from "@/registry/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/ui/tooltip"

export default function TooltipIconDemo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Add item">
          <PlusIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Add item</TooltipContent>
    </Tooltip>
  )
}
