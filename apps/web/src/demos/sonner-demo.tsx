import { toast } from "sonner"

import { Button } from "@/registry/ui/button"
import { Toaster } from "@/registry/ui/sonner"

export default function SonnerDemo() {
  return (
    <div>
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast("Event has been created", {
            description: "Sunday, December 03, 2026 at 9:00 AM",
          })
        }
      >
        Show Toast
      </Button>
    </div>
  )
}
