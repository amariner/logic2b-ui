import { Label } from "@/registry/ui/label"
import { RadioGroup, RadioGroupItem } from "@/registry/ui/radio-group"

const plans = [
  { value: "starter", title: "Starter", desc: "For side projects." },
  { value: "pro", title: "Pro", desc: "For growing teams." },
]

export default function RadioGroupCardsDemo() {
  return (
    <RadioGroup defaultValue="pro" className="w-full max-w-sm gap-3">
      {plans.map((plan) => (
        <Label
          key={plan.value}
          htmlFor={`plan-${plan.value}`}
          className="flex items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary"
        >
          <RadioGroupItem
            value={plan.value}
            id={`plan-${plan.value}`}
            className="mt-0.5"
          />
          <div className="grid gap-1">
            <span className="font-medium">{plan.title}</span>
            <span className="text-muted-foreground font-normal">
              {plan.desc}
            </span>
          </div>
        </Label>
      ))}
    </RadioGroup>
  )
}
