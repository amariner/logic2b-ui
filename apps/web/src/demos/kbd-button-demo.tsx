import { Button } from "@/registry/ui/button"
import { Kbd, KbdGroup } from "@/registry/ui/kbd"

export default function KbdButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="outline" size="sm" className="pr-2">
        Search
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <Button variant="outline" size="sm" className="pr-2">
        Accept
        <Kbd>⏎</Kbd>
      </Button>
    </div>
  )
}
