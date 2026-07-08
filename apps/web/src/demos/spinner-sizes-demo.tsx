import { Spinner } from "@/registry/ui/spinner"

export default function SpinnerSizesDemo() {
  return (
    <div className="flex items-center gap-6">
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
    </div>
  )
}
