import * as React from "react"
import { CheckIcon } from "lucide-react"

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

const tiers = [
  {
    name: "Hobby",
    price: "$0",
    period: "/mo",
    description: "For side projects and getting started.",
    features: ["1 project", "Community support", "1GB storage", "Basic analytics"],
    cta: "Start for free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For professionals shipping to production.",
    features: [
      "Unlimited projects",
      "Priority support",
      "100GB storage",
      "Advanced analytics",
      "Custom domains",
    ],
    cta: "Upgrade to Pro",
    featured: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/mo",
    description: "For teams that need control and scale.",
    features: [
      "Everything in Pro",
      "SSO & SAML",
      "Audit logs",
      "Unlimited seats",
      "SLA",
    ],
    cta: "Contact sales",
    featured: false,
  },
]

export function Pricing({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-6 py-16", className)}
      {...props}
    >
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">
          Pricing that scales with you
        </h2>
        <p className="text-muted-foreground mt-3 text-balance">
          Start free, upgrade when you need to. No hidden fees, cancel anytime.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={cn(
              "flex flex-col",
              tier.featured && "border-primary ring-primary/20 ring-1"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tier.name}</CardTitle>
                {tier.featured && <Badge>Most popular</Badge>}
              </div>
              <CardDescription>{tier.description}</CardDescription>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold tracking-tight">
                  {tier.price}
                </span>
                <span className="text-muted-foreground text-sm">
                  {tier.period}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="grid gap-2.5 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckIcon className="text-foreground size-4 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={tier.featured ? "default" : "outline"}
              >
                {tier.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
