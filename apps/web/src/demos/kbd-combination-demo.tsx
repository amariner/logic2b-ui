import { Kbd, KbdGroup } from "@/registry/ui/kbd"

export default function KbdCombinationDemo() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5">
        Use{" "}
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>P</Kbd>
        </KbdGroup>{" "}
        to open the command palette.
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5">
        Press{" "}
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>B</Kbd>
        </KbdGroup>{" "}
        then <Kbd>Esc</Kbd> to toggle the sidebar.
      </div>
    </div>
  )
}
