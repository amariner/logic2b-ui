import { toast } from "sonner"

import { Button } from "@/registry/ui/button"
import { Toaster } from "@/registry/ui/sonner"

export default function SonnerPromiseDemo() {
  const save = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 1500))

  return (
    <div>
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(save, {
            loading: "Saving changes...",
            success: "Changes saved",
            error: "Could not save changes",
          })
        }
      >
        Save changes
      </Button>
    </div>
  )
}
