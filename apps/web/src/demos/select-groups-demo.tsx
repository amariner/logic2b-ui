import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select"

export default function SelectGroupsDemo() {
  return (
    <Select>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>North America</SelectLabel>
          <SelectItem value="est">Eastern (EST)</SelectItem>
          <SelectItem value="cst">Central (CST)</SelectItem>
          <SelectItem value="pst">Pacific (PST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Europe</SelectLabel>
          <SelectItem value="gmt">Greenwich (GMT)</SelectItem>
          <SelectItem value="cet">Central European (CET)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
