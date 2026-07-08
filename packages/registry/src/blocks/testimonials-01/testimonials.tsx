import * as React from "react"

import { cn } from "@/registry/lib/utils"
import { Avatar, AvatarFallback } from "@/registry/ui/avatar"
import { Card, CardContent } from "@/registry/ui/card"

const testimonials = [
  {
    quote:
      "We replaced our in-house component library in a weekend. The dark-first tokens matched our brand out of the box.",
    name: "Ada Lovelace",
    role: "Staff Engineer, Analytical",
    initials: "AL",
  },
  {
    quote:
      "The CLI writing the theme into our project is the detail that sold me. No more copy-pasting CSS variables.",
    name: "Grace Hopper",
    role: "Design Lead, Compiler",
    initials: "GH",
  },
  {
    quote:
      "Owning the code means we never fight the abstraction. It reads like something we wrote ourselves.",
    name: "Alan Turing",
    role: "Founder, Enigma",
    initials: "AT",
  },
  {
    quote:
      "The llms.txt endpoints let our coding agent scaffold whole pages from the registry. Genuinely a step ahead.",
    name: "Katherine Johnson",
    role: "Platform, Orbit",
    initials: "KJ",
  },
]

export function Testimonials({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-6 py-16", className)}
      {...props}
    >
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">
          Loved by builders
        </h2>
        <p className="text-muted-foreground mt-3 text-balance">
          Teams shipping production interfaces on top of logic2b.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {testimonials.map((t) => (
          <Card key={t.name}>
            <CardContent className="flex flex-col gap-4 pt-6">
              <p className="text-sm leading-relaxed text-balance">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback>{t.initials}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-muted-foreground text-xs">{t.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
