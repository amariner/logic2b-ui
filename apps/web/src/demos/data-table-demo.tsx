import * as React from "react"
import { ArrowUpDown } from "lucide-react"

import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { Input } from "@/registry/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/ui/table"

type Payment = {
  id: string
  email: string
  status: "pending" | "success" | "failed"
  amount: number
}

const data: Payment[] = [
  { id: "1", email: "ken@example.com", status: "success", amount: 316 },
  { id: "2", email: "abe@example.com", status: "success", amount: 242 },
  { id: "3", email: "mia@example.com", status: "pending", amount: 837 },
  { id: "4", email: "leo@example.com", status: "failed", amount: 721 },
  { id: "5", email: "eva@example.com", status: "pending", amount: 129 },
  { id: "6", email: "sam@example.com", status: "success", amount: 452 },
]

const PAGE_SIZE = 4

export default function DataTableDemo() {
  const [filter, setFilter] = React.useState("")
  const [asc, setAsc] = React.useState(false)
  const [page, setPage] = React.useState(0)

  const rows = React.useMemo(() => {
    const filtered = data.filter((d) =>
      d.email.toLowerCase().includes(filter.toLowerCase())
    )
    const sorted = [...filtered].sort((a, b) =>
      asc ? a.amount - b.amount : b.amount - a.amount
    )
    return sorted
  }, [filter, asc])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter emails..."
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setPage(0)
          }}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-3"
                  onClick={() => setAsc((v) => !v)}
                >
                  Amount
                  <ArrowUpDown className="ml-2 size-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "success"
                          ? "secondary"
                          : row.status === "failed"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${row.amount}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-2 py-4">
        <span className="mr-auto text-sm text-muted-foreground">
          Page {current + 1} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={current >= pageCount - 1}
          onClick={() => setPage(current + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
