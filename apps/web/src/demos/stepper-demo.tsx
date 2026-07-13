"use client"

import * as React from "react"

import { Button } from "@/registry/ui/button"
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/registry/ui/stepper"

const STEPS = [
  { step: 1, title: "Account" },
  { step: 2, title: "Payment" },
  { step: 3, title: "Confirm" },
]

export default function StepperDemo() {
  const [step, setStep] = React.useState(2)

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <Stepper value={step} onValueChange={setStep}>
        {STEPS.map(({ step: s, title }) => (
          <StepperItem key={s} step={s}>
            <StepperTrigger>
              <StepperIndicator />
              <StepperTitle>{title}</StepperTitle>
            </StepperTrigger>
            {s < STEPS.length && <StepperSeparator />}
          </StepperItem>
        ))}
      </Stepper>
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
        >
          Back
        </Button>
        <Button
          size="sm"
          disabled={step === STEPS.length}
          onClick={() => setStep(step + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
