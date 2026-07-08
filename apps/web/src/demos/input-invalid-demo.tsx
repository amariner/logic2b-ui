import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"

export default function InputInvalidDemo() {
  return (
    <div className="grid w-full max-w-sm items-center gap-3">
      <Label htmlFor="input-invalid">Email</Label>
      <Input
        id="input-invalid"
        type="email"
        aria-invalid
        defaultValue="not-an-email"
      />
    </div>
  )
}
