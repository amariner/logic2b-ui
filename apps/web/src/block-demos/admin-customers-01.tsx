import * as React from "react"
import { AdminCustomers, type Customer, type AdminCustomersProps } from "@/registry/blocks/admin-customers-01/admin-customers"
import { CustomerEdit, type CustomerDraft, type CustomerEditStatus } from "@/registry/blocks/customer-edit-01/customer-edit"
import { sampleCustomers } from "./customer-sample"

export default function AdminCustomersOneDemo({ state }: { state?: string }) {
  const [customers, setCustomers] = React.useState<Customer[]>(state === "empty" ? [] : sampleCustomers.map((c, i) => ({ ...c, id: String(i) })))
  const [status, setStatus] = React.useState<AdminCustomersProps["status"]>(state === "loading" || state === "error" || state === "permission-denied" ? state : "idle")
  const [editing, setEditing] = React.useState<Customer | null>(null)
  const [value, setValue] = React.useState<CustomerDraft>({ name: "", email: "" })
  const [savedValue, setSavedValue] = React.useState(value)
  const [saveStatus, setSaveStatus] = React.useState<CustomerEditStatus>("idle")
  const [nextSave, setNextSave] = React.useState("success")
  const [fieldErrors, setFieldErrors] = React.useState<Partial<CustomerDraft>>({})
  const opener = React.useRef<HTMLElement | null>(null)
  const formRegion = React.useRef<HTMLDivElement>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  React.useEffect(() => { if (editing) formRegion.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus() }, [editing?.id])
  const open = (customer: Customer) => { opener.current = document.activeElement as HTMLElement; setValue({ name: customer.name, email: customer.email }); setSavedValue({ name: customer.name, email: customer.email }); setSaveStatus("idle"); setFieldErrors({}); setEditing(customer) }
  const save = (draft: CustomerDraft) => {
    if (!editing || saveStatus === "submitting") return
    setSaveStatus("submitting"); setFieldErrors({})
    timer.current = setTimeout(() => {
      if (nextSave === "error") { setSaveStatus("error"); setNextSave("success"); return }
      if (nextSave === "permission-denied") { setSaveStatus("permission-denied"); return }
      if (customers.some(c => c.id !== editing.id && c.email.toLowerCase() === draft.email.toLowerCase())) { setFieldErrors({ email: "A customer with this email already exists." }); setSaveStatus("error"); return }
      const updated = { ...editing, ...draft }
      setCustomers(previous => previous.some(c => c.id === updated.id) ? previous.map(c => c.id === updated.id ? updated : c) : [...previous, updated])
      setValue(draft); setSavedValue(draft); setSaveStatus("success")
    }, 700)
  }
  return <>
    <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 pt-4 text-sm">
      <label className="flex flex-col gap-1">List preview<select className="min-h-11 rounded border bg-background px-2" value={status} onChange={e => setStatus(e.target.value as AdminCustomersProps["status"])}><option value="idle">Loaded</option><option value="loading">Loading</option><option value="error">Load failed</option><option value="permission-denied">Permission denied</option></select></label>
      <label className="flex flex-col gap-1">Next save<select disabled={saveStatus === "submitting"} className="min-h-11 rounded border bg-background px-2" value={nextSave} onChange={e => setNextSave(e.target.value)}><option value="success">Success</option><option value="error">Fail once</option><option value="permission-denied">Permission denied</option></select></label>
      <p className="self-end text-xs text-muted-foreground">Demo data stays in this page and resets on reload.</p>
    </div>
    <AdminCustomers customers={customers} status={status} defaultQuery={state === "no-results" ? "no matching customer" : ""} canEdit={!editing} onRetry={() => { setStatus("loading"); timer.current = setTimeout(() => setStatus("idle"), 500) }} onCreate={() => open({ id: crypto.randomUUID(), name: "", email: "", orders: 0, spent: "$0", lastOrder: "—", segment: "new" })} onEdit={open} />
    {editing && <div ref={formRegion}><CustomerEdit key={editing.id} value={value} savedValue={savedValue} onValueChange={next => { setValue(next); setFieldErrors({}); setSaveStatus("idle") }} onSave={save} status={saveStatus} fieldErrors={fieldErrors} onCancel={() => { setEditing(null); setTimeout(() => opener.current?.focus(), 0) }} /></div>}
  </>
}
