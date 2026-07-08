import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/registry/ui/carousel"

export default function CarouselVerticalDemo() {
  return (
    <Carousel
      orientation="vertical"
      opts={{ align: "start" }}
      className="w-full max-w-xs"
    >
      <CarouselContent className="-mt-1 h-[200px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <CarouselItem key={index} className="pt-1 basis-1/2">
            <div className="border-input bg-card flex items-center justify-center rounded-md border p-6 text-2xl font-semibold">
              {index + 1}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}
