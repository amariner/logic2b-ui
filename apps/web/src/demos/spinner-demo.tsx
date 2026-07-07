import { Button } from "@/registry/ui/button"
import { Spinner } from "@/registry/ui/spinner"

export default function SpinnerDemo() {
  return (
    <div className="flex items-center gap-6">
      <Spinner />
      <Spinner className="size-6 text-primary" />
      <Button disabled>
        <Spinner />
        Please wait
      </Button>
    </div>
  )
}
