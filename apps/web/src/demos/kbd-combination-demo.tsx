import { Kbd, KbdGroup } from "@/registry/ui/kbd"

export default function KbdCombinationDemo() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        Use{" "}
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>P</Kbd>
        </KbdGroup>{" "}
        to open the command palette.
      </p>
      <p className="text-muted-foreground">
        Press{" "}
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>B</Kbd>
        </KbdGroup>{" "}
        then <Kbd>Esc</Kbd> to toggle the sidebar.
      </p>
    </div>
  )
}
