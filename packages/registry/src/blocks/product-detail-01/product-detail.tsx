"use client"

import * as React from "react"

import { cn } from "@/registry/lib/utils"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { NumberField } from "@/registry/ui/number-field"
import { Rating } from "@/registry/ui/rating"
import { Separator } from "@/registry/ui/separator"

const GALLERY = [220, 250, 28, 160]
const SIZES = ["XS", "S", "M", "L", "XL"]
const PRICE = 129

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

const swatch = (hue: number) =>
  `linear-gradient(135deg, hsl(${hue} 55% 55%), hsl(${hue} 55% 32%))`

export function ProductDetail({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [active, setActive] = React.useState(0)
  const [size, setSize] = React.useState("M")
  const [qty, setQty] = React.useState(1)

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-5xl gap-10 px-6 py-12 lg:grid-cols-2",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-4">
        <div
          data-slot="product-image"
          className="aspect-square w-full rounded-xl border"
          style={{ backgroundImage: swatch(GALLERY[active]) }}
        />
        <div className="grid grid-cols-4 gap-3">
          {GALLERY.map((hue, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              data-active={i === active ? "" : undefined}
              aria-label={`View image ${i + 1}`}
              className="ring-ring/50 data-active:ring-ring aspect-square rounded-lg border outline-none transition-[box-shadow] focus-visible:ring-[3px] data-active:ring-2"
              style={{ backgroundImage: swatch(hue) }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            New
          </Badge>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Aero Runner
          </h1>
          <div className="flex items-center gap-2">
            <Rating value={4} readOnly />
            <span className="text-muted-foreground text-sm">4.0 (128 reviews)</span>
          </div>
        </div>

        <p className="text-2xl font-semibold tabular-nums">{money(PRICE)}</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          A featherweight daily trainer with a breathable knit upper and a
          responsive foam midsole. Built for the long run and the short commute
          alike.
        </p>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Size</p>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <Button
                key={s}
                type="button"
                variant={s === size ? "default" : "outline"}
                size="sm"
                className="w-11"
                onClick={() => setSize(s)}
                aria-pressed={s === size}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Quantity</p>
          <NumberField
            value={qty}
            onValueChange={(q) => setQty(Number.isNaN(q) ? 1 : q)}
            min={1}
            max={10}
            aria-label="Quantity"
          />
        </div>

        <div className="flex gap-3">
          <Button size="lg" className="flex-1" data-slot="add-to-cart">
            Add to cart · {money(PRICE * qty)}
          </Button>
          <Button size="lg" variant="outline">
            Wishlist
          </Button>
        </div>
      </div>
    </div>
  )
}
