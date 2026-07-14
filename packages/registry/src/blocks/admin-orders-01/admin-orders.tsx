"use client"

import * as React from "react"
import {
  DownloadIcon,
  MoreHorizontalIcon,
  SearchIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"

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
import { Tabs, TabsList, TabsTrigger } from "@/registry/ui/tabs"

type OrderStatus = "paid" | "pending" | "refunded"
type Order = {
  id: string
  customer: string
  email: string
  date: string
  status: OrderStatus
  items: number
  total: string
}

const KPIS = [
  { label: "Revenue", value: "$48,120", delta: "+12.4%", up: true },
  { label: "Orders", value: "1,284", delta: "+8.2%", up: true },
  { label: "Avg. order value", value: "$37.48", delta: "+3.9%", up: true },
  { label: "Refunds", value: "24", delta: "-2", up: false },
]

const ORDERS: Order[] = [
  { id: "#3210", customer: "Olivia Martin", email: "olivia@example.com", date: "2026-07-14", status: "paid", items: 3, total: "$129.00" },
  { id: "#3209", customer: "Jackson Lee", email: "jackson@example.com", date: "2026-07-14", status: "pending", items: 1, total: "$39.00" },
  { id: "#3208", customer: "Isabella Nguyen", email: "isabella@example.com", date: "2026-07-13", status: "paid", items: 5, total: "$284.00" },
  { id: "#3207", customer: "William Kim", email: "william@example.com", date: "2026-07-13", status: "refunded", items: 2, total: "$68.00" },
  { id: "#3206", customer: "Sofia Davis", email: "sofia@example.com", date: "2026-07-12", status: "paid", items: 1, total: "$18.00" },
  { id: "#3205", customer: "Liam Johnson", email: "liam@example.com", date: "2026-07-12", status: "pending", items: 4, total: "$212.00" },
]

const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "outline"> = {
  paid: "default",
  pending: "secondary",
  refunded: "outline",
}

const TABS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "refunded", label: "Refunded" },
]

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")

export function AdminOrders({ className, ...props }: React.ComponentProps<"div">) {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<OrderStatus | "all">("all")

  const filtered = ORDERS.filter((order) => {
    const matchesStatus = status === "all" || order.status === status
    const q = query.toLowerCase()
    const matchesQuery =
      order.customer.toLowerCase().includes(q) || order.id.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  return (
    <div className={cn("mx-auto w-full max-w-5xl px-6 py-10", className)} {...props}>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Manage store orders, payments and fulfilment.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.up ? TrendingUpIcon : TrendingDownIcon
          return (
            <Card key={kpi.label}>
              <CardHeader className="pb-2">
                <CardDescription>{kpi.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    kpi.up ? "text-foreground" : "text-destructive"
                  )}
                >
                  <Icon className="size-3.5" />
                  {kpi.delta}
                  <span className="text-muted-foreground font-normal">
                    vs last month
                  </span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={status} onValueChange={(v) => setStatus(v as OrderStatus | "all")}>
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders..."
                className="w-full pl-8 sm:w-[220px]"
                aria-label="Search orders"
              />
            </div>
            <Button variant="outline">
              <DownloadIcon className="size-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium tabular-nums">{order.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">
                          {initials(order.customer)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{order.customer}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {order.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">
                    {order.date}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {order.items}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {order.total}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${order.id}`}
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View order</DropdownMenuItem>
                        <DropdownMenuItem>Mark as fulfilled</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Refund</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                    No orders found.
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
