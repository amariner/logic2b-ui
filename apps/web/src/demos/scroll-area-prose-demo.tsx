import { ScrollArea } from "@/registry/ui/scroll-area"

export default function ScrollAreaProseDemo() {
  return (
    <ScrollArea className="h-52 w-80 rounded-md border p-4">
      <h4 className="mb-3 text-sm font-medium">Terms of Service</h4>
      <div className="text-muted-foreground space-y-3 text-sm">
        <p>
          By accessing this registry you agree to copy, adapt, and ship these
          components in your own projects without attribution.
        </p>
        <p>
          Components are provided as-is. You own the code once it lands in your
          repository and are free to modify every token, variant, and style.
        </p>
        <p>
          Updates are opt-in: re-run the installer whenever you want the latest
          version of a component, then reconcile any local changes.
        </p>
        <p>
          Accessibility primitives are inherited from the underlying libraries.
          Test your own compositions before shipping to production.
        </p>
      </div>
    </ScrollArea>
  )
}
