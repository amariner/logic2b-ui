import * as React from "react"

import { AdminCustomers, sampleCustomers, type CustomerRecord } from "@/registry/blocks/admin-customers-01/admin-customers"
import { CustomerEditForm, type CustomerEditValue } from "@/registry/blocks/customer-edit-01/customer-edit-form"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/registry/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/registry/ui/dialog"

type DemoCustomer = CustomerRecord & { company: string }
type ListStatus = "success" | "loading" | "error" | "permission-denied"
type FormStatus = "idle" | "loading" | "submitting" | "error" | "success" | "permission-denied"

const companies = ["Northstar Studio", "Lee Design", "Nguyen & Co", "Seoul Supply", "Davis Flowers", "Johnson Works"]
const initialCustomers: DemoCustomer[] = sampleCustomers.map((customer, index) => ({
  ...customer,
  company: companies[index] ?? "Independent customer",
}))
const emptyValue: CustomerEditValue = { name: "", email: "", company: "", segment: "new" }
const sampleValue: CustomerEditValue = {
  name: initialCustomers[0]!.name,
  email: initialCustomers[0]!.email,
  company: initialCustomers[0]!.company,
  segment: initialCustomers[0]!.segment,
}

function usePreviewOptions() {
  const [options, setOptions] = React.useState({ state: "", save: "" })
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setOptions({ state: params.get("state") ?? "", save: params.get("save") ?? "" })
  }, [])
  return options
}

/** An in-memory consumer example. No request is sent to a backend. */
export function CustomerJourneyDemo({ standalone = false }: { standalone?: boolean }) {
  const options = usePreviewOptions()
  const [customers, setCustomers] = React.useState(initialCustomers)
  const [query, setQuery] = React.useState("")
  const [listStatus, setListStatus] = React.useState<ListStatus>("success")
  const [formStatus, setFormStatus] = React.useState<FormStatus>("idle")
  const [value, setValue] = React.useState<CustomerEditValue>(sampleValue)
  const [baseline, setBaseline] = React.useState<CustomerEditValue>(sampleValue)
  const [editing, setEditing] = React.useState<DemoCustomer | null>(initialCustomers[0]!)
  const [open, setOpen] = React.useState(false)
  const [discardOpen, setDiscardOpen] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | undefined>()
  const [successMessage, setSuccessMessage] = React.useState<string | undefined>()
  const [validationErrors, setValidationErrors] = React.useState<Partial<Record<keyof CustomerEditValue, string>>>({})
  const trigger = React.useRef<HTMLElement | null>(null)
  const confirmationTrigger = React.useRef<HTMLElement | null>(null)
  const discardPending = React.useRef(false)
  const standaloneContainer = React.useRef<HTMLDivElement | null>(null)
  const currentDraft = React.useRef(value)
  const currentBaseline = React.useRef(baseline)
  const pending = React.useRef(false)
  const attempts = React.useRef(0)
  const nextId = React.useRef(1)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = JSON.stringify(value) !== JSON.stringify(baseline)

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  React.useEffect(() => {
    const state = options.state
    if (!standalone) {
      if (state === "empty") setCustomers([])
      if (state === "no-results") setQuery("No matching customer")
      if (state === "loading" || state === "error" || state === "permission-denied") setListStatus(state)
      if (state === "success") setSuccessMessage("Customer saved. The customer list is up to date.")
      return
    }
    if (["loading", "submitting", "error", "success", "permission-denied"].includes(state)) {
      setFormStatus(state as FormStatus)
    }
    if (state === "error") setSaveError("We couldn't save this customer. Your changes are still here; try again.")
    if (state === "success") setSuccessMessage("Customer saved. You can continue editing.")
    if (state === "validation-error") {
      setValue({ ...sampleValue, email: "olivia@" })
      setValidationErrors({ email: "Enter a valid email address." })
    }
    if (state === "unsaved") {
      setValue({ ...sampleValue, company: "Northstar Studio Europe" })
    }
  }, [options.state, standalone])

  function restoreFocus() {
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus()
      else document.querySelector<HTMLInputElement>('[aria-label="Search customers"]')?.focus()
    })
  }

  function closeEditor() {
    setDiscardOpen(false)
    setOpen(false)
    if (standalone) {
      setValue(baseline)
      setFormStatus("idle")
      setSaveError(undefined)
      setValidationErrors({})
      requestAnimationFrame(() => standaloneContainer.current?.querySelector<HTMLInputElement>('input[autocomplete="name"]')?.focus())
    } else restoreFocus()
  }

  function requestClose() {
    if (pending.current || formStatus === "submitting" || discardPending.current) return
    // Dismissal callbacks can run before Radix refreshes its latest React callback.
    // Read the draft synchronously so a fast Escape cannot discard the last edit.
    if (JSON.stringify(currentDraft.current) !== JSON.stringify(currentBaseline.current)) {
      discardPending.current = true
      confirmationTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setDiscardOpen(true)
    }
    else closeEditor()
  }

  function editCustomer(customer: DemoCustomer | null) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const nextValue = customer
      ? { name: customer.name, email: customer.email, company: customer.company, segment: customer.segment }
      : { ...emptyValue }
    setEditing(customer)
    currentDraft.current = nextValue
    currentBaseline.current = nextValue
    setValue(nextValue)
    setBaseline(nextValue)
    setFormStatus("idle")
    setSaveError(undefined)
    setValidationErrors({})
    setSuccessMessage(undefined)
    attempts.current = 0
    setOpen(true)
  }

  function saveCustomer(submitted: CustomerEditValue) {
    if (pending.current || formStatus === "submitting" || formStatus === "permission-denied") return
    pending.current = true
    attempts.current += 1
    setFormStatus("submitting")
    setSaveError(undefined)
    setValidationErrors({})
    timer.current = setTimeout(() => {
      pending.current = false
      if (options.save === "fail-once" && attempts.current === 1) {
        setSaveError("We couldn't save this customer. Your changes are still here; try again.")
        setFormStatus("error")
        return
      }
      const saved: DemoCustomer = {
        ...(editing ?? { id: `demo-${nextId.current++}`, orders: 0, spent: "$0", lastOrder: "—" }),
        ...submitted,
      }
      setCustomers((current) => editing
        ? current.map((customer) => customer.id === editing.id ? saved : customer)
        : [...current, saved])
      setEditing(saved)
      currentDraft.current = submitted
      currentBaseline.current = submitted
      setValue(submitted)
      setBaseline(submitted)
      setFormStatus("success")
      setSuccessMessage(`${submitted.name} saved. Changes last until this preview is reloaded.`)
      if (!standalone) {
        setOpen(false)
        restoreFocus()
      }
    }, 700)
  }

  function retryCustomers() {
    setListStatus("loading")
    timer.current = setTimeout(() => setListStatus("success"), 700)
  }

  const form = (
    <CustomerEditForm
      value={value}
      initialValue={baseline}
      dirty={dirty}
      status={formStatus}
      error={saveError}
      successMessage={successMessage}
      validationErrors={validationErrors}
      onChange={(next) => {
        currentDraft.current = next
        setValue(next)
        setValidationErrors({})
        if (formStatus === "success") {
          setFormStatus("idle")
          setSuccessMessage(undefined)
        }
      }}
      onSubmit={saveCustomer}
      onCancel={closeEditor}
      onCancelRequest={standalone ? undefined : requestClose}
    />
  )

  return (
    <>
      {standalone ? (
        <div ref={standaloneContainer} className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">{form}</div>
      ) : (
        <AdminCustomers
          customers={customers}
          query={query}
          onQueryChange={setQuery}
          status={listStatus}
          successMessage={successMessage}
          onRetry={retryCustomers}
          onAdd={() => editCustomer(null)}
          onEdit={(customer) => editCustomer(customers.find((record) => record.id === customer.id) ?? null)}
        />
      )}
      <p className="mx-auto max-w-5xl px-6 pb-6 text-xs text-muted-foreground">
        Interactive demo: saving takes 700 ms. Changes stay in this preview until reload; no backend is connected.
      </p>
      {!standalone && (
        <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose() }}>
          <DialogContent
            className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
            showCloseButton={formStatus !== "submitting"}
            onEscapeKeyDown={(event) => { event.preventDefault(); requestClose() }}
            onPointerDownOutside={(event) => { event.preventDefault(); requestClose() }}
            onInteractOutside={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus() }}
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle>
              <DialogDescription>Keep contact details and the customer segment up to date.</DialogDescription>
            </DialogHeader>
            {form}
          </DialogContent>
        </Dialog>
      )}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent onCloseAutoFocus={(event) => {
          event.preventDefault()
          requestAnimationFrame(() => {
            if (!open && !standalone) restoreFocus()
            else if (confirmationTrigger.current?.isConnected) confirmationTrigger.current.focus()
            discardPending.current = false
          })
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>Your changes haven't been saved. Keep editing to preserve them, or discard to leave.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={closeEditor}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function AdminCustomersOneDemo() {
  return <CustomerJourneyDemo />
}
