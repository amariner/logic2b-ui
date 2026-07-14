"use client"

import * as React from "react"
import { MoreHorizontalIcon, SearchIcon, UserPlusIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Avatar, AvatarFallback } from "@/registry/ui/avatar"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu"
import { Input } from "@/registry/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/ui/table"

type Segment = "active" | "new" | "churned"
type Customer = {
  name: string
  email: string
  orders: number
  spent: string
  lastOrder: string
  segment: Segment
}

const KPIS = [
  { label: "Total customers", value: "8,942" },
  { label: "New this month", value: "312" },
  { label: "Repeat rate", value: "48%" },
]

const CUSTOMERS: Customer[] = [
  { name: "Olivia Martin", email: "olivia@example.com", orders: 24, spent: "$3,120", lastOrder: "2026-07-14", segment: "active" },
  { name: "Jackson Lee", email: "jackson@example.com", orders: 2, spent: "$168", lastOrder: "2026-07-10", segment: "new" },
  { name: "Isabella Nguyen", email: "isabella@example.com", orders: 41, spent: "$6,540", lastOrder: "2026-07-13", segment: "active" },
  { name: "William Kim", email: "william@example.com", orders: 8, spent: "$742", lastOrder: "2026-02-18", segment: "churned" },
  { name: "Sofia Davis", email: "sofia@example.com", orders: 1, spent: "$18", lastOrder: "2026-07-12", segment: "new" },
  { name: "Liam Johnson", email: "liam@example.com", orders: 17, spent: "$2,410", lastOrder: "2026-07-09", segment: "active" },
]

const SEGMENT_VARIANT: Record<Segment, "default" | "secondary" | "outline"> = {
  active: "default",
  new: "secondary",
  churned: "outline",
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")

export function AdminCustomers({ className, ...props }: React.ComponentProps<"div">) {
  const [query, setQuery] = React.useState("")

  const filtered = CUSTOMERS.filter((c) => {
    const q = query.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  return (
    <div className={cn("mx-auto w-full max-w-5xl px-6 py-10", className)} {...props}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">
            Your customer base, segments and lifetime value.
          </p>
        </div>
        <Button>
          <UserPlusIcon className="size-4" />
          Add customer
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="grid gap-1.5">
            <CardTitle>All customers</CardTitle>
            <CardDescription>Showing {filtered.length} of {CUSTOMERS.length}</CardDescription>
          </div>
          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-8 sm:w-[240px]"
              aria-label="Search customers"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Orders</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="hidden md:table-cell">Last order</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.email}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{c.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">{c.orders}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{c.spent}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{c.lastOrder}</TableCell>
                  <TableCell>
                    <Badge variant={SEGMENT_VARIANT[c.segment]}>{c.segment}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${c.name}`}>
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View profile</DropdownMenuItem>
                        <DropdownMenuItem>Email customer</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
