"use client"
import * as React from "react"
import { SearchIcon, UserPlusIcon } from "lucide-react"
import { cn } from "@/registry/lib/utils"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/registry/ui/table"

export type Segment = "active" | "new" | "churned"
export type Customer = {
  /** Stable across edits; email remains the fallback for existing consumers. */
  id?: string
  name: string
  email: string
  orders: number
  spent: string
  lastOrder: string
  segment: Segment
}
export const content = {
  title: "Customers", description: "Your customer base, segments and lifetime value.",
  add: "Add customer", listTitle: "All customers", search: "Search customers",
  total: "Total customers", active: "Active customers", new: "New customers",
  customer: "Customer", orders: "Orders", spent: "Spent", lastOrder: "Last order",
  segment: "Segment", actions: "Actions", edit: "Edit",
  loading: "Loading customers…", emptyTitle: "No customers yet", emptyDescription: "Add your first customer to get started.",
  noResults: "No matching customers", clearSearch: "Clear search",
  error: "Customers could not be loaded. Try again.", retry: "Try again",
  permissionDenied: "You do not have permission to manage customers.",
  readOnly: "Customer details are read-only.", results: "Showing {shown} of {total}",
  activeSegment: "Active", newSegment: "New", churnedSegment: "Churned",
}
export interface AdminCustomersProps extends React.ComponentProps<"div"> {
  customers?: Customer[]
  defaultQuery?: string
  status?: "idle" | "loading" | "error" | "permission-denied"
  canEdit?: boolean
  copy?: Partial<typeof content>
  onCreate?: () => void
  onEdit?: (customer: Customer) => void
  onRetry?: () => void
}
export function AdminCustomers({ customers = [], defaultQuery = "", status = "idle", canEdit = true, copy, onCreate, onEdit, onRetry, className, ...props }: AdminCustomersProps) {
  const text = { ...content, ...copy }
  const [query, setQuery] = React.useState(defaultQuery)
  const q = query.trim().toLocaleLowerCase()
  const filtered = customers.filter(c => `${c.name}\n${c.email}`.toLocaleLowerCase().includes(q))
  const ready = status === "idle"
  const labels = { active: text.activeSegment, new: text.newSegment, churned: text.churnedSegment }
  const variants = { active: "default", new: "secondary", churned: "outline" } as const
  return <div className={cn("mx-auto w-full max-w-5xl px-4 py-10 sm:px-6", className)} {...props}>
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1"><h1 className="font-heading text-2xl font-bold tracking-tight break-words">{text.title}</h1><p className="text-muted-foreground text-sm">{text.description}</p></div>
      <Button className="min-h-11 min-w-11" onClick={onCreate} disabled={!ready || !canEdit || !onCreate}><UserPlusIcon aria-hidden="true" />{text.add}</Button>
    </div>
    {ready && <div className="mb-6 grid gap-4 sm:grid-cols-3">
      {[{ label: text.total, value: customers.length }, { label: text.active, value: customers.filter(c => c.segment === "active").length }, { label: text.new, value: customers.filter(c => c.segment === "new").length }].map(kpi => <Card key={kpi.label}><CardHeader className="pb-2"><CardDescription>{kpi.label}</CardDescription><CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle></CardHeader></Card>)}
    </div>}
    {ready && !canEdit && <p className="mb-4 text-sm text-muted-foreground">{text.readOnly}</p>}
    <Card aria-busy={status === "loading"}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5"><CardTitle>{text.listTitle}</CardTitle>{ready && <CardDescription role="status">{text.results.replace("{shown}", String(filtered.length)).replace("{total}", String(customers.length))}</CardDescription>}</div>
        <div className="relative"><SearchIcon aria-hidden="true" className="text-muted-foreground absolute top-3.5 left-2.5 size-4" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder={text.search} className="min-h-11 min-w-11 w-full pl-8 sm:w-60" aria-label={text.search} disabled={!ready} /></div>
      </CardHeader>
      <CardContent>
        {status === "loading" && <p role="status" className="py-12 text-center text-muted-foreground">{text.loading}</p>}
        {status === "error" && <div className="space-y-4 py-8 text-center"><p role="alert">{text.error}</p><Button className="min-h-11 min-w-11" onClick={onRetry} disabled={!onRetry}>{text.retry}</Button></div>}
        {status === "permission-denied" && <p role="alert" className="py-8 text-center">{text.permissionDenied}</p>}
        {ready && customers.length === 0 && <div role="status" className="space-y-2 py-12 text-center"><h2 className="font-semibold">{text.emptyTitle}</h2><p className="text-muted-foreground text-sm">{text.emptyDescription}</p></div>}
        {ready && customers.length > 0 && filtered.length === 0 && <div className="space-y-4 py-12 text-center"><p role="status">{text.noResults}</p><Button className="min-h-11 min-w-11" variant="outline" onClick={() => setQuery("")}>{text.clearSearch}</Button></div>}
        {ready && filtered.length > 0 && <Table className="table-fixed">
          <TableHeader><TableRow><TableHead>{text.customer}</TableHead><TableHead className="hidden w-20 sm:table-cell">{text.orders}</TableHead><TableHead className="hidden w-24 text-right sm:table-cell">{text.spent}</TableHead><TableHead className="hidden w-28 md:table-cell">{text.lastOrder}</TableHead><TableHead className="w-20 sm:w-24">{text.segment}</TableHead><TableHead className="w-16"><span className="sr-only">{text.actions}</span></TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(c => <TableRow key={c.id ?? c.email}>
            <TableCell className="whitespace-normal"><p className="text-sm font-medium break-words">{c.name}</p><p className="text-muted-foreground text-xs break-all">{c.email}</p><p className="text-muted-foreground text-xs sm:hidden">{text.orders}: {c.orders} · {text.spent}: {c.spent}</p></TableCell>
            <TableCell className="hidden tabular-nums sm:table-cell">{c.orders}</TableCell><TableCell className="hidden text-right tabular-nums sm:table-cell">{c.spent}</TableCell><TableCell className="hidden tabular-nums md:table-cell">{c.lastOrder}</TableCell>
            <TableCell><Badge variant={variants[c.segment]} className="max-w-full whitespace-normal break-words">{labels[c.segment]}</Badge></TableCell><TableCell><Button className="min-h-11 min-w-11 px-2" variant="ghost" disabled={!canEdit || !onEdit} onClick={() => onEdit?.(c)} aria-label={`${text.edit} ${c.name}`}>{text.edit}</Button></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
      </CardContent>
    </Card>
  </div>
}
