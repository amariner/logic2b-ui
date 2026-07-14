import { NativeSelect } from "@/registry/ui/native-select"

export default function NativeSelectDisabledDemo() {
  return (
    <NativeSelect size="sm" defaultValue="starter" className="w-[180px]" disabled>
      <option value="starter">Starter</option>
      <option value="pro">Pro</option>
      <option value="enterprise">Enterprise (contact us)</option>
    </NativeSelect>
  )
}
