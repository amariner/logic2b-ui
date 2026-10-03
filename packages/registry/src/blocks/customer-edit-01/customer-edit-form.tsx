"use client"

import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/registry/ui/alert"
import { Button } from "@/registry/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
import { Skeleton } from "@/registry/ui/skeleton"

export interface CustomerEditValue {
  name: string
  email: string
  company: string
  segment: "active" | "new" | "churned"
}

export type CustomerEditStatus = "idle" | "loading" | "submitting" | "error" | "success" | "permission-denied"
export type CustomerEditErrors = Partial<Record<keyof CustomerEditValue, string>>

export interface CustomerEditContent {
  title: string
  description: string
  nameLabel: string
  nameHint: string
  emailLabel: string
  emailHint: string
  companyLabel: string
  companyHint: string
  segmentLabel: string
  segmentHint: string
  activeSegment: string
  newSegment: string
  churnedSegment: string
  save: string
  saving: string
  retry: string
  cancel: string
  loading: string
  validationTitle: string
  nameRequired: string
  emailRequired: string
  emailInvalid: string
  segmentInvalid: string
  errorTitle: string
  errorDescription: string
  successTitle: string
  successDescription: string
  permissionTitle: string
  permissionDescription: string
  unsavedChanges: string
  discardTitle: string
  discardDescription: string
  keepEditing: string
  discardChanges: string
}

export const content: CustomerEditContent = {
  title: "Customer details",
  description: "Keep customer information up to date. Name and email are required.",
  nameLabel: "Name",
  nameHint: "Use the customer's full name.",
  emailLabel: "Email",
  emailHint: "Enter a valid email address.",
  companyLabel: "Company",
  companyHint: "Optional. Add the company this customer belongs to.",
  segmentLabel: "Segment",
  segmentHint: "Choose the segment that best describes this customer.",
  activeSegment: "Active",
  newSegment: "New",
  churnedSegment: "Churned",
  save: "Save customer",
  saving: "Saving customer...",
  retry: "Try saving again",
  cancel: "Cancel",
  loading: "Loading customer details...",
  validationTitle: "Check the highlighted fields.",
  nameRequired: "Enter a customer name.",
  emailRequired: "Enter an email address.",
  emailInvalid: "Enter a valid email address, such as name@example.com.",
  segmentInvalid: "Choose a customer segment.",
  errorTitle: "Customer could not be saved",
  errorDescription: "Your changes are still here. Try saving again.",
  successTitle: "Customer saved",
  successDescription: "Your changes have been saved.",
  permissionTitle: "You cannot edit this customer",
  permissionDescription: "Ask your workspace administrator for permission to add or edit customers.",
  unsavedChanges: "You have unsaved changes.",
  discardTitle: "Discard unsaved changes?",
  discardDescription: "Your edits have not been saved. Keep editing or discard them.",
  keepEditing: "Keep editing",
  discardChanges: "Discard changes",
}

export interface CustomerEditFormProps extends Omit<React.ComponentProps<"div">, "content" | "onChange" | "onSubmit"> {
  value: CustomerEditValue
  onChange: (value: CustomerEditValue) => void
  onSubmit: (value: CustomerEditValue) => void
  onCancel?: () => void
  /** Supply this when a surrounding dialog owns every cancellation request and its confirmation. */
  onCancelRequest?: () => void
  /** The saved baseline. Without it the initial value is the baseline for this mounted form. */
  initialValue?: CustomerEditValue
  /** Override baseline comparison when the consumer tracks unsaved changes itself. */
  dirty?: boolean
  status?: CustomerEditStatus
  error?: string
  successMessage?: string
  validationErrors?: CustomerEditErrors
  content?: Partial<CustomerEditContent>
}

const sameValue = (left: CustomerEditValue, right: CustomerEditValue) =>
  left.name === right.name && left.email === right.email && left.company === right.company && left.segment === right.segment

function mergeErrors(local: CustomerEditErrors, external?: CustomerEditErrors): CustomerEditErrors {
  const result = { ...local }
  for (const field of ["name", "email", "company", "segment"] as const) {
    if (external?.[field]) result[field] = external[field]
  }
  return result
}

/** The consumer persists changes and supplies outcomes; failed saves never clear the controlled value. */
export function CustomerEditForm({
  value, onChange, onSubmit, onCancel, onCancelRequest, initialValue, dirty: controlledDirty,
  status = "idle", error, successMessage, validationErrors, content: customContent, className, ...props
}: CustomerEditFormProps) {
  const copy = { ...content, ...customContent }
  const id = React.useId()
  const nameRef = React.useRef<HTMLInputElement>(null)
  const emailRef = React.useRef<HTMLInputElement>(null)
  const companyRef = React.useRef<HTMLInputElement>(null)
  const segmentRef = React.useRef<HTMLSelectElement>(null)
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const keepEditingRef = React.useRef<HTMLButtonElement>(null)
  const previousStatus = React.useRef(status)
  const [savedValue, setSavedValue] = React.useState<CustomerEditValue>(() => ({ ...value }))
  const [localErrors, setLocalErrors] = React.useState<CustomerEditErrors>({})
  const [confirmDiscard, setConfirmDiscard] = React.useState(false)
  const errors = mergeErrors(localErrors, validationErrors)
  const invalid = Object.values(errors).some(Boolean)
  const dirty = controlledDirty ?? !sameValue(value, initialValue ?? savedValue)
  const busy = status === "submitting"
  const unavailable = status === "permission-denied" || status === "loading"

  React.useEffect(() => {
    if (status === "success" && previousStatus.current !== "success") {
      setSavedValue({ ...value })
      setLocalErrors({})
    }
    previousStatus.current = status
  }, [status, value])

  React.useEffect(() => {
    if (confirmDiscard) keepEditingRef.current?.focus()
  }, [confirmDiscard])

  function change(field: keyof CustomerEditValue, next: string) {
    setLocalErrors((current) => ({ ...current, [field]: undefined }))
    onChange({ ...value, [field]: next })
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || unavailable) return
    const nextErrors: CustomerEditErrors = {}
    if (!value.name.trim()) nextErrors.name = copy.nameRequired
    if (!value.email.trim()) nextErrors.email = copy.emailRequired
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())) nextErrors.email = copy.emailInvalid
    if (!["active", "new", "churned"].includes(value.segment)) nextErrors.segment = copy.segmentInvalid
    setLocalErrors(nextErrors)
    const submittedErrors = mergeErrors(nextErrors, validationErrors)
    if (Object.values(submittedErrors).some(Boolean)) {
      if (submittedErrors.name) nameRef.current?.focus()
      else if (submittedErrors.email) emailRef.current?.focus()
      else if (submittedErrors.company) companyRef.current?.focus()
      else if (submittedErrors.segment) segmentRef.current?.focus()
      return
    }
    setConfirmDiscard(false)
    onSubmit({ ...value, name: value.name.trim(), email: value.email.trim(), company: value.company.trim() })
  }

  function requestCancel() {
    if (busy || unavailable) return
    if (onCancelRequest) onCancelRequest()
    else if (dirty) setConfirmDiscard(true)
    else onCancel?.()
  }

  function keepEditing() {
    if (busy || unavailable) return
    setConfirmDiscard(false)
    cancelRef.current?.focus()
  }

  function discardChanges() {
    if (busy || unavailable) return
    setConfirmDiscard(false)
    onCancel?.()
  }

  return (
    <div className={cn("mx-auto w-full max-w-xl", className)} {...props}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{busy ? copy.saving : status === "loading" ? copy.loading : ""}</div>
      <Card>
        <CardHeader><CardTitle>{copy.title}</CardTitle><CardDescription>{copy.description}</CardDescription></CardHeader>
        <CardContent className="grid gap-5">
          {status === "permission-denied" ? (
            <Alert><AlertTitle>{copy.permissionTitle}</AlertTitle><AlertDescription>{copy.permissionDescription}</AlertDescription></Alert>
          ) : status === "loading" ? (
            <div aria-busy="true" className="grid gap-4"><p className="text-muted-foreground text-sm">{copy.loading}</p>
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}
            </div>
          ) : (
            <form noValidate onSubmit={submit} className="grid gap-5" aria-busy={busy}>
              {invalid && <Alert variant="destructive"><AlertDescription>{copy.validationTitle}</AlertDescription></Alert>}
              {status === "error" && <Alert variant="destructive"><AlertTitle>{copy.errorTitle}</AlertTitle><AlertDescription>{error ?? copy.errorDescription}</AlertDescription></Alert>}
              {status === "success" && <Alert role="status"><AlertTitle>{copy.successTitle}</AlertTitle><AlertDescription>{successMessage ?? copy.successDescription}</AlertDescription></Alert>}
              <fieldset disabled={busy} className="grid min-w-0 gap-5">
                <div className="grid gap-2">
                  <Label htmlFor={`${id}-name`}>{copy.nameLabel}</Label>
                  <Input ref={nameRef} id={`${id}-name`} value={value.name} onChange={(event) => change("name", event.target.value)}
                    autoComplete="name" required maxLength={120} className="min-h-11"
                    aria-invalid={Boolean(errors.name)} aria-describedby={`${id}-name-hint${errors.name ? ` ${id}-name-error` : ""}`} />
                  <p id={`${id}-name-hint`} className="text-muted-foreground text-xs">{copy.nameHint}</p>
                  {errors.name && <p id={`${id}-name-error`} className="text-destructive text-sm">{errors.name}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${id}-email`}>{copy.emailLabel}</Label>
                  <Input ref={emailRef} id={`${id}-email`} type="email" value={value.email} onChange={(event) => change("email", event.target.value)}
                    autoComplete="email" required maxLength={254} className="min-h-11"
                    aria-invalid={Boolean(errors.email)} aria-describedby={`${id}-email-hint${errors.email ? ` ${id}-email-error` : ""}`} />
                  <p id={`${id}-email-hint`} className="text-muted-foreground text-xs">{copy.emailHint}</p>
                  {errors.email && <p id={`${id}-email-error`} className="text-destructive text-sm">{errors.email}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${id}-company`}>{copy.companyLabel}</Label>
                  <Input ref={companyRef} id={`${id}-company`} value={value.company} onChange={(event) => change("company", event.target.value)}
                    autoComplete="organization" maxLength={160} className="min-h-11"
                    aria-invalid={Boolean(errors.company)} aria-describedby={`${id}-company-hint${errors.company ? ` ${id}-company-error` : ""}`} />
                  <p id={`${id}-company-hint`} className="text-muted-foreground text-xs">{copy.companyHint}</p>
                  {errors.company && <p id={`${id}-company-error`} className="text-destructive text-sm">{errors.company}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${id}-segment`}>{copy.segmentLabel}</Label>
                  <select ref={segmentRef} id={`${id}-segment`} value={value.segment} onChange={(event) => change("segment", event.target.value)}
                    required className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive min-h-11 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
                    aria-invalid={Boolean(errors.segment)} aria-describedby={`${id}-segment-hint${errors.segment ? ` ${id}-segment-error` : ""}`}>
                    <option value="active">{copy.activeSegment}</option><option value="new">{copy.newSegment}</option><option value="churned">{copy.churnedSegment}</option>
                  </select>
                  <p id={`${id}-segment-hint`} className="text-muted-foreground text-xs">{copy.segmentHint}</p>
                  {errors.segment && <p id={`${id}-segment-error`} className="text-destructive text-sm">{errors.segment}</p>}
                </div>
              </fieldset>
              {dirty && !busy && <p className="text-muted-foreground text-sm">{copy.unsavedChanges}</p>}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {(onCancel || onCancelRequest) && <Button ref={cancelRef} type="button" variant="outline" className="min-h-11" onClick={requestCancel} disabled={busy}>{copy.cancel}</Button>}
                <Button type="submit" className="min-h-11" disabled={busy}>{busy && <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{busy ? copy.saving : status === "error" ? copy.retry : copy.save}</Button>
              </div>
              {confirmDiscard && (
                <Alert><AlertTitle>{copy.discardTitle}</AlertTitle><AlertDescription>
                  <p>{copy.discardDescription}</p><div className="mt-3 flex w-full flex-col gap-2 sm:flex-row">
                    <Button ref={keepEditingRef} type="button" variant="outline" className="min-h-11" onClick={keepEditing} disabled={busy || unavailable}>{copy.keepEditing}</Button>
                    <Button type="button" variant="destructive" className="min-h-11" onClick={discardChanges} disabled={busy || unavailable}>{copy.discardChanges}</Button>
                  </div>
                </AlertDescription></Alert>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
