import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/registry/ui/stepper"

const STEPS = [
  {
    step: 1,
    title: "Create your account",
    description: "Email, password and workspace name.",
  },
  {
    step: 2,
    title: "Invite your team",
    description: "Send invites — they can join any time.",
  },
  {
    step: 3,
    title: "Install the CLI",
    description: "npx logic2b init in your project.",
    disabled: true,
  },
]

export default function StepperVerticalDemo() {
  return (
    <Stepper defaultValue={2} orientation="vertical" className="max-w-sm">
      {STEPS.map(({ step, title, description, disabled }) => (
        <StepperItem key={step} step={step} disabled={disabled}>
          <StepperTrigger>
            <StepperIndicator />
            <span className="flex flex-col gap-0.5">
              <StepperTitle>{title}</StepperTitle>
              <StepperDescription>{description}</StepperDescription>
            </span>
          </StepperTrigger>
          {step < STEPS.length && <StepperSeparator />}
        </StepperItem>
      ))}
    </Stepper>
  )
}
