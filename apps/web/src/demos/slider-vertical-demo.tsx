import { Slider } from "@/registry/ui/slider"

export default function SliderVerticalDemo() {
  return (
    <div className="flex h-48 items-center gap-8">
      <Slider defaultValue={[60]} max={100} step={1} orientation="vertical" />
      <Slider
        defaultValue={[20, 80]}
        max={100}
        step={1}
        orientation="vertical"
      />
      <Slider
        defaultValue={[40]}
        max={100}
        step={1}
        orientation="vertical"
        disabled
      />
    </div>
  )
}
