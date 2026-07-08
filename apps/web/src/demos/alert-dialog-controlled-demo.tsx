import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/registry/ui/alert-dialog"
import { Button } from "@/registry/ui/button"

export default function AlertDialogControlledDemo() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex flex-col items-center gap-4">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm subscription</AlertDialogTitle>
            <AlertDialogDescription>
              You will be charged $9 per month until you cancel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Subscribe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
