import { NumberField } from "@/registry/ui/number-field"

export default function NumberFieldStepDemo() {
  return (
    <NumberField defaultValue={1.5} step={0.5} min={0} aria-label="Amount" />
  )
}
