import { ScrollArea, ScrollBar } from "@/registry/ui/scroll-area"

const figures = Array.from({ length: 12 }).map((_, i) => `Figure ${i + 1}`)

export default function ScrollAreaHorizontalDemo() {
  return (
    <ScrollArea className="w-96 rounded-md border whitespace-nowrap">
      <div className="flex w-max gap-4 p-4">
        {figures.map((figure) => (
          <div
            key={figure}
            className="bg-muted flex size-28 shrink-0 items-center justify-center rounded-md text-sm font-medium"
          >
            {figure}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
