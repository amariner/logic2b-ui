import * as React from "react"

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
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
import { Separator } from "@/registry/ui/separator"

const PRIMARIES = {
  neutral: {
    label: "Neutral",
    swatch: "oklch(0.205 0 0)",
    light: { primary: "oklch(0.205 0 0)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.708 0 0)" },
    dark: { primary: "oklch(0.922 0 0)", primaryFg: "oklch(0.205 0 0)", ring: "oklch(0.556 0 0)" },
  },
  blue: {
    label: "Blue",
    swatch: "oklch(0.546 0.245 262.881)",
    light: { primary: "oklch(0.546 0.245 262.881)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.546 0.245 262.881)" },
    dark: { primary: "oklch(0.623 0.214 259.815)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.623 0.214 259.815)" },
  },
  green: {
    label: "Green",
    swatch: "oklch(0.548 0.166 156.743)",
    light: { primary: "oklch(0.548 0.166 156.743)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.548 0.166 156.743)" },
    dark: { primary: "oklch(0.696 0.17 162.48)", primaryFg: "oklch(0.145 0 0)", ring: "oklch(0.696 0.17 162.48)" },
  },
  rose: {
    label: "Rose",
    swatch: "oklch(0.586 0.222 17.585)",
    light: { primary: "oklch(0.586 0.222 17.585)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.586 0.222 17.585)" },
    dark: { primary: "oklch(0.645 0.246 16.439)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.645 0.246 16.439)" },
  },
  violet: {
    label: "Violet",
    swatch: "oklch(0.541 0.281 293.009)",
    light: { primary: "oklch(0.541 0.281 293.009)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.541 0.281 293.009)" },
    dark: { primary: "oklch(0.606 0.25 292.717)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.606 0.25 292.717)" },
  },
  orange: {
    label: "Orange",
    swatch: "oklch(0.646 0.222 41.116)",
    light: { primary: "oklch(0.646 0.222 41.116)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.646 0.222 41.116)" },
    dark: { primary: "oklch(0.705 0.213 47.604)", primaryFg: "oklch(0.145 0 0)", ring: "oklch(0.705 0.213 47.604)" },
  },
} as const

type PrimaryKey = keyof typeof PRIMARIES

const RADII = ["0rem", "0.3rem", "0.5rem", "0.625rem", "1rem"] as const

function buildCss(key: PrimaryKey, radius: string): string {
  const p = PRIMARIES[key]
  return `:root {
  --radius: ${radius};
  --primary: ${p.light.primary};
  --primary-foreground: ${p.light.primaryFg};
  --ring: ${p.light.ring};
  /* remaining tokens: keep the neutral base from /docs/theming */
}

.dark {
  --primary: ${p.dark.primary};
  --primary-foreground: ${p.dark.primaryFg};
  --ring: ${p.dark.ring};
}`
}

export function ThemeBuilder() {
  const [primary, setPrimary] = React.useState<PrimaryKey>("neutral")
  const [radius, setRadius] = React.useState<string>("0.625rem")
  const [dark, setDark] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const css = buildCss(primary, radius)
  const mode = dark ? PRIMARIES[primary].dark : PRIMARIES[primary].light

  const previewVars = {
    "--primary": mode.primary,
    "--primary-foreground": mode.primaryFg,
    "--ring": mode.ring,
    "--radius": radius,
  } as React.CSSProperties

  const copy = async () => {
    await navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="grid content-start gap-6">
        <div>
          <h3 className="mb-3 text-sm font-medium">Primary color</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRIMARIES) as PrimaryKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setPrimary(key)}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                  primary === key ? "border-ring ring-2 ring-ring/30" : ""
                }`}
              >
                <span
                  className="size-3 rounded-full"
                  style={{ background: PRIMARIES[key].swatch }}
                />
                {PRIMARIES[key].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium">Radius</h3>
          <div className="flex flex-wrap gap-2">
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  radius === r ? "border-ring ring-2 ring-ring/30" : ""
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium">Preview mode</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setDark(false)}
              className={`rounded-md border px-3 py-1.5 text-sm ${!dark ? "border-ring ring-2 ring-ring/30" : ""}`}
            >
              Light
            </button>
            <button
              onClick={() => setDark(true)}
              className={`rounded-md border px-3 py-1.5 text-sm ${dark ? "border-ring ring-2 ring-ring/30" : ""}`}
            >
              Dark
            </button>
          </div>
        </div>
        <Separator />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Generated CSS</h3>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
            {css}
          </pre>
        </div>
      </div>

      <div
        style={previewVars}
        className={`rounded-xl border p-6 ${dark ? "dark bg-[oklch(0.145_0_0)]" : "bg-background"}`}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create project</CardTitle>
              <CardDescription>
                Deploy your new project in one click.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tb-name">Name</Label>
                <Input id="tb-name" placeholder="my-app" />
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button className="flex-1">Deploy</Button>
              <Button variant="outline">Cancel</Button>
            </CardFooter>
          </Card>
          <div className="grid content-start gap-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Badge</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <Input placeholder="Focus me to see the ring" />
          </div>
        </div>
      </div>
    </div>
  )
}
