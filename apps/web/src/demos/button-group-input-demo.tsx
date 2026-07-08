import { Button } from "@/registry/ui/button"
import { ButtonGroup } from "@/registry/ui/button-group"
import { Input } from "@/registry/ui/input"

export default function ButtonGroupInputDemo() {
  return (
    <ButtonGroup className="w-[320px]">
      <Input placeholder="Search..." />
      <Button variant="outline">Search</Button>
    </ButtonGroup>
  )
}
