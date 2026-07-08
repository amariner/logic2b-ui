import { Skeleton } from "@/registry/ui/skeleton"

export default function SkeletonListDemo() {
  return (
    <div className="flex w-[320px] flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
