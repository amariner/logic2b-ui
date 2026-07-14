"use client"

import * as React from "react"
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from "lucide-react"

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

type BookingStatus = "confirmed" | "held" | "cancelled"
type Reservation = {
  id: string
  guest: string
  email: string
  resource: string
  time: string
  party: number
  status: BookingStatus
}

const KPIS = [
  { label: "Today's bookings", value: "38" },
  { label: "Guests", value: "112" },
  { label: "Occupancy", value: "82%" },
  { label: "No-shows", value: "3" },
]

const RESERVATIONS: Reservation[] = [
  { id: "r1", guest: "Olivia Martin", email: "olivia@example.com", resource: "Window table for 4", time: "19:00", party: 4, status: "confirmed" },
  { id: "r2", guest: "Jackson Lee", email: "jackson@example.com", resource: "Deluxe room 101", time: "15:00", party: 2, status: "held" },
  { id: "r3", guest: "Isabella Nguyen", email: "isabella@example.com", resource: "Workshop seat", time: "10:30", party: 1, status: "confirmed" },
  { id: "r4", guest: "William Kim", email: "william@example.com", resource: "Detailing bay", time: "13:00", party: 1, status: "cancelled" },
  { id: "r5", guest: "Sofia Davis", email: "sofia@example.com", resource: "Window table for 4", time: "20:30", party: 3, status: "confirmed" },
  { id: "r6", guest: "Liam Johnson", email: "liam@example.com", resource: "Deluxe room 101", time: "18:00", party: 2, status: "held" },
]

const STATUS_VARIANT: Record<BookingStatus, "default" | "secondary" | "outline"> = {
  confirmed: "default",
  held: "secondary",
  cancelled: "outline",
}

const TABS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "held", label: "Held" },
  { value: "cancelled", label: "Cancelled" },
]

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")

export function AdminReservations({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<BookingStatus | "all">("all")

  const filtered = RESERVATIONS.filter((r) => {
    const matchesStatus = status === "all" || r.status === status
    const q = query.toLowerCase()
    const matchesQuery =
      r.guest.toLowerCase().includes(q) || r.resource.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  return (
    <div className={cn("mx-auto w-full max-w-5xl px-6 py-10", className)} {...props}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Reservations
          </h1>
          <p className="text-muted-foreground text-sm">
            Today · Tuesday, July 14 — manage bookings across every resource.
          </p>
        </div>
        <Button>
          <PlusIcon className="size-4" />
          New booking
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={status} onValueChange={(v) => setStatus(v as BookingStatus | "all")}>
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guests or resources..."
              className="w-full pl-8 sm:w-[260px]"
              aria-label="Search reservations"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="hidden sm:table-cell">Party</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">
                          {initials(r.guest)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.guest}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {r.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.resource}</TableCell>
                  <TableCell className="tabular-nums">{r.time}</TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {r.party}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${r.guest}`}
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Check in</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Cancel</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    No reservations found.
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
