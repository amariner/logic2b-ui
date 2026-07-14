import * as React from "react"
import { LockIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Button } from "@/registry/ui/button"
import { Card, CardContent } from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
import { Separator } from "@/registry/ui/separator"

const summary = [
  { name: "Aero Runner", variant: "Size 42 · Slate", price: 129 },
  { name: "Trail Cap", variant: "One size · Black", price: 34 },
]

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

export function Checkout({ className, ...props }: React.ComponentProps<"div">) {
  const subtotal = summary.reduce((s, i) => s + i.price, 0)
  const shipping = 0
  const tax = Math.round(subtotal * 0.08 * 100) / 100
  const total = subtotal + shipping + tax

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1fr_22rem]",
        className
      )}
      {...props}
    >
      <form className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Contact
          </h2>
          <div className="grid gap-2">
            <Label htmlFor="checkout-email">Email</Label>
            <Input id="checkout-email" type="email" placeholder="you@example.com" />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Shipping address
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="checkout-first">First name</Label>
              <Input id="checkout-first" autoComplete="given-name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkout-last">Last name</Label>
              <Input id="checkout-last" autoComplete="family-name" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkout-address">Address</Label>
            <Input id="checkout-address" autoComplete="street-address" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="checkout-city">City</Label>
              <Input id="checkout-city" autoComplete="address-level2" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkout-zip">Postal code</Label>
              <Input id="checkout-zip" autoComplete="postal-code" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Payment
          </h2>
          <div className="grid gap-2">
            <Label htmlFor="checkout-card">Card number</Label>
            <Input id="checkout-card" inputMode="numeric" placeholder="1234 1234 1234 1234" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="checkout-exp">Expiry</Label>
              <Input id="checkout-exp" placeholder="MM/YY" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkout-cvc">CVC</Label>
              <Input id="checkout-cvc" inputMode="numeric" placeholder="123" />
            </div>
          </div>
        </section>
      </form>

      <Card className="h-fit">
        <CardContent className="flex flex-col gap-4 pt-6">
          <ul className="flex flex-col gap-3">
            {summary.map((item) => (
              <li key={item.name} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {item.variant}
                  </p>
                </div>
                <span className="text-sm tabular-nums">{money(item.price)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">Free</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums">{money(tax)}</dd>
            </div>
          </dl>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{money(total)}</span>
          </div>
          <Button className="w-full" size="lg">
            <LockIcon className="size-4" />
            Pay {money(total)}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Secure checkout — your details are encrypted.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
