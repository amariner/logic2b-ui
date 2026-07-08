import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/registry/ui/resizable"

// `minSize`/`maxSize` clamp how far the divider can travel (as percentages).
export default function ResizableConstrainedDemo() {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="max-w-md rounded-lg border md:min-w-[450px]"
    >
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <div className="flex h-[200px] items-center justify-center p-6">
          <span className="font-semibold">Sidebar</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={75}>
        <div className="flex h-[200px] items-center justify-center p-6">
          <span className="font-semibold">Main</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
