import { Button } from "@/registry/ui/button"
import { Spinner } from "@/registry/ui/spinner"

export default function SpinnerButtonDemo() {
  return (
    <div className="flex items-center gap-4">
      <Button disabled>
        <Spinner />
        Please wait
      </Button>
      <Button variant="outline" size="icon" disabled>
        <Spinner />
      </Button>
    </div>
  )
}
