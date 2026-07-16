"use client"

import * as React from "react"
import { TrashIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Button } from "@/registry/ui/button"
import { Card, CardContent, CardFooter } from "@/registry/ui/card"
import { NumberField } from "@/registry/ui/number-field"

type Line = {
  id: string
  name: string
  variant: string
  price: number
  qty: number
  hue: number
}

const INITIAL: Line[] = [
  { id: "a", name: "Aero Runner", variant: "Size 42 · Slate", price: 129, qty: 1, hue: 220 },
  { id: "b", name: "Trail Cap", variant: "One size · Black", price: 34, qty: 2, hue: 160 },
  { id: "c", name: "Merino Socks", variant: "M · Heather", price: 18, qty: 3, hue: 20 },
]

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

export function Cart({ className, ...props }: React.ComponentProps<"div">) {
  const [lines, setLines] = React.useState(INITIAL)

  const setQty = (id: string, qty: number) =>
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Number.isNaN(qty) ? 1 : qty } : l))
    )
  const remove = (id: string) =>
    setLines((prev) => prev.filter((l) => l.id !== id))

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
  const shipping = lines.length === 0 || subtotal >= 50 ? 0 : 5
  const total = subtotal + shipping

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-5xl gap-8 px-6 py-12 lg:grid-cols-[1fr_20rem]",
        className
      )}
      {...props}
    >
      <div>
        <h2 className="font-heading mb-6 text-2xl font-bold tracking-tight">
          Your cart
        </h2>
        {lines.length === 0 ? (
          <p className="text-muted-foreground text-sm">Your cart is empty.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {lines.map((line) => (
              <li
                key={line.id}
                data-slot="cart-line"
                className="flex items-center gap-4 py-4"
              >
                <div
                  className="size-16 shrink-0 rounded-md border"
                  style={{
                    backgroundImage: `linear-gradient(135deg, hsl(${line.hue} 60% 55%), hsl(${line.hue} 60% 35%))`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {line.variant}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(line.id)}
                    className="text-muted-foreground hover:text-destructive mt-1 inline-flex items-center gap-1 text-xs transition-colors"
                  >
                    <TrashIcon className="size-3" />
                    Remove
                  </button>
                </div>
                <NumberField
                  value={line.qty}
                  onValueChange={(q) => setQty(line.id, q)}
                  min={1}
                  max={99}
                  aria-label={`Quantity for ${line.name}`}
                />
                <div
                  data-slot="cart-line-total"
                  className="w-20 shrink-0 text-right text-sm font-medium tabular-nums"
                >
                  {money(line.price * line.qty)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card className="h-fit">
        <CardContent className="pt-6">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums" data-slot="cart-subtotal">
                {money(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">
                {shipping === 0 ? "Free" : money(shipping)}
              </dd>
            </div>
            <div className="mt-1 flex justify-between border-t pt-3 font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums" data-slot="cart-total">
                {money(total)}
              </dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={lines.length === 0}>
            Checkout
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
