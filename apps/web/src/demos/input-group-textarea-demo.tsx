import { InfoIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/registry/ui/input-group"

export default function InputGroupTextareaDemo() {
  return (
    <InputGroup className="max-w-sm">
      <InputGroupTextarea placeholder="Write a message..." />
      <InputGroupAddon align="block-end">
        <InputGroupText>
          <InfoIcon />
          280 characters left
        </InputGroupText>
        <InputGroupButton className="ml-auto" size="sm">
          Send
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
