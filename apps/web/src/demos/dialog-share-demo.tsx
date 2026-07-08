import { CopyIcon } from "lucide-react"

import { Button } from "@/registry/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"

export default function DialogShareDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Share</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share link</DialogTitle>
          <DialogDescription>
            Anyone with this link will be able to view this page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="dialog-share-link" className="sr-only">
              Link
            </Label>
            <Input
              id="dialog-share-link"
              defaultValue="https://logic2b.ui/r/xY7z"
              readOnly
            />
          </div>
          <Button size="icon" variant="outline">
            <CopyIcon />
            <span className="sr-only">Copy</span>
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
