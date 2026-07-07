import { Input } from "@/registry/ui/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/registry/ui/field"

export default function FieldDemo() {
  return (
    <FieldGroup className="w-full max-w-sm">
      <Field>
        <FieldLabel htmlFor="field-demo-username">Username</FieldLabel>
        <Input id="field-demo-username" placeholder="shadcn" />
        <FieldDescription>This is your public display name.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="field-demo-email">Email</FieldLabel>
        <Input
          id="field-demo-email"
          type="email"
          aria-invalid
          defaultValue="not-an-email"
        />
        <FieldError>Please enter a valid email address.</FieldError>
      </Field>
    </FieldGroup>
  )
}
