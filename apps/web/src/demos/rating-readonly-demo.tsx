import { HeartIcon } from "lucide-react"

import { Rating } from "@/registry/ui/rating"

export default function RatingReadonlyDemo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <Rating value={4} readOnly aria-label="Average rating" />
        <span className="text-muted-foreground text-sm">4.0 · 128 reviews</span>
      </div>
      <Rating
        value={3}
        readOnly
        max={5}
        icon={<HeartIcon />}
        aria-label="Health"
        className="text-rose-500"
      />
    </div>
  )
}
