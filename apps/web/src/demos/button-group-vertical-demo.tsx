import { MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/registry/ui/button"
import { ButtonGroup } from "@/registry/ui/button-group"

export default function ButtonGroupVerticalDemo() {
  return (
    <ButtonGroup orientation="vertical">
      <Button variant="outline" size="icon" aria-label="Increment">
        <PlusIcon />
      </Button>
      <Button variant="outline" size="icon" aria-label="Decrement">
        <MinusIcon />
      </Button>
    </ButtonGroup>
  )
}
