import * as React from "react"
import { ArrowRightIcon, StarIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { Motion } from "@/registry/ui/motion"

// The animated twin of hero-01: identical markup, revealed as a staggered
// fade-up on mount. Each direct child is wrapped with <Motion asChild> so the
// animation rides the existing element (no extra layout node) and the delays
// cascade top to bottom. Respects prefers-reduced-motion via the motion engine.
export function Hero({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center",
        className
      )}
      {...props}
    >
      <Motion asChild preset="fade-up" delay={0}>
        <Badge variant="secondary" className="gap-1.5 rounded-full">
          <StarIcon className="size-3" />
          v0.2 is out
        </Badge>
      </Motion>
      <Motion asChild preset="fade-up" delay={90}>
        <h1 className="font-heading max-w-3xl text-4xl font-bold tracking-tighter text-balance md:text-6xl md:leading-[1.05]">
          The design system that ships with the code
        </h1>
      </Motion>
      <Motion asChild preset="fade-up" delay={180}>
        <p className="text-muted-foreground max-w-xl text-lg text-balance">
          A monochrome, dark-first component registry you copy into your project.
          Open source, framework-agnostic, and built to be read by humans and
          agents alike.
        </p>
      </Motion>
      <Motion asChild preset="fade-up" delay={270}>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg">
            Get started
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button size="lg" variant="outline">
            Browse components
          </Button>
        </div>
      </Motion>
      <Motion asChild preset="fade-up" delay={360}>
        <p className="text-muted-foreground font-mono text-xs">
          npx logic2b@latest init
        </p>
      </Motion>
    </div>
  )
}
