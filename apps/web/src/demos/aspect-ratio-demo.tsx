import { AspectRatio } from "@/registry/ui/aspect-ratio"

export default function AspectRatioDemo() {
  return (
    <AspectRatio
      ratio={16 / 9}
      className="bg-muted flex items-center justify-center rounded-md"
    >
      <span className="text-muted-foreground text-sm">16 / 9</span>
    </AspectRatio>
  )
}
