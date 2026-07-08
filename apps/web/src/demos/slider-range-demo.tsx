import { Slider } from "@/registry/ui/slider"

export default function SliderRangeDemo() {
  return (
    <Slider defaultValue={[25, 75]} max={100} step={1} className="w-[60%]" />
  )
}
