import * as React from "react"
import { CustomerEdit, type CustomerDraft, type CustomerEditStatus } from "@/registry/blocks/customer-edit-01/customer-edit"
const initial = { name: "Olivia Martin", email: "olivia@example.com" }
export default function CustomerEditDemo({ state }: { state?: string }) {
  const [saved, setSaved] = React.useState(initial)
  const [value, setValue] = React.useState(state === "unsaved-changes" ? { ...initial, name: "Olivia Martin Ruiz" } : state === "validation-error" ? { name: "", email: "invalid" } : initial)
  const statuses = ["loading", "submitting", "error", "success", "permission-denied"]
  const [status, setStatus] = React.useState<CustomerEditStatus>(statuses.includes(state ?? "") ? state as CustomerEditStatus : "idle")
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  const save = (draft: CustomerDraft) => { setStatus("submitting"); timer.current = setTimeout(() => { setSaved(draft); setValue(draft); setStatus("success") }, 700) }
  return <CustomerEdit value={value} savedValue={saved} status={status} onValueChange={next => { setValue(next); setStatus("idle") }} onSave={save} onCancel={() => { setValue(saved); setStatus("idle") }} fieldErrors={state === "validation-error" && !value.name ? { name: "Enter a name.", email: "Enter a valid email address." } : undefined} />
}
