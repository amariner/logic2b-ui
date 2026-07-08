import { Skeleton } from "@/registry/ui/skeleton"

export default function SkeletonCardDemo() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-40 w-[300px] rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[300px]" />
        <Skeleton className="h-4 w-[220px]" />
      </div>
    </div>
  )
}
