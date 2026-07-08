import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/registry/ui/field"
import { Input } from "@/registry/ui/input"

export default function FieldSetDemo() {
  return (
    <FieldSet className="w-full max-w-sm">
      <FieldLegend>Shipping address</FieldLegend>
      <FieldDescription>Where should we send your order?</FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="field-set-street">Street</FieldLabel>
          <Input id="field-set-street" placeholder="123 Main St" />
        </Field>
        <FieldSeparator />
        <Field>
          <FieldLabel htmlFor="field-set-city">City</FieldLabel>
          <Input id="field-set-city" placeholder="San Francisco" />
        </Field>
      </FieldGroup>
    </FieldSet>
  )
}
