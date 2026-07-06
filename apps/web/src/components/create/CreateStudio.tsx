import * as React from "react"

import { Button } from "@/registry/ui/button"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
import { Separator } from "@/registry/ui/separator"
import { Switch } from "@/registry/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs"

import {
  ACCENTS,
  BASE_COLORS,
  CHARTS,
  DEFAULT_CONFIG,
  FONTS,
  RADII,
  buildComponentsJson,
  buildCss,
  decodePreset,
  encodePreset,
  resolveTokens,
  type Mode,
  type ThemeConfig,
} from "@/lib/themes"

import {
  ComponentShowcase,
  ContributionHistory,
  AnalyticsCard,
  PowerUsage,
  NotificationsCard,
  PayoutThreshold,
} from "@/components/landing/interactive-widgets"
import {
  MilestoneForm,
  ClaimableBalance,
  SavingsTargets,
  DividendList,
} from "@/components/landing/static-widgets"

const FONT_LABELS: Record<string, string> = {
  sans: "Sans",
  system: "System",
  serif: "Serif",
  mono: "Mono",
}
const RADIUS_LABELS: Record<string, string> = {
  none: "None",
  sm: "Small",
  md: "Medium",
  default: "Default",
  lg: "Large",
  xl: "Extra Large",
}

/* Turn the config into inline CSS variables for the live canvas. */
function useThemeStyle(cfg: ThemeConfig, mode: Mode): React.CSSProperties {
  return React.useMemo(() => {
    const { tokens, chart } = resolveTokens(cfg, mode)
    const style: Record<string, string> = {
      "--radius": RADII[cfg.radius] ?? RADII.default,
      "--font-sans": FONTS[cfg.font] ?? FONTS.sans,
      fontFamily: FONTS[cfg.font] ?? FONTS.sans,
    }
    for (const [k, v] of Object.entries(tokens)) style[`--${k}`] = v
    chart.forEach((c, i) => (style[`--chart-${i + 1}`] = c))
    return style as React.CSSProperties
  }, [cfg, mode])
}

/* One customizer row: label, current value, and a swatch/glyph on the right. */
function ControlRow({
  label,
  valueLabel,
  swatch,
  glyph,
  options,
  value,
  onChange,
}: {
  label: string
  valueLabel: string
  swatch?: string
  glyph?: React.ReactNode
  options: { key: string; label: string; swatch?: string }[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent">
          <span className="grid min-w-0 gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="truncate text-sm font-medium">{valueLabel}</span>
          </span>
          {swatch ? (
            <span
              className="size-5 rounded-full border"
              style={{ background: swatch }}
            />
          ) : (
            <span className="text-muted-foreground">{glyph}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.key} value={o.key}>
              <span className="flex items-center gap-2">
                {o.swatch && (
                  <span
                    className="size-3.5 rounded-full border"
                    style={{ background: o.swatch }}
                  />
                )}
                {o.label}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const TEMPLATES = [
  { key: "next", label: "Next.js" },
  { key: "vite", label: "Vite" },
  { key: "tanstack", label: "TanStack Start" },
  { key: "react-router", label: "React Router" },
  { key: "astro", label: "Astro" },
  { key: "laravel", label: "Laravel" },
]
const PMS: Record<string, string> = {
  pnpm: "pnpm dlx",
  npm: "npx",
  yarn: "yarn dlx",
  bun: "bunx",
}

export function CreateStudio() {
  const [cfg, setCfg] = React.useState<ThemeConfig>(DEFAULT_CONFIG)
  const [mode, setMode] = React.useState<Mode>("light")
  const set = (patch: Partial<ThemeConfig>) => setCfg((c) => ({ ...c, ...patch }))

  const style = useThemeStyle(cfg, mode)
  const presetId = encodePreset(cfg)

  const shuffle = () => {
    const pick = <T,>(obj: Record<string, T>) => {
      const keys = Object.keys(obj)
      return keys[Math.floor(Math.random() * keys.length)]
    }
    setCfg({
      base: pick(BASE_COLORS),
      theme: pick(ACCENTS),
      chart: pick(CHARTS),
      radius: pick(RADII),
      font: pick(FONTS),
    })
  }

  const baseOpts = Object.entries(BASE_COLORS).map(([key, v]) => ({
    key,
    label: v.label,
    swatch: v.swatch,
  }))
  const accentOpts = Object.entries(ACCENTS).map(([key, v]) => ({
    key,
    label: v.label,
    swatch: v.swatch,
  }))
  const chartOpts = Object.entries(CHARTS).map(([key, v]) => ({
    key,
    label: v.label,
    swatch: v.swatch,
  }))
  const radiusOpts = Object.keys(RADII).map((key) => ({
    key,
    label: RADIUS_LABELS[key] ?? key,
  }))
  const fontOpts = Object.keys(FONTS).map((key) => ({
    key,
    label: FONT_LABELS[key] ?? key,
  }))

  return (
    <div
      style={style}
      className={`bg-background text-foreground ${mode === "dark" ? "dark" : ""}`}
    >
      <div className="grid gap-6 rounded-xl border bg-background p-4 lg:grid-cols-[300px_1fr]">
        {/* --------------------------- Customizer --------------------------- */}
        <aside className="grid grid-cols-[minmax(0,1fr)] content-start gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Customize</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Light</span>
              <Switch
                checked={mode === "dark"}
                onCheckedChange={(v) => setMode(v ? "dark" : "light")}
                aria-label="Toggle preview theme"
              />
              <span>Dark</span>
            </div>
          </div>

          <ControlRow
            label="Base Color"
            valueLabel={BASE_COLORS[cfg.base].label}
            swatch={BASE_COLORS[cfg.base].swatch}
            options={baseOpts}
            value={cfg.base}
            onChange={(k) => set({ base: k })}
          />
          <ControlRow
            label="Theme"
            valueLabel={ACCENTS[cfg.theme].label}
            swatch={ACCENTS[cfg.theme].swatch}
            options={accentOpts}
            value={cfg.theme}
            onChange={(k) => set({ theme: k })}
          />
          <ControlRow
            label="Chart Color"
            valueLabel={CHARTS[cfg.chart].label}
            swatch={CHARTS[cfg.chart].swatch}
            options={chartOpts}
            value={cfg.chart}
            onChange={(k) => set({ chart: k })}
          />
          <ControlRow
            label="Radius"
            valueLabel={RADIUS_LABELS[cfg.radius] ?? cfg.radius}
            glyph={
              <span className="inline-block size-5 rounded-tl-lg border-l-2 border-t-2" />
            }
            options={radiusOpts}
            value={cfg.radius}
            onChange={(k) => set({ radius: k })}
          />
          <ControlRow
            label="Font"
            valueLabel={FONT_LABELS[cfg.font] ?? cfg.font}
            glyph={<span className="text-base font-semibold">Aa</span>}
            options={fontOpts}
            value={cfg.font}
            onChange={(k) => set({ font: k })}
          />
          <ControlRow
            label="Icon Library"
            valueLabel="Lucide"
            glyph={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m8 12 3 3 5-6" />
              </svg>
            }
            options={[{ key: "lucide", label: "Lucide" }]}
            value="lucide"
            onChange={() => {}}
          />

          <Separator className="my-1" />

          <div className="flex min-w-0 items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">
            <span className="truncate">--preset {presetId}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <OpenPresetDialog onApply={setCfg} />
            <Button variant="outline" size="sm" onClick={shuffle}>
              Shuffle
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <GetCodeDialog cfg={cfg} presetId={presetId} />
            <NewProjectDialog presetId={presetId} />
          </div>
        </aside>

        {/* ---------------------------- Preview ----------------------------- */}
        <section className="grid min-w-0 grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ComponentShowcase />
          <ContributionHistory animate={false} />
          <PayoutThreshold />
          <NotificationsCard />
          <MilestoneForm />
          <AnalyticsCard animate={false} />
          <SavingsTargets />
          <ClaimableBalance />
          <DividendList />
          <PowerUsage animate={false} />
        </section>
      </div>
    </div>
  )
}

/* ------------------------------ Dialogs ------------------------------ */
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? "Copied!" : label}
    </Button>
  )
}

function OpenPresetDialog({ onApply }: { onApply: (c: ThemeConfig) => void }) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Open Preset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a preset</DialogTitle>
          <DialogDescription>
            Paste a preset id (the value after <code>--preset</code>) to load it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="preset-input">Preset id</Label>
          <Input
            id="preset-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(false)
            }}
            placeholder="e.g. bmV1dHJhbHxibHVl…"
          />
          {error && (
            <p className="text-xs text-destructive">Invalid preset id.</p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              const cfg = decodePreset(value.trim())
              if (!cfg) return setError(true)
              onApply(cfg)
              setOpen(false)
              setValue("")
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GetCodeDialog({
  cfg,
  presetId,
}: {
  cfg: ThemeConfig
  presetId: string
}) {
  const css = buildCss(cfg)
  const json = buildComponentsJson(cfg)
  const cmd = `npx logic2b@latest init --preset ${presetId}`
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Get Code</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Theme code</DialogTitle>
          <DialogDescription>
            Copy the CSS variables into your global stylesheet, or scaffold with
            the CLI.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="css">
          <TabsList>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="cli">CLI</TabsTrigger>
            <TabsTrigger value="json">components.json</TabsTrigger>
          </TabsList>
          <TabsContent value="css" className="grid gap-2">
            <div className="flex justify-end">
              <CopyButton text={css} />
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
              {css}
            </pre>
          </TabsContent>
          <TabsContent value="cli" className="grid gap-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 font-mono text-sm">
              <span className="truncate">{cmd}</span>
              <CopyButton text={cmd} />
            </div>
            <p className="text-xs text-muted-foreground">
              Runs <code>init</code> and applies this exact theme via the preset.
            </p>
          </TabsContent>
          <TabsContent value="json" className="grid gap-2">
            <div className="flex justify-end">
              <CopyButton text={json} />
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
              {json}
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function NewProjectDialog({ presetId }: { presetId: string }) {
  const [tpl, setTpl] = React.useState("next")
  const [pm, setPm] = React.useState("pnpm")
  const [monorepo, setMonorepo] = React.useState(false)
  const cmd = `${PMS[pm]} logic2b@latest init --template ${tpl}${
    monorepo ? " --monorepo" : ""
  } --preset ${presetId}`
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new project</DialogTitle>
          <DialogDescription>
            Pick a framework and package manager. We&apos;ll generate the command
            with your theme baked in.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Template</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTpl(t.key)}
                  className={`rounded-md border px-2 py-2 text-sm transition-colors hover:bg-accent ${
                    tpl === t.key ? "border-ring ring-2 ring-ring/30" : ""
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Package manager</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.keys(PMS).map((p) => (
                <button
                  key={p}
                  onClick={() => setPm(p)}
                  className={`rounded-md border px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                    pm === p ? "border-ring ring-2 ring-ring/30" : ""
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between rounded-md border p-3 text-sm">
            <span>Monorepo layout</span>
            <Switch checked={monorepo} onCheckedChange={setMonorepo} />
          </label>
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 font-mono text-xs">
            <span className="truncate">{cmd}</span>
            <CopyButton text={cmd} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
