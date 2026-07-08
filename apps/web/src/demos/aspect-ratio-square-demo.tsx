import { AspectRatio } from "@/registry/ui/aspect-ratio"

export default function AspectRatioSquareDemo() {
  return (
    <div className="w-48">
      <AspectRatio
        ratio={1}
        className="bg-muted flex items-center justify-center rounded-md"
      >
        <span className="text-muted-foreground text-sm">1 / 1</span>
      </AspectRatio>
    </div>
  )
}
