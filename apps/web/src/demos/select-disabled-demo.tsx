import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select"

export default function SelectDisabledDemo() {
  return (
    <Select defaultValue="starter">
      <SelectTrigger size="sm" className="w-[180px]">
        <SelectValue placeholder="Select a plan" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="starter">Starter</SelectItem>
        <SelectItem value="pro">Pro</SelectItem>
        <SelectItem value="enterprise" disabled>
          Enterprise (contact us)
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
