import { Button } from "@/registry/ui/button"
import { Label } from "@/registry/ui/label"
import { Textarea } from "@/registry/ui/textarea"

export default function TextareaFormDemo() {
  return (
    <form
      className="grid w-[360px] gap-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <Label htmlFor="feedback">Feedback</Label>
      <Textarea id="feedback" placeholder="Tell us what you think..." />
      <Button type="submit" className="justify-self-start">
        Send feedback
      </Button>
    </form>
  )
}
