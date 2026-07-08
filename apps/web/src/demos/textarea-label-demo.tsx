import { Label } from "@/registry/ui/label"
import { Textarea } from "@/registry/ui/textarea"

export default function TextareaLabelDemo() {
  return (
    <div className="grid w-[360px] gap-2">
      <Label htmlFor="message">Your message</Label>
      <Textarea id="message" placeholder="Type your message here." />
      <p className="text-muted-foreground text-sm">
        Your message will be copied to the support team.
      </p>
    </div>
  )
}
