import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/registry/ui/carousel"

export default function CarouselMultipleDemo() {
  return (
    <Carousel opts={{ align: "start" }} className="w-full max-w-sm">
      <CarouselContent>
        {Array.from({ length: 6 }).map((_, index) => (
          <CarouselItem key={index} className="basis-1/3">
            <div className="border-input bg-card flex aspect-square items-center justify-center rounded-md border text-2xl font-semibold">
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
