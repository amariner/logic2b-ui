import { ArrowRightIcon, SearchIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/ui/input-group"

export default function InputGroupButtonDemo() {
  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>
          Go
          <ArrowRightIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
