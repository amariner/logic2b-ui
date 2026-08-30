import { NativeSelect } from "@/registry/ui/native-select"

export default function NativeSelectDisabledDemo() {
  return (
    <NativeSelect
      aria-label="Current plan"
      defaultValue="starter"
      className="h-8 w-[180px]"
      disabled
    >
      <option value="starter">Starter</option>
      <option value="pro">Pro</option>
      <option value="enterprise">Enterprise (contact us)</option>
    </NativeSelect>
  )
}
