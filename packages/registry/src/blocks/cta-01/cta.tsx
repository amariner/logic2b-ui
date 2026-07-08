import * as React from "react"
import { ArrowRightIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Button } from "@/registry/ui/button"

export function Cta({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-6 py-16", className)}
      {...props}
    >
      <div className="bg-card relative overflow-hidden rounded-2xl border px-6 py-16 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
            Ship your next interface tonight
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-md text-balance">
            Copy the components, keep the code, own the design. Start building
            with a monochrome system that reads like your own.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg">
              Get started
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button size="lg" variant="outline">
              Read the docs
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
