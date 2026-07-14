import * as React from "react"
import {
  BlocksIcon,
  BotIcon,
  MoonIcon,
  PaletteIcon,
  TerminalIcon,
  ZapIcon,
} from "lucide-react"

import { cn } from "@/registry/lib/utils"

const features = [
  {
    icon: BlocksIcon,
    title: "Copy-paste components",
    description:
      "You own the code. Components are copied into your project — no runtime dependency, no lock-in.",
  },
  {
    icon: MoonIcon,
    title: "Dark-first design",
    description:
      "A monochrome, engineered aesthetic that treats dark as the default and keeps light first-class.",
  },
  {
    icon: PaletteIcon,
    title: "Theme that travels",
    description:
      "The oklch token system installs with the CLI, so components look like you — never like a stock template.",
  },
  {
    icon: TerminalIcon,
    title: "A real CLI",
    description:
      "init, add, diff and --all. Honors your components.json aliases and installs the design system.",
  },
  {
    icon: BotIcon,
    title: "Built for agents",
    description:
      "llms.txt, a full-text bundle and a machine-readable registry make it trivial for coding agents.",
  },
  {
    icon: ZapIcon,
    title: "Framework-agnostic",
    description:
      "Next, Vite, Astro, Remix, TanStack Start — if it runs React and Tailwind, it runs here.",
  },
]

export function FeatureGrid({
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
          Everything you need, nothing you don&apos;t
        </h2>
        <p className="text-muted-foreground mt-3 text-balance">
          A registry designed to get out of your way and let you ship.
        </p>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg border">
              <feature.icon className="size-5" />
            </div>
            <h3 className="font-medium">{feature.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
