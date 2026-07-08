import { Button } from "@/registry/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/registry/ui/sheet"

const sides = ["top", "right", "bottom", "left"] as const

export default function SheetSidesDemo() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline" className="capitalize">
              {side}
            </Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle className="capitalize">{side} sheet</SheetTitle>
              <SheetDescription>
                This panel slides in from the {side} edge of the screen.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  )
}
