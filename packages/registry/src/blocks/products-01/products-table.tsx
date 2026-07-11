"use client"

import * as React from "react"
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

type Product = {
  name: string
  status: "active" | "draft" | "archived"
  price: string
  sales: number
  createdAt: string
}

const products: Product[] = [
  { name: "Laser Lemonade Machine", status: "draft", price: "$499.99", sales: 25, createdAt: "2024-07-12" },
  { name: "Hypernova Headphones", status: "active", price: "$129.99", sales: 100, createdAt: "2024-10-18" },
  { name: "AeroGlow Desk Lamp", status: "active", price: "$39.99", sales: 50, createdAt: "2024-11-29" },
  { name: "TechTonic Energy Drink", status: "draft", price: "$2.99", sales: 0, createdAt: "2024-12-25" },
  { name: "Gamer Gear Pro Controller", status: "active", price: "$59.99", sales: 75, createdAt: "2025-01-01" },
  { name: "Luminous VR Headset", status: "archived", price: "$199.99", sales: 30, createdAt: "2025-02-08" },
]

const statusVariant = {
  active: "default",
  draft: "secondary",
  archived: "outline",
} as const

export function ProductsTable({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [query, setQuery] = React.useState("")

  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div
      className={cn("mx-auto w-full max-w-4xl px-6 py-16", className)}
      {...props}
    >
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid flex-1 gap-1.5">
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Manage your products and view their sales performance.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                className="w-full pl-8 sm:w-[220px]"
                aria-label="Search products"
              />
            </div>
            <Button>
              <PlusIcon className="size-4" />
              Add product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Price</TableHead>
                <TableHead className="hidden sm:table-cell">Sales</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.name}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[product.status]}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {product.price}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {product.sales}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.createdAt}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${product.name}`}
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Showing {filtered.length} of {products.length} products
        </CardFooter>
      </Card>
    </div>
  )
}
