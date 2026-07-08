import { Menu } from "lucide-react"

import { Button } from "@/registry/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/registry/ui/sheet"

const links = ["Dashboard", "Projects", "Team", "Settings"]

export default function SheetNavigationDemo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Acme Inc</SheetTitle>
        </SheetHeader>
        <nav className="grid gap-1 px-2">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="hover:bg-accent rounded-md px-3 py-2 text-sm no-underline"
            >
              {link}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
