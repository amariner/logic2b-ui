import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/registry/ui/field"
import { Switch } from "@/registry/ui/switch"

export default function FieldHorizontalDemo() {
  return (
    <Field orientation="horizontal" className="w-full max-w-sm">
      <FieldContent>
        <FieldLabel htmlFor="field-horizontal-2fa">
          Two-factor authentication
        </FieldLabel>
        <FieldDescription>
          Require a second step when signing in.
        </FieldDescription>
      </FieldContent>
      <Switch id="field-horizontal-2fa" />
    </Field>
  )
}
