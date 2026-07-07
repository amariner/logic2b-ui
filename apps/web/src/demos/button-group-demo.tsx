import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/registry/ui/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@/registry/ui/button-group"

export default function ButtonGroupDemo() {
  return (
    <div className="flex flex-col gap-6">
      <ButtonGroup>
        <Button variant="outline">Copy</Button>
        <Button variant="outline">Paste</Button>
        <Button variant="outline" size="icon">
          <ChevronDownIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <ButtonGroupText>https://</ButtonGroupText>
        <ButtonGroupSeparator />
        <Button variant="outline">ui.logic2b.com</Button>
      </ButtonGroup>
    </div>
  )
}
