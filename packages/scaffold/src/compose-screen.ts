/** Deterministic consumer host for the grounded customer pair. This is local
 * demonstration state, not a backend adapter or behavior evidence. */
export function customerScreenSource({ list, form, language }: { list: boolean; form: boolean; language: string }): string {
  const spanish = language === "es"
  const listCopy = spanish ? { title: "Clientes", description: "Gestiona tus relaciones con los clientes.", add: "Añadir cliente", listTitle: "Todos los clientes", search: "Buscar clientes", total: "Clientes totales", active: "Clientes activos", new: "Clientes nuevos", customer: "Cliente", orders: "Pedidos", spent: "Importe", lastOrder: "Último pedido", segment: "Segmento", actions: "Acciones", edit: "Editar", loading: "Cargando clientes…", emptyTitle: "Todavía no hay clientes", emptyDescription: "Añade tu primer cliente para comenzar.", noResults: "Ningún cliente coincide", clearSearch: "Borrar búsqueda", error: "No se pudieron cargar los clientes. Inténtalo otra vez.", retry: "Reintentar", permissionDenied: "No tienes permiso para gestionar clientes.", readOnly: "Los datos de los clientes son de solo lectura.", results: "Mostrando {shown} de {total}", activeSegment: "Activo", newSegment: "Nuevo", churnedSegment: "Inactivo" } : {}
  const formCopy = spanish ? { title: "Datos del cliente", description: "Actualiza el nombre y la dirección de correo electrónico.", name: "Nombre completo", email: "Correo electrónico", save: "Guardar cliente", saving: "Guardando cliente…", cancel: "Cancelar", error: "No se pudo guardar. Tus cambios siguen aquí. Inténtalo otra vez.", success: "Cliente guardado.", permissionDenied: "No tienes permiso para guardar este cliente.", loading: "Cargando cliente…", nameRequired: "Introduce un nombre.", emailInvalid: "Introduce un correo electrónico válido.", unsaved: "Tienes cambios sin guardar.", discardTitle: "¿Quieres descartar los cambios sin guardar?", discard: "Descartar cambios", keepEditing: "Seguir editando" } : {}
  const labels = spanish ? { sample: "Datos de ejemplo: se restablecen al recargar.", list: "Estado de la lista", saved: "Próximo guardado", idle: "Listo", loading: "Cargando", error: "Error recuperable", denied: "Permiso denegado", success: "Guardar", empty: "Vaciar lista", reset: "Restaurar ejemplo" } : { sample: "Sample data: resets on reload.", list: "List state", saved: "Next save", idle: "Ready", loading: "Loading", error: "Recoverable error", denied: "Permission denied", success: "Save", empty: "Empty list", reset: "Reset sample" }
  return `"use client"
import * as React from "react"
${list ? 'import { AdminCustomers } from "@/components/admin-customers-01/admin-customers"' : ""}
${form ? 'import { CustomerEdit } from "@/components/customer-edit-01/customer-edit"' : ""}
import { composition } from "@/components/composition-config"

type Draft = { name: string; email: string }
type DemoCustomer = Draft & { id: string; orders: number; spent: string; lastOrder: string; segment: "active" | "new" | "churned" }
type ListState = "idle" | "loading" | "error" | "permission-denied"
type SaveState = "idle" | "loading" | "submitting" | "error" | "success" | "permission-denied"
const samples: DemoCustomer[] = [
  { id: "alex", name: "Alex Morgan", email: "alex@example.test", orders: 3, spent: "$30", lastOrder: "2026-09-01", segment: "active" },
  { id: "mina", name: "Mina Patel", email: "mina@example.test", orders: 0, spent: "$0", lastOrder: "—", segment: "new" },
]
const blank = (id: string): DemoCustomer => ({ id, name: "", email: "", orders: 0, spent: "$0", lastOrder: "—", segment: "new" })
const listCopy = ${JSON.stringify(listCopy)}
const formCopy = ${JSON.stringify(formCopy)}
const labels = ${JSON.stringify(labels)}

export function CompositionScreen({ showList, showForm }: { showList: boolean; showForm: boolean }) {
  const listId = React.useId()
  const saveId = React.useId()
  const [customers, setCustomers] = React.useState(samples)
  const [listState, setListState] = React.useState<ListState>("idle")
  const [editing, setEditing] = React.useState<DemoCustomer | null>(showList ? null : blank("new"))
  const [value, setValue] = React.useState<Draft>({ name: "", email: "" })
  const [saved, setSaved] = React.useState(value)
  const [saveState, setSaveState] = React.useState<SaveState>("idle")
  const [nextSave, setNextSave] = React.useState<"success" | "error" | "permission-denied">("success")
  const opener = React.useRef<HTMLElement | null>(null)
  const region = React.useRef<HTMLDivElement>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saving = React.useRef(false)
  const nextId = React.useRef(0)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  React.useEffect(() => { if (editing) region.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus() }, [editing?.id])
  const dirty = !!editing && (value.name !== saved.name || value.email !== saved.email)
  React.useEffect(() => {
    if (!dirty && !saving.current) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", protect)
    return () => window.removeEventListener("beforeunload", protect)
  }, [dirty, saveState])
  const open = (customer: DemoCustomer) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const draft = { name: customer.name, email: customer.email }
    setValue(draft); setSaved(draft); setSaveState("idle"); setEditing(customer)
  }
  const close = () => {
    setEditing(showList ? null : blank("new")); setValue({ name: "", email: "" }); setSaved({ name: "", email: "" }); setSaveState("idle")
    setTimeout(() => opener.current?.focus(), 0)
  }
  const save = (draft: Draft) => {
    if (!editing || saving.current || saveState === "permission-denied") return
    saving.current = true; setSaveState("submitting")
    timer.current = setTimeout(() => {
      saving.current = false
      if (nextSave === "error") { setSaveState("error"); setNextSave("success"); return }
      if (nextSave === "permission-denied") { setSaveState("permission-denied"); return }
      const updated = { ...editing, ...draft }
      setCustomers(previous => previous.some(customer => customer.id === editing.id) ? previous.map(customer => customer.id === editing.id ? updated : customer) : [...previous, updated])
      setValue(draft); setSaved(draft); setSaveState("success")
    }, 450)
  }
  return <main className="min-h-screen bg-background text-foreground">
    <nav aria-label=${JSON.stringify(spanish ? "Páginas" : "Pages")} className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 pt-4">
      {composition.pages.map(page => <a key={page.route} href={page.route} className="inline-flex min-h-11 items-center break-all underline" onClick={event => { if (saving.current || (dirty && !window.confirm(${JSON.stringify(spanish ? "¿Quieres descartar los cambios sin guardar?" : "Discard unsaved changes?")}))) event.preventDefault() }}>{page.route}</a>)}
    </nav>
    <p className="mx-auto max-w-5xl px-4 pt-2 text-sm text-muted-foreground">{labels.sample}</p>
    {!showList && <h1 className="mx-auto max-w-5xl px-4 pt-4 text-2xl font-bold">{composition.title}</h1>}
    <section aria-label=${JSON.stringify(spanish ? "Opciones del ejemplo" : "Sample controls")} className="mx-auto flex max-w-5xl flex-wrap items-end gap-4 px-4 pt-4 text-sm">
      ${list ? `{showList && <><div className="flex flex-col gap-1"><label htmlFor={listId}>{labels.list}</label><select id={listId} className="min-h-11 rounded border bg-background px-2" disabled={!!editing} value={listState} onChange={event => setListState(event.target.value as ListState)}><option value="idle">{labels.idle}</option><option value="loading">{labels.loading}</option><option value="error">{labels.error}</option><option value="permission-denied">{labels.denied}</option></select></div><button className="min-h-11 rounded border px-3" disabled={!!editing} onClick={() => setCustomers([])}>{labels.empty}</button><button className="min-h-11 rounded border px-3" disabled={!!editing} onClick={() => { setCustomers(samples); setListState("idle") }}>{labels.reset}</button></>}` : ""}
      ${form ? `{showForm && <div className="flex flex-col gap-1"><label htmlFor={saveId}>{labels.saved}</label><select id={saveId} className="min-h-11 rounded border bg-background px-2" disabled={saveState === "submitting"} value={nextSave} onChange={event => setNextSave(event.target.value as typeof nextSave)}><option value="success">{labels.success}</option><option value="error">{labels.error}</option><option value="permission-denied">{labels.denied}</option></select></div>}` : ""}
    </section>
    ${list ? `<>{showList && <AdminCustomers customers={customers} status={listState} canEdit={showForm && !editing} copy={listCopy} onRetry={() => { setListState("loading"); timer.current = setTimeout(() => setListState("idle"), 300) }} ${form ? 'onCreate={showForm ? () => open(blank("created-" + ++nextId.current)) : undefined} onEdit={showForm ? customer => open(customer as DemoCustomer) : undefined}' : ""} />}</>` : ""}
    ${form ? `{showForm && editing && <div ref={region}><CustomerEdit key={editing.id} value={value} savedValue={saved} status={saveState} copy={formCopy} onValueChange={draft => { setValue(draft); setSaveState("idle") }} onSave={save} onCancel={close} /></div>}` : ""}
  </main>
}
`
}
