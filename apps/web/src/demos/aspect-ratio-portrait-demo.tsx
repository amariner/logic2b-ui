import { AspectRatio } from "@/registry/ui/aspect-ratio"

export default function AspectRatioPortraitDemo() {
  return (
    <div className="w-40">
      <AspectRatio
        ratio={3 / 4}
        className="bg-muted flex items-center justify-center rounded-md"
      >
        <span className="text-muted-foreground text-sm">3 / 4</span>
      </AspectRatio>
    </div>
  )
}
