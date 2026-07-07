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
  buildDesignMd,
  decodePreset,
  encodePreset,
  resolveTokens,
  type Mode,
  type ThemeConfig,
} from "@/lib/themes"
import {
  siAstro,
  siLaravel,
  siNextdotjs,
  siReactrouter,
  siTanstack,
  siVite,
} from "simple-icons"

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
  QrConnectCard,
  DistributeCard,
  ChatCard,
  AccountAccess,
  PaymentsCard,
} from "@/components/landing/static-widgets"
import {
  BuyInvestment,
  ReceivingMethod,
  RecentTransactions,
  TransferFunds,
  PreferencesCard,
  SocialLinks,
  ShippingAddress,
  ProfileCard,
  ShortcutsCard,
  InvoiceCard,
  BookAppointment,
  FileUpload,
  EnvVariables,
  SecurityFaq,
  NotFoundCard,
  StockPerformance,
  TrafficChannels,
} from "@/components/create/preview-widgets"

const FONT_LABELS: Record<string, string> = {
  inter: "Inter",
  grotesk: "Space Grotesk",
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
      "--font-heading": FONTS[cfg.heading] ?? FONTS.sans,
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
  { key: "next", label: "Next.js", icon: siNextdotjs.path },
  { key: "vite", label: "Vite", icon: siVite.path },
  { key: "tanstack", label: "TanStack Start", icon: siTanstack.path },
  { key: "react-router", label: "React Router", icon: siReactrouter.path },
  { key: "astro", label: "Astro", icon: siAstro.path },
  { key: "laravel", label: "Laravel", icon: siLaravel.path },
]
const PMS: Record<string, string> = {
  pnpm: "pnpm dlx",
  npm: "npx",
  yarn: "yarn dlx",
  bun: "bunx",
}

export function CreateStudio() {
  const [cfg, setCfg] = React.useState<ThemeConfig>(DEFAULT_CONFIG)
  const [mode, setMode] = React.useState<Mode>("dark")
  const [codeOpen, setCodeOpen] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const set = (patch: Partial<ThemeConfig>) => setCfg((c) => ({ ...c, ...patch }))

  const style = useThemeStyle(cfg, mode)
  const presetId = encodePreset(cfg)

  const shuffle = React.useCallback(() => {
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
      heading: pick(FONTS),
    })
  }, [])

  // Header actions (BaseLayout renders Shuffle + Get Code on /create).
  React.useEffect(() => {
    const onShuffle = () => shuffle()
    const onGetCode = () => setCodeOpen(true)
    window.addEventListener("l2:shuffle", onShuffle)
    window.addEventListener("l2:get-code", onGetCode)
    return () => {
      window.removeEventListener("l2:shuffle", onShuffle)
      window.removeEventListener("l2:get-code", onGetCode)
    }
  }, [shuffle])

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
  const headingOpts = fontOpts

  return (
    <div className="flex w-full flex-col lg:flex-row">
      {/* --------------------------- Customizer rail --------------------------- */}
      <aside className="flex w-full flex-col gap-3 border-b bg-background p-4 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
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

        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
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
            label="Heading"
            valueLabel={FONT_LABELS[cfg.heading] ?? cfg.heading}
            glyph={<span className="text-base font-semibold">Aa</span>}
            options={headingOpts}
            value={cfg.heading}
            onChange={(k) => set({ heading: k })}
          />
          <ControlRow
            label="Font"
            valueLabel={FONT_LABELS[cfg.font] ?? cfg.font}
            glyph={<span className="text-base">Aa</span>}
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
        </div>

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

        {/* Pinned action (also available from the header on /create) */}
        <div className="mt-auto grid pt-2">
          <Button className="w-full" onClick={() => setCodeOpen(true)}>
            Get Code
          </Button>
        </div>
      </aside>

      <GetCodeDialog
        cfg={cfg}
        presetId={presetId}
        open={codeOpen}
        onOpenChange={setCodeOpen}
      />

      {/* ------------------------------- Canvas ------------------------------- */}
      <div
        style={style}
        className={`create-canvas min-h-[calc(100dvh-3.5rem)] min-w-0 flex-1 bg-background p-4 text-foreground sm:p-6 ${
          mode === "dark" ? "dark" : ""
        }`}
      >
        <section className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {page === 1 ? (
            <>
              <ComponentShowcase />
              <ContributionHistory animate={false} />
              <PayoutThreshold />
              <NotificationsCard />
              <MilestoneForm />
              <AnalyticsCard animate={false} />
              <SavingsTargets />
              <BuyInvestment />
              <ClaimableBalance />
              <DividendList />
              <PowerUsage animate={false} />
              <RecentTransactions />
              <TransferFunds />
              <PreferencesCard />
              <AccountAccess />
              <ReceivingMethod />
            </>
          ) : (
            <>
              <StockPerformance />
              <TrafficChannels />
              <EnvVariables />
              <ProfileCard />
              <ShippingAddress />
              <SecurityFaq />
              <BookAppointment />
              <FileUpload />
              <InvoiceCard />
              <SocialLinks />
              <ShortcutsCard />
              <PaymentsCard />
              <QrConnectCard />
              <ChatCard />
              <DistributeCard />
              <NotFoundCard />
            </>
          )}
        </section>

        {/* Page switcher */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={() => setPage(1)}
            aria-label="Page 1"
            aria-current={page === 1}
            className={`inline-flex size-8 items-center justify-center rounded-md border text-xs font-medium tabular-nums transition-colors ${
              page === 1
                ? "border-ring bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            01
          </button>
          <button
            onClick={() => setPage(2)}
            aria-label="Page 2"
            aria-current={page === 2}
            className={`inline-flex size-8 items-center justify-center rounded-md border text-xs font-medium tabular-nums transition-colors ${
              page === 2
                ? "border-ring bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            02
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Dialogs ------------------------------ */
function useCopy(text: string) {
  const [copied, setCopied] = React.useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return { copied, copy }
}

/* Command box: package-manager switcher + copy icon in the header row,
   the command itself below (reference: shadcn /create dialog). */
function CommandBlock({
  cmd,
  pm,
  onPmChange,
}: {
  cmd: string
  pm: string
  onPmChange: (p: string) => void
}) {
  const { copied, copy } = useCopy(cmd)
  return (
    <div className="overflow-hidden rounded-lg border bg-muted/40">
      <div className="flex items-center justify-between border-b px-2 py-1.5">
        <div className="flex items-center gap-1 font-mono text-xs">
          {Object.keys(PMS).map((p) => (
            <button
              key={p}
              onClick={() => onPmChange(p)}
              className={
                p === pm
                  ? "rounded-md border bg-background px-2 py-0.5 font-medium"
                  : "px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {p}
            </button>
          ))}
        </div>
        <button
          aria-label="Copy command"
          onClick={copy}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-xs leading-relaxed">{cmd}</pre>
    </div>
  )
}

function BigCopyButton({
  text,
  label,
  variant = "default",
}: {
  text: string
  label: string
  variant?: "default" | "outline"
}) {
  const { copied, copy } = useCopy(text)
  return (
    <Button className="w-full" variant={variant} onClick={copy}>
      {copied ? "Copied!" : label}
    </Button>
  )
}

function DownloadButton({
  text,
  filename,
  label,
}: {
  text: string
  filename: string
  label: string
}) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }))
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Button className="w-full" onClick={download}>
      {label}
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

/* Unified Get Code dialog (reference: shadcn /create): New Project scaffolds,
   Existing Project inits in place, Theme exposes the raw CSS / components.json. */
function GetCodeDialog({
  cfg,
  presetId,
  open,
  onOpenChange,
}: {
  cfg: ThemeConfig
  presetId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tpl, setTpl] = React.useState("next")
  const [pm, setPm] = React.useState("pnpm")
  const [monorepo, setMonorepo] = React.useState(false)
  const [themeView, setThemeView] = React.useState<"css" | "json" | "design">(
    "css",
  )

  const newCmd = `${PMS[pm]} logic2b@latest init --template ${tpl}${
    monorepo ? " --monorepo" : ""
  } --preset ${presetId}`
  const existingCmd = `${PMS[pm]} logic2b@latest init --preset ${presetId}`
  const themeText =
    themeView === "css"
      ? buildCss(cfg)
      : themeView === "json"
        ? buildComponentsJson(cfg)
        : buildDesignMd(cfg)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover sm:max-w-[480px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Get Code</DialogTitle>
          <DialogDescription>
            Scaffold a new project, apply the theme to an existing one, or copy
            the theme code.
          </DialogDescription>
        </DialogHeader>
        {/* Manual activation: focus alone must not switch tabs (the dialog's
            focus trap re-focuses the first trigger on window refocus). */}
        <Tabs defaultValue="new" activationMode="manual">
          <TabsList>
            <TabsTrigger value="new">New Project</TabsTrigger>
            <TabsTrigger value="existing">Existing Project</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label>Template</Label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTpl(t.key)}
                    className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                      tpl === t.key
                        ? "border-input bg-accent"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4 shrink-0 fill-current"
                      aria-hidden="true"
                    >
                      <path d={t.icon} />
                    </svg>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium">
              Create a monorepo
              <Switch checked={monorepo} onCheckedChange={setMonorepo} />
            </label>
            <CommandBlock cmd={newCmd} pm={pm} onPmChange={setPm} />
            <BigCopyButton text={newCmd} label="Copy Command" />
          </TabsContent>

          <TabsContent value="existing" className="mt-4 grid gap-4">
            <p className="text-sm text-muted-foreground">
              Run <code>init</code> inside your project — it writes{" "}
              <code>components.json</code> and applies this exact theme via the
              preset.
            </p>
            <CommandBlock cmd={existingCmd} pm={pm} onPmChange={setPm} />
            <BigCopyButton text={existingCmd} label="Copy Command" />
          </TabsContent>

          <TabsContent value="theme" className="mt-4 grid gap-4">
            <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1 text-xs">
              {(["css", "json", "design"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setThemeView(v)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    themeView === v
                      ? "bg-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "css"
                    ? "CSS"
                    : v === "json"
                      ? "components.json"
                      : "DESIGN.md"}
                </button>
              ))}
            </div>
            <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
              {themeText}
            </pre>
            {themeView === "design" ? (
              <div className="grid grid-cols-2 gap-2">
                <BigCopyButton text={themeText} label="Copy" variant="outline" />
                <DownloadButton
                  text={themeText}
                  filename="DESIGN.md"
                  label="Download DESIGN.md"
                />
              </div>
            ) : (
              <BigCopyButton
                text={themeText}
                label={themeView === "css" ? "Copy CSS" : "Copy components.json"}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
