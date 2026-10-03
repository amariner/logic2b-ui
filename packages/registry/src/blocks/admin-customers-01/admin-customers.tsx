"use client"

import * as React from "react"
import { SearchIcon, UserPlusIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/registry/ui/alert"
import { Avatar, AvatarFallback } from "@/registry/ui/avatar"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"
import { Skeleton } from "@/registry/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/registry/ui/table"

export type CustomerSegment = "active" | "new" | "churned"

export interface CustomerRecord {
  id: string
  name: string
  email: string
  orders: number
  spent: string
  lastOrder: string
  segment: CustomerSegment
}

export interface AdminCustomersContent {
  title: string
  description: string
  addCustomer: string
  totalCustomers: string
  activeCustomers: string
  newCustomers: string
  allCustomers: string
  showingCustomers: string
  searchLabel: string
  searchPlaceholder: string
  customerColumn: string
  ordersColumn: string
  spentColumn: string
  lastOrderColumn: string
  segmentColumn: string
  actionsColumn: string
  activeSegment: string
  newSegment: string
  churnedSegment: string
  editCustomer: string
  editLabel: string
  loading: string
  emptyTitle: string
  emptyDescription: string
  noResultsTitle: string
  noResultsDescription: string
  clearSearch: string
  errorTitle: string
  errorDescription: string
  retry: string
  permissionTitle: string
  permissionDescription: string
  readOnly: string
}

export const content: AdminCustomersContent = {
  title: "Customers",
  description: "Your customer base, segments and lifetime value.",
  addCustomer: "Add customer",
  totalCustomers: "Total customers",
  activeCustomers: "Active customers",
  newCustomers: "New customers",
  allCustomers: "All customers",
  showingCustomers: "Showing {visible} of {total} customers",
  searchLabel: "Search customers",
  searchPlaceholder: "Search by name or email...",
  customerColumn: "Customer",
  ordersColumn: "Orders",
  spentColumn: "Spent",
  lastOrderColumn: "Last order",
  segmentColumn: "Segment",
  actionsColumn: "Actions",
  activeSegment: "Active",
  newSegment: "New",
  churnedSegment: "Churned",
  editCustomer: "Edit {name}",
  editLabel: "Edit",
  loading: "Loading customers...",
  emptyTitle: "No customers yet",
  emptyDescription: "Add your first customer to start building your customer base.",
  noResultsTitle: "No matching customers",
  noResultsDescription: "Try another name or email, or clear the search to see all customers.",
  clearSearch: "Clear search",
  errorTitle: "Customers could not be loaded",
  errorDescription: "Your search is preserved. Try loading the customer list again.",
  retry: "Try again",
  permissionTitle: "You cannot view customers",
  permissionDescription: "Ask your workspace administrator for access to customer records.",
  readOnly: "You can view customers. Ask your workspace administrator for permission to add or edit them.",
}

export const sampleCustomers: CustomerRecord[] = [
  { id: "olivia", name: "Olivia Martin", email: "olivia@example.com", orders: 24, spent: "$3,120", lastOrder: "2026-07-14", segment: "active" },
  { id: "jackson", name: "Jackson Lee", email: "jackson@example.com", orders: 2, spent: "$168", lastOrder: "2026-07-10", segment: "new" },
  { id: "isabella", name: "Isabella Nguyen", email: "isabella@example.com", orders: 41, spent: "$6,540", lastOrder: "2026-07-13", segment: "active" },
  { id: "william", name: "William Kim", email: "william@example.com", orders: 8, spent: "$742", lastOrder: "2026-02-18", segment: "churned" },
  { id: "sofia", name: "Sofia Davis", email: "sofia@example.com", orders: 1, spent: "$18", lastOrder: "2026-07-12", segment: "new" },
  { id: "liam", name: "Liam Johnson", email: "liam@example.com", orders: 17, spent: "$2,410", lastOrder: "2026-07-09", segment: "active" },
]

export interface AdminCustomersProps extends Omit<React.ComponentProps<"div">, "content"> {
  customers?: CustomerRecord[]
  status?: "success" | "loading" | "error" | "permission-denied"
  query?: string
  onQueryChange?: (query: string) => void
  onAdd?: () => void
  onEdit?: (customer: CustomerRecord) => void
  onRetry?: () => void
  canWrite?: boolean
  error?: string
  successMessage?: string
  content?: Partial<AdminCustomersContent>
}

const segmentVariant: Record<CustomerSegment, "default" | "secondary" | "outline"> = {
  active: "default", new: "secondary", churned: "outline",
}
const initials = (name: string) => name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("")

/** The consumer owns data, permissions and action outcomes. This block never fetches. */
export function AdminCustomers({
  customers = sampleCustomers, status = "success", query: controlledQuery,
  onQueryChange, onAdd, onEdit, onRetry, canWrite = true, error, successMessage,
  content: customContent, className, ...props
}: AdminCustomersProps) {
  const copy = { ...content, ...customContent }
  const [localQuery, setLocalQuery] = React.useState("")
  const query = controlledQuery ?? localQuery
  const available = status === "success"
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = customers.filter((customer) =>
    customer.name.toLowerCase().includes(normalizedQuery) || customer.email.toLowerCase().includes(normalizedQuery)
  )
  const countDescription = copy.showingCustomers.replace("{visible}", String(filtered.length)).replace("{total}", String(customers.length))
  const segments = { active: copy.activeSegment, new: copy.newSegment, churned: copy.churnedSegment }
  const kpis = [
    { label: copy.totalCustomers, value: customers.length },
    { label: copy.activeCustomers, value: customers.filter((customer) => customer.segment === "active").length },
    { label: copy.newCustomers, value: customers.filter((customer) => customer.segment === "new").length },
  ]
  function changeQuery(nextQuery: string) {
    if (controlledQuery === undefined) setLocalQuery(nextQuery)
    onQueryChange?.(nextQuery)
  }
  const announcement = status === "loading" ? copy.loading : available ? (
    customers.length === 0 ? copy.emptyTitle : filtered.length === 0 ? copy.noResultsTitle : countDescription
  ) : ""

  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 py-10 sm:px-6", className)} {...props}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">{copy.title}</h1>
          <p className="text-muted-foreground text-sm">{copy.description}</p>
        </div>
        <Button className="min-h-11" onClick={onAdd} disabled={!available || !canWrite || !onAdd}>
          <UserPlusIcon className="size-4" aria-hidden="true" />{copy.addCustomer}
        </Button>
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      {successMessage && available && <Alert role="status" className="mb-6"><AlertDescription>{successMessage}</AlertDescription></Alert>}
      {!canWrite && available && <p className="text-muted-foreground mb-6 text-sm">{copy.readOnly}</p>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3" aria-hidden={!available}>
        {kpis.map((kpi) => (
          <Card key={kpi.label}><CardHeader className="pb-2">
            <CardDescription>{kpi.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{status === "loading" ? <Skeleton className="h-8 w-16" /> : available ? kpi.value : "—"}</CardTitle>
          </CardHeader></Card>
        ))}
      </div>
      <Card aria-busy={status === "loading"}>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1.5"><CardTitle>{copy.allCustomers}</CardTitle>{available && <CardDescription>{countDescription}</CardDescription>}</div>
          {status !== "permission-denied" && (
            <div className="relative w-full sm:w-[260px]">
              <SearchIcon className="text-muted-foreground absolute top-3.5 left-3 size-4" aria-hidden="true" />
              <Input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder={copy.searchPlaceholder}
                className="min-h-11 w-full pl-9" aria-label={copy.searchLabel} type="search" maxLength={256} />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <div className="grid gap-4 py-2"><p className="text-muted-foreground text-sm">{copy.loading}</p>
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
            </div>
          ) : status === "error" ? (
            <Alert variant="destructive"><AlertTitle>{copy.errorTitle}</AlertTitle><AlertDescription>
              <p>{error ?? copy.errorDescription}</p><Button variant="outline" className="mt-3 min-h-11" onClick={onRetry} disabled={!onRetry}>{copy.retry}</Button>
            </AlertDescription></Alert>
          ) : status === "permission-denied" ? (
            <Alert><AlertTitle>{copy.permissionTitle}</AlertTitle><AlertDescription>{copy.permissionDescription}</AlertDescription></Alert>
          ) : customers.length === 0 || filtered.length === 0 ? (
            <div className="grid justify-items-center gap-3 py-12 text-center">
              <h2 className="text-base font-semibold">{customers.length === 0 ? copy.emptyTitle : copy.noResultsTitle}</h2>
              <p className="text-muted-foreground max-w-sm text-sm">{customers.length === 0 ? copy.emptyDescription : copy.noResultsDescription}</p>
              {customers.length === 0 ? <Button className="min-h-11" onClick={onAdd} disabled={!canWrite || !onAdd}>{copy.addCustomer}</Button>
                : <Button variant="outline" className="min-h-11" onClick={() => changeQuery("")}>{copy.clearSearch}</Button>}
            </div>
          ) : (
            <Table className="table-fixed sm:table-auto">
              <caption className="sr-only">{copy.allCustomers}</caption>
              <TableHeader><TableRow>
                <TableHead scope="col">{copy.customerColumn}</TableHead>
                <TableHead scope="col" className="hidden sm:table-cell">{copy.ordersColumn}</TableHead>
                <TableHead scope="col" className="hidden text-right sm:table-cell">{copy.spentColumn}</TableHead>
                <TableHead scope="col" className="hidden md:table-cell">{copy.lastOrderColumn}</TableHead>
                <TableHead scope="col" className="hidden sm:table-cell">{copy.segmentColumn}</TableHead>
                <TableHead scope="col" className="w-16"><span className="sr-only">{copy.actionsColumn}</span></TableHead>
              </TableRow></TableHeader>
              <TableBody>{filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell><div className="flex min-w-0 items-center gap-2">
                    <Avatar className="hidden size-8 shrink-0 sm:flex" aria-hidden="true"><AvatarFallback className="text-xs">{initials(customer.name)}</AvatarFallback></Avatar>
                    <div className="min-w-0"><p className="text-sm font-medium wrap-break-word whitespace-normal">{customer.name}</p><p className="text-muted-foreground text-xs break-all whitespace-normal">{customer.email}</p>
                      <p className="text-muted-foreground mt-1 text-xs sm:hidden">{segments[customer.segment]}</p>
                    </div>
                  </div></TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{customer.orders}</TableCell>
                  <TableCell className="hidden text-right font-medium tabular-nums sm:table-cell">{customer.spent}</TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">{customer.lastOrder}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant={segmentVariant[customer.segment]}>{segments[customer.segment]}</Badge></TableCell>
                  <TableCell><Button variant="ghost" className="min-h-11 min-w-11 px-2" aria-label={copy.editCustomer.replace("{name}", customer.name)} onClick={() => onEdit?.(customer)} disabled={!canWrite || !onEdit}>{copy.editLabel}</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
