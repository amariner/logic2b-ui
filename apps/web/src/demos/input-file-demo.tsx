import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"

export default function InputFileDemo() {
  return (
    <div className="grid w-full max-w-sm items-center gap-3">
      <Label htmlFor="input-file">Picture</Label>
      <Input id="input-file" type="file" />
    </div>
  )
}
