import { NativeSelect } from "@/registry/ui/native-select"

export default function NativeSelectDemo() {
  return (
    <NativeSelect defaultValue="apple" className="w-[180px]">
      <option value="apple">Apple</option>
      <option value="banana">Banana</option>
      <option value="blueberry">Blueberry</option>
      <option value="grapes">Grapes</option>
      <option value="pineapple">Pineapple</option>
    </NativeSelect>
  )
}
