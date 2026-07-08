import { Button } from "@/registry/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/ui/drawer"

export default function DrawerContentDemo() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">View details</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Move goal</DrawerTitle>
            <DrawerDescription>
              Set your daily activity goal.
            </DrawerDescription>
          </DrawerHeader>
          <div className="text-muted-foreground p-4 text-center text-sm">
            Drag the handle at the top or swipe down to dismiss this drawer.
          </div>
          <DrawerFooter>
            <Button>Submit</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
