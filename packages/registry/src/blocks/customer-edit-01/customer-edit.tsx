"use client"
import * as React from "react"
import { cn } from "@/registry/lib/utils"
import { Button } from "@/registry/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"

export interface CustomerDraft { name: string; email: string }
export const content = {
  title: "Customer details", description: "Update the name and email address for this customer.",
  name: "Full name", email: "Email address", save: "Save customer", saving: "Saving customer…",
  cancel: "Cancel", error: "The customer could not be saved. Your changes are still here. Try again.",
  success: "Customer saved.", permissionDenied: "You do not have permission to save this customer.",
  loading: "Loading customer…", nameRequired: "Enter a name.", emailInvalid: "Enter a valid email address.",
  unsaved: "You have unsaved changes.", discardTitle: "Discard your unsaved changes?",
  discard: "Discard changes", keepEditing: "Keep editing",
}
export type CustomerEditStatus = "idle" | "loading" | "submitting" | "error" | "success" | "permission-denied"
export interface CustomerEditProps extends Omit<React.ComponentProps<"form">, "onChange" | "onSubmit"> {
  value: CustomerDraft
  savedValue: CustomerDraft
  onValueChange: (value: CustomerDraft) => void
  onSave?: (value: CustomerDraft) => void
  onCancel?: () => void
  status?: CustomerEditStatus
  fieldErrors?: Partial<Record<keyof CustomerDraft, string>>
  copy?: Partial<typeof content>
}
/** Consumer owns persistence, status, record switching and server permissions. */
export function CustomerEdit({ value, savedValue, onValueChange, onSave, onCancel, status = "idle", fieldErrors, copy, className, ...props }: CustomerEditProps) {
  const text = { ...content, ...copy }
  const id = React.useId()
  const [errors, setErrors] = React.useState<Partial<Record<keyof CustomerDraft, string>>>({})
  const [confirmDiscard, setConfirmDiscard] = React.useState(false)
  const nameRef = React.useRef<HTMLInputElement>(null)
  const emailRef = React.useRef<HTMLInputElement>(null)
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const keepRef = React.useRef<HTMLButtonElement>(null)
  const dirty = value.name !== savedValue.name || value.email !== savedValue.email
  const disabled = status === "loading" || status === "submitting" || status === "permission-denied"
  const shownErrors = { ...fieldErrors, ...errors }
  React.useEffect(() => { if (confirmDiscard) keepRef.current?.focus() }, [confirmDiscard])
  React.useEffect(() => { if (disabled) setConfirmDiscard(false) }, [disabled])
  const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || !onSave) return
    const next: typeof errors = {}
    if (!value.name.trim()) next.name = text.nameRequired
    if (!value.email.trim() || emailRef.current?.validity.typeMismatch) next.email = text.emailInvalid
    setErrors(next)
    if (next.name) { nameRef.current?.focus(); return }
    if (next.email) { emailRef.current?.focus(); return }
    setConfirmDiscard(false)
    onSave({ name: value.name.trim(), email: value.email.trim() })
  }
  const change = (key: keyof CustomerDraft, next: string) => {
    setErrors(previous => { const result = { ...previous }; delete result[key]; return result })
    onValueChange({ ...value, [key]: next })
  }
  return <form {...props} noValidate onSubmit={submit} className={cn("mx-auto w-full max-w-xl px-4 py-10 sm:px-6", className)} aria-labelledby={`${id}-title`} aria-busy={status === "loading" || status === "submitting"}>
    <Card><CardHeader><CardTitle id={`${id}-title`}>{text.title}</CardTitle><CardDescription>{text.description}</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {status === "loading" && <p role="status">{text.loading}</p>}
        {status === "error" && <p role="alert" className="text-sm text-foreground">{text.error}</p>}
        {status === "permission-denied" && <p role="alert">{text.permissionDenied}</p>}
        <p role="status" className="text-sm text-muted-foreground">{status === "submitting" ? text.saving : status === "success" && !dirty ? text.success : dirty ? text.unsaved : null}</p>
        <div className="space-y-2"><Label htmlFor={`${id}-name`}>{text.name}</Label><Input ref={nameRef} id={`${id}-name`} name="name" autoComplete="name" required maxLength={200} value={value.name} onChange={e => change("name", e.target.value)} disabled={disabled} aria-invalid={!!shownErrors.name} aria-describedby={shownErrors.name ? `${id}-name-error` : undefined} className="min-h-11 min-w-11" />{shownErrors.name && <p id={`${id}-name-error`} className="text-sm text-foreground">{shownErrors.name}</p>}</div>
        <div className="space-y-2"><Label htmlFor={`${id}-email`}>{text.email}</Label><Input ref={emailRef} id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} value={value.email} onChange={e => change("email", e.target.value)} disabled={disabled} aria-invalid={!!shownErrors.email} aria-describedby={shownErrors.email ? `${id}-email-error` : undefined} className="min-h-11 min-w-11" />{shownErrors.email && <p id={`${id}-email-error`} className="text-sm text-foreground">{shownErrors.email}</p>}</div>
        <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11 min-w-11" disabled={disabled || !onSave}>{status === "submitting" ? text.saving : text.save}</Button><Button ref={cancelRef} type="button" className="min-h-11 min-w-11" variant="outline" disabled={status === "submitting" || !onCancel} onClick={() => dirty ? setConfirmDiscard(true) : onCancel?.()}>{text.cancel}</Button></div>
        {confirmDiscard && <div role="group" aria-labelledby={`${id}-discard`} className="space-y-3 rounded-md border p-4"><p id={`${id}-discard`}>{text.discardTitle}</p><div className="flex flex-wrap gap-2"><Button ref={keepRef} type="button" className="min-h-11 min-w-11" variant="outline" onClick={() => { setConfirmDiscard(false); cancelRef.current?.focus() }}>{text.keepEditing}</Button><Button type="button" className="min-h-11 min-w-11" variant="destructive" onClick={onCancel}>{text.discard}</Button></div></div>}
      </CardContent>
    </Card>
  </form>
}
