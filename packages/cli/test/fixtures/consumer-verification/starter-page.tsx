import * as React from "react"
import { AdminCustomers, type Customer, type AdminCustomersProps } from "@/components/admin-customers-01/admin-customers"
import { CustomerEdit, type CustomerDraft, type CustomerEditStatus } from "@/components/customer-edit-01/customer-edit"

// Synthetic consumer data; no website demo or implementation expectation imports.
const initialCustomers: Customer[] = [
  { id: "zoe", name: "Zoe Chen", email: "zoe@example.test", orders: 8, spent: "$80", lastOrder: "2026-08-08", segment: "active" },
  { id: "alex", name: "Alex Morgan", email: "alex@example.test", orders: 8, spent: "$40", lastOrder: "2026-08-07", segment: "new" },
  { id: "mina", name: "Mina Patel", email: "mina@example.test", orders: 2, spent: "$20", lastOrder: "2026-08-06", segment: "churned" },
]
const longName = "Alejandra Fernández de la Vega — Responsable de relaciones internacionales y atención a clientes"
const listSpanish = {
  title: "Clientes", description: "Gestiona los datos y las relaciones con tus clientes.", add: "Añadir cliente",
  listTitle: "Todos los clientes", search: "Buscar clientes", total: "Clientes totales", active: "Clientes activos", new: "Clientes nuevos",
  customer: "Cliente", orders: "Pedidos", spent: "Importe", lastOrder: "Último pedido", segment: "Segmento", actions: "Acciones", edit: "Editar",
  loading: "Cargando clientes…", emptyTitle: "Todavía no hay clientes", emptyDescription: "Añade tu primer cliente para comenzar.",
  noResults: "Ningún cliente coincide", clearSearch: "Borrar búsqueda", error: "No se pudieron cargar los clientes. Inténtalo otra vez.", retry: "Reintentar",
  permissionDenied: "No tienes permiso para gestionar clientes.", readOnly: "Los datos de los clientes son de solo lectura.",
  results: "Mostrando {shown} de {total}", activeSegment: "Activo", newSegment: "Nuevo", churnedSegment: "Inactivo",
}
const editSpanish = {
  title: "Datos del cliente", description: "Actualiza el nombre y la dirección de correo electrónico.", name: "Nombre completo", email: "Correo electrónico",
  save: "Guardar cliente", saving: "Guardando cliente…", cancel: "Cancelar", error: "No se pudo guardar. Tus cambios siguen aquí. Inténtalo otra vez.",
  success: "Cliente guardado.", permissionDenied: "No tienes permiso para guardar este cliente.", loading: "Cargando cliente…",
  nameRequired: "Introduce un nombre.", emailInvalid: "Introduce un correo electrónico válido.", unsaved: "Tienes cambios sin guardar.",
  discardTitle: "¿Quieres descartar los cambios sin guardar?", discard: "Descartar cambios", keepEditing: "Seguir editando",
}

export function StarterPage() {
  const params = new URLSearchParams(window.location.search)
  const state = params.get("state") ?? "populated"
  const spanish = params.get("locale") === "es"
  const formState = state === "form-loading" ? "loading" : state === "form-submitting" ? "submitting" : null
  const [customers, setCustomers] = React.useState<Customer[]>(() => state === "empty" ? [] : initialCustomers.map((customer, index) => ({
    ...customer,
    ...(params.get("long") === "true" && index === 0 ? { name: longName, email: "alejandra.fernandez.atencion.internacional@example.test" } : {}),
  })))
  const [listState, setListState] = React.useState<AdminCustomersProps["status"]>(state === "loading" || state === "error" || state === "permission-denied" ? state : "idle")
  const [sort, setSort] = React.useState("original")
  const [editing, setEditing] = React.useState<Customer | null>(formState ? initialCustomers[0] : null)
  const initialDraft = formState ? { name: initialCustomers[0].name, email: initialCustomers[0].email } : { name: "", email: "" }
  const [value, setValue] = React.useState<CustomerDraft>(initialDraft)
  const [saved, setSaved] = React.useState<CustomerDraft>(initialDraft)
  const [saveState, setSaveState] = React.useState<CustomerEditStatus>(formState ?? "idle")
  const [nextSave, setNextSave] = React.useState("success")
  const [fieldErrors, setFieldErrors] = React.useState<Partial<CustomerDraft>>({})
  const opener = React.useRef<HTMLElement | null>(null)
  const formRegion = React.useRef<HTMLDivElement>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const nextId = React.useRef(0)
  const saving = React.useRef(false)
  React.useEffect(() => {
    document.documentElement.lang = spanish ? "es" : "en"
    document.documentElement.classList.toggle("dark", params.get("theme") === "dark")
    return () => clearTimeout(timer.current)
  }, [])
  React.useEffect(() => { if (editing && !formState) formRegion.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus() }, [editing?.id])

  const open = (customer: Customer) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const draft = { name: customer.name, email: customer.email }
    setValue(draft); setSaved(draft); setFieldErrors({}); setSaveState("idle"); setEditing(customer)
  }
  const save = (draft: CustomerDraft) => {
    if (!editing || saving.current || saveState === "permission-denied") return
    saving.current = true
    setSaveState("submitting"); setFieldErrors({})
    timer.current = setTimeout(() => {
      saving.current = false
      if (nextSave === "error") { setSaveState("error"); setNextSave("success"); return }
      if (nextSave === "permission-denied") { setSaveState("permission-denied"); return }
      if (customers.some(customer => customer.id !== editing.id && customer.email.toLowerCase() === draft.email.toLowerCase())) {
        setFieldErrors({ email: "A customer with this email already exists." }); setSaveState("error"); return
      }
      const updated = { ...editing, ...draft }
      setCustomers(previous => previous.some(customer => customer.id === editing.id)
        ? previous.map(customer => customer.id === editing.id ? updated : customer)
        : [...previous, updated])
      setValue(draft); setSaved(draft); setSaveState("success")
    }, 900)
  }
  // Sorting belongs to this consumer. Equal keys preserve original input order.
  const ordered = customers.map((customer, index) => ({ customer, index })).sort((a, b) =>
    (sort === "orders" ? a.customer.orders - b.customer.orders : sort === "name" ? a.customer.name.localeCompare(b.customer.name, "en") : 0) || a.index - b.index,
  ).map(entry => entry.customer)
  const sortedMessage = sort === "orders" ? "Sorted by order count, ascending." : sort === "name" ? "Sorted by name, ascending." : "Original customer order."

  return <main>
    <section aria-label={spanish ? "Controles de la aplicación de prueba" : "Consumer fixture controls"} className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 pt-4 text-sm">
      <label className="flex min-w-0 flex-col gap-1">{spanish ? "Estado de la lista" : "List state"}<select aria-label={spanish ? "Estado de la lista" : "List state"} className="min-h-11 max-w-full rounded border bg-background px-2" value={listState} onChange={event => setListState(event.target.value as AdminCustomersProps["status"])}>
        <option value="idle">Loaded</option><option value="loading">Loading</option><option value="error">Load failed</option><option value="permission-denied">Permission denied</option>
      </select></label>
      <label className="flex min-w-0 flex-col gap-1">{spanish ? "Ordenar clientes" : "Sort customers"}<select aria-label={spanish ? "Ordenar clientes" : "Sort customers"} className="min-h-11 max-w-full rounded border bg-background px-2" value={sort} onChange={event => setSort(event.target.value)}>
        <option value="original">Original order</option><option value="name">Name, ascending</option><option value="orders">Orders, ascending</option>
      </select></label>
      <label className="flex min-w-0 flex-col gap-1">{spanish ? "Siguiente guardado" : "Next save"}<select aria-label={spanish ? "Siguiente guardado" : "Next save"} className="min-h-11 max-w-full rounded border bg-background px-2" value={nextSave} disabled={saveState === "submitting"} onChange={event => setNextSave(event.target.value)}>
        <option value="success">Success</option><option value="error">Fail once</option><option value="permission-denied">Permission denied</option>
      </select></label>
      <p role="status" className="w-full text-muted-foreground">{sortedMessage}</p>
    </section>
    <AdminCustomers customers={ordered} status={listState} copy={spanish ? listSpanish : undefined} canEdit={!editing && state !== "read-only"}
      onRetry={() => { setListState("loading"); timer.current = setTimeout(() => setListState("idle"), 900) }}
      onCreate={() => open({ id: `created-${nextId.current++}`, name: "", email: "", orders: 0, spent: "$0", lastOrder: "—", segment: "new" })}
      onEdit={open} />
    {editing && <div ref={formRegion}><CustomerEdit key={editing.id} value={value} savedValue={saved} status={saveState} copy={spanish ? editSpanish : undefined} fieldErrors={fieldErrors}
      onValueChange={next => { setValue(next); setFieldErrors({}); setSaveState("idle") }} onSave={save}
      onCancel={() => { setEditing(null); setTimeout(() => opener.current?.focus(), 0) }} /></div>}
  </main>
}
