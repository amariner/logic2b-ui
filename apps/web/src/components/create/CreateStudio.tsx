import * as React from "react"

import { Button } from "@/registry/ui/button"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
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
  customAccent,
  customChart,
  customKey,
  parseCustomKey,
  resolveTokens,
  sidebarTokens,
  type Mode,
  type ThemeConfig,
} from "@/lib/themes"
import { buildAgentsMd } from "@/lib/agents-md"
import { auditTokens, type PairResult } from "@logic2b/tokens/contrast"
import { buildInitPrompt } from "@/lib/prompts"
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
import {
  PortfolioDonut,
  LightingControls,
  RollerShades,
  HoldingsTable,
  DashboardNav,
  CardBalance,
  UpcomingPayments,
  CoverArtUpload,
  ConnectBank,
  FrontDoorLock,
  DollarCostAveraging,
  SyncingAccounts,
} from "@/components/create/preview-widgets-b"
import {
  NovaTypography,
  TypographySample,
  ToolbarIcons,
  Codespaces,
  InviteTeam,
  AIAgent,
  SkeletonCard,
  BrowserShare,
  NoTeamMembers,
  ReportBug,
  Contributors,
  TopicFeedback,
  SleepReport,
  WeeklyFitness,
  VisitorsChart,
  UsageMeter,
  AnomalyAlert,
  AudioWaveform,
  ContributionsActivity,
} from "@/components/create/preview-widgets-c"

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
  // The canvas follows the site's light/dark theme (toggled from the header),
  // like shadcn — no separate switch in the customizer.
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

  // Mirror the site theme (the `dark` class on <html>) into the canvas.
  React.useEffect(() => {
    const el = document.documentElement
    const sync = () => setMode(el.classList.contains("dark") ? "dark" : "light")
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(el, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  // Shareable links: apply ?preset=… on load, then keep the URL in sync with
  // the current theme (replaceState — no history spam) so the address bar is
  // always a share link. The default config keeps a clean URL.
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("preset")
    if (!id) return
    const fromUrl = decodePreset(id.trim())
    if (fromUrl) setCfg(fromUrl)
  }, [])
  React.useEffect(() => {
    const url = new URL(window.location.href)
    if (presetId === encodePreset(DEFAULT_CONFIG)) {
      url.searchParams.delete("preset")
    } else {
      url.searchParams.set("preset", presetId)
    }
    window.history.replaceState(null, "", url)
  }, [presetId])

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
    <div
      className={`flex w-full flex-col gap-3 p-3 lg:h-[calc(100dvh-3.5rem)] lg:flex-row lg:overflow-hidden ${
        mode === "dark" ? "bg-[oklch(0.115_0_0)]" : "bg-neutral-50"
      }`}
    >
      {/* Customizer rail — a floating dark control panel, like shadcn.
          Pinned header + footer, only the middle scrolls (scrollbar hidden). */}
      <aside className="dark flex max-h-[70dvh] w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[oklch(0.185_0_0)] text-foreground shadow-sm lg:h-full lg:max-h-none lg:w-72 lg:shrink-0">
        {/* Pinned header */}
        <div className="flex shrink-0 items-center border-b border-white/10 px-4 py-3.5">
          <h2 className="text-sm font-semibold">Customize</h2>
        </div>

        {/* Scrollable controls — hidden scrollbar */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            valueLabel={(ACCENTS[cfg.theme] ?? customAccent(cfg.theme))?.label ?? cfg.theme}
            swatch={(ACCENTS[cfg.theme] ?? customAccent(cfg.theme))?.swatch}
            options={[...accentOpts, { key: "custom", label: "Custom…" }]}
            value={ACCENTS[cfg.theme] ? cfg.theme : "custom"}
            onChange={(k) =>
              set({ theme: k === "custom" ? DEFAULT_CUSTOM_ACCENT : k })
            }
          />
          {parseCustomKey(cfg.theme) && (
            <CustomAccentSliders
              value={cfg.theme}
              onChange={(key) => set({ theme: key })}
            />
          )}
          <ControlRow
            label="Chart Color"
            valueLabel={(CHARTS[cfg.chart] ?? customChart(cfg.chart))?.label ?? cfg.chart}
            swatch={(CHARTS[cfg.chart] ?? customChart(cfg.chart))?.swatch}
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
        </div>

        {/* Pinned footer */}
        <div className="grid shrink-0 gap-2 border-t border-white/10 p-4">
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">
            <span className="truncate">--preset {presetId}</span>
            <CopyLinkButton />
          </div>
          <ContrastDialog cfg={cfg} />
          <div className="grid grid-cols-2 gap-2">
            <OpenPresetDialog onApply={setCfg} />
            <Button variant="outline" size="sm" onClick={shuffle}>
              Shuffle
            </Button>
          </div>
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
      {/* Two pages, each a horizontal-scroll masonry: columns are flex-cols
          (no vertical gaps) with varied widths; the canvas scrolls sideways.
          A floating 01/02 pager switches pages. */}
      <div
        style={style}
        className={`create-canvas relative min-w-0 flex-1 overflow-hidden rounded-xl text-foreground shadow-sm lg:h-full ${
          mode === "dark" ? "dark border border-white/10 bg-[oklch(0.16_0_0)]" : "bg-neutral-100"
        }`}
      >
        <div className="h-full overflow-x-auto p-4 sm:p-6">
          {page === 1 ? (
            <div className="flex items-start gap-6 pb-2">
              <div className="flex w-[300px] shrink-0 flex-col gap-6">
                <ContributionHistory animate={false} />
                <DistributeCard />
                <QrConnectCard />
                <DollarCostAveraging />
              </div>
              <div className="flex w-[340px] shrink-0 flex-col gap-6">
                <PayoutThreshold />
                <ClaimableBalance />
                <SyncingAccounts />
              </div>
              <div className="flex w-[320px] shrink-0 flex-col gap-6">
                <SavingsTargets />
                <PreferencesCard />
                <PortfolioDonut animate={false} />
              </div>
              <div className="flex w-[360px] shrink-0 flex-col gap-6">
                <BuyInvestment />
                <RecentTransactions />
                <CardBalance />
              </div>
              <div className="flex w-[380px] shrink-0 flex-col gap-6">
                <AccountAccess />
                <DashboardNav />
                <LightingControls />
              </div>
              <div className="flex w-[360px] shrink-0 flex-col gap-6">
                <ReceivingMethod />
                <PaymentsCard />
                <SecurityFaq />
              </div>
              <div className="flex w-[380px] shrink-0 flex-col gap-6">
                <StockPerformance animate={false} />
                <TransferFunds />
                <FrontDoorLock />
              </div>
              <div className="flex w-[380px] shrink-0 flex-col gap-6">
                <DividendList />
                <PowerUsage animate={false} />
                <HoldingsTable />
              </div>
              <div className="flex w-[340px] shrink-0 flex-col gap-6">
                <MilestoneForm />
                <ConnectBank />
                <UpcomingPayments />
              </div>
              <div className="flex w-[300px] shrink-0 flex-col gap-6">
                <SocialLinks />
                <NotificationsCard />
                <CoverArtUpload />
                <RollerShades />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-6 pb-2">
              <div className="flex w-[300px] shrink-0 flex-col gap-6">
                <NovaTypography />
                <Codespaces />
                <InvoiceCard />
              </div>
              <div className="flex w-[360px] shrink-0 flex-col gap-6">
                <ToolbarIcons />
                <ComponentShowcase />
                <TypographySample />
              </div>
              <div className="flex w-[360px] shrink-0 flex-col gap-6">
                <EnvVariables />
                <TrafficChannels animate={false} />
                <ShippingAddress />
              </div>
              <div className="flex w-[340px] shrink-0 flex-col gap-6">
                <InviteTeam />
                <AIAgent />
                <SkeletonCard />
              </div>
              <div className="flex w-[300px] shrink-0 flex-col gap-6">
                <BrowserShare animate={false} />
                <NoTeamMembers />
                <Contributors />
              </div>
              <div className="flex w-[340px] shrink-0 flex-col gap-6">
                <TopicFeedback />
                <ReportBug />
                <AnomalyAlert />
              </div>
              <div className="flex w-[340px] shrink-0 flex-col gap-6">
                <BookAppointment />
                <SleepReport animate={false} />
                <WeeklyFitness animate={false} />
              </div>
              <div className="flex w-[360px] shrink-0 flex-col gap-6">
                <ProfileCard />
                <FileUpload />
                <AnalyticsCard animate={false} />
              </div>
              <div className="flex w-[320px] shrink-0 flex-col gap-6">
                <UsageMeter />
                <ShortcutsCard />
                <AudioWaveform />
              </div>
              <div className="flex w-[300px] shrink-0 flex-col gap-6">
                <VisitorsChart animate={false} />
                <ContributionsActivity />
                <NotFoundCard />
              </div>
            </div>
          )}
        </div>

        {/* Floating page switcher */}
        <div className="absolute bottom-4 right-4 flex gap-1.5 rounded-lg border bg-background/80 p-1 shadow-sm backdrop-blur">
          {[1, 2].map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              aria-label={`Page ${n}`}
              aria-current={page === n}
              className={`inline-flex size-8 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors ${
                page === n
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {n.toString().padStart(2, "0")}
            </button>
          ))}
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

/* Install box: Command | Prompt switch, package-manager tabs and copy icon in
   the header row, the payload below (reference: shadcn /create dialog).
   "Prompt" is a self-contained brief for an AI assistant — paste it into
   Claude Code, Cursor or Copilot instead of running the command yourself. */
function InstallBox({
  cmd,
  prompt,
  pm,
  onPmChange,
}: {
  cmd: string
  prompt: string
  pm: string
  onPmChange: (p: string) => void
}) {
  const [view, setView] = React.useState<"command" | "prompt">("command")
  const text = view === "command" ? cmd : prompt
  const { copied, copy } = useCopy(text)
  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-lg border bg-muted/40">
        <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
          <div className="flex items-center gap-1 text-xs">
            {(["command", "prompt"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={
                  v === view
                    ? "rounded-md border bg-background px-2 py-0.5 font-medium"
                    : "px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {v === "command" ? "Command" : "Prompt"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {view === "command" ? (
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
            ) : (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                for your AI assistant
              </span>
            )}
            <button
              aria-label={view === "command" ? "Copy command" : "Copy prompt"}
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
        </div>
        {view === "command" ? (
          <pre className="overflow-x-auto px-3 py-2.5 font-mono text-xs leading-relaxed">{cmd}</pre>
        ) : (
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap px-3 py-2.5 font-mono text-xs leading-relaxed">{prompt}</pre>
        )}
      </div>
      <Button className="w-full" onClick={copy}>
        {copied ? "Copied!" : view === "command" ? "Copy Command" : "Copy Prompt"}
      </Button>
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

/** Default starting point when "Custom…" is picked: a saturated azure. */
const DEFAULT_CUSTOM_ACCENT = "h250c0.2"

/** Hue + chroma sliders for the custom accent. The value is the serialized
 *  "h<hue>c<chroma>" key so every edit round-trips through the preset id. */
function CustomAccentSliders({
  value,
  onChange,
}: {
  value: string
  onChange: (key: string) => void
}) {
  const parsed = parseCustomKey(value) ?? { hue: 250, chroma: 0.2 }
  const swatch = customAccent(value)?.swatch
  const Slider = ({
    label,
    min,
    max,
    step,
    val,
    onVal,
  }: {
    label: string
    min: number
    max: number
    step: number
    val: number
    onVal: (n: number) => void
  }) => (
    <label className="grid gap-1">
      <span className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        <span className="font-mono normal-case">{val}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        aria-label={label}
        onChange={(e) => onVal(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--slider-accent)]"
        style={{ "--slider-accent": swatch } as React.CSSProperties}
      />
    </label>
  )
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3">
      <Slider
        label="Hue"
        min={0}
        max={360}
        step={1}
        val={parsed.hue}
        onVal={(h) => onChange(customKey(h, parsed.chroma))}
      />
      <Slider
        label="Chroma"
        min={0}
        max={0.4}
        step={0.005}
        val={parsed.chroma}
        onVal={(c) => onChange(customKey(parsed.hue, c))}
      />
    </div>
  )
}

/** Contrast audit (WCAG 2.2 + APCA) of the current theme's text pairs. The
 *  rail button warns when any pair misses its baseline; the dialog lists
 *  every pair per mode with both metrics. */
function ContrastDialog({ cfg }: { cfg: ThemeConfig }) {
  const { light, dark, warnings } = React.useMemo(() => {
    const decls = (mode: Mode) => ({
      ...resolveTokens(cfg, mode).tokens,
      ...sidebarTokens(cfg, mode),
    })
    const light = auditTokens(decls("light"))
    const dark = auditTokens(decls("dark"))
    return { light, dark, warnings: [...light, ...dark].filter((r) => r.warn).length }
  }, [cfg])

  const Row = ({ r }: { r: PairResult }) => (
    <div className="flex items-center justify-between gap-2 py-1 font-mono text-xs">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            r.warn ? "bg-destructive" : "bg-[oklch(0.696_0.17_162.48)]"
          }`}
        />
        <span className="truncate">
          {r.fg} / {r.bg}
        </span>
      </span>
      <span className={`shrink-0 tabular-nums ${r.warn ? "text-destructive" : "text-muted-foreground"}`}>
        {r.wcag.toFixed(2)}:1 · Lc {Math.abs(r.apca).toFixed(0)}
      </span>
    </div>
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          Contrast
          <span
            className={`font-mono text-xs ${
              warnings > 0 ? "text-[oklch(0.769_0.188_70.08)]" : "text-muted-foreground"
            }`}
          >
            {warnings > 0 ? `${warnings} warning${warnings > 1 ? "s" : ""}` : "✓ passes"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-popover sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Contrast audit</DialogTitle>
          <DialogDescription>
            WCAG 2.2 ratio and APCA Lc for every text pair. Body pairs need
            4.5:1 / Lc 60; muted (secondary) pairs need 3:1 / Lc 45.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-80 gap-4 overflow-y-auto">
          {(
            [
              ["Light", light],
              ["Dark", dark],
            ] as const
          ).map(([label, results]) => (
            <div key={label}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              {results.map((r) => (
                <Row key={`${r.fg}/${r.bg}`} r={r} />
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Copies the current address — the URL always carries ?preset=… (kept in
 *  sync above), so it IS the share link. */
function CopyLinkButton() {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      className="shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
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
  const [themeView, setThemeView] = React.useState<
    "css" | "json" | "design" | "agents"
  >("css")

  const newCmd = `${PMS[pm]} logic2b@latest init --template ${tpl}${
    monorepo ? " --monorepo" : ""
  } --preset ${presetId}`
  const existingCmd = `${PMS[pm]} logic2b@latest init --preset ${presetId}`
  const newPrompt = buildInitPrompt({
    cfg,
    presetId,
    mode: "new",
    template: tpl,
    monorepo,
  })
  const existingPrompt = buildInitPrompt({ cfg, presetId, mode: "existing" })
  const themeText =
    themeView === "css"
      ? buildCss(cfg)
      : themeView === "json"
        ? buildComponentsJson(cfg)
        : themeView === "design"
          ? buildDesignMd(cfg)
          : buildAgentsMd(cfg)

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
            <InstallBox cmd={newCmd} prompt={newPrompt} pm={pm} onPmChange={setPm} />
          </TabsContent>

          <TabsContent value="existing" className="mt-4 grid gap-4">
            <p className="text-sm text-muted-foreground">
              Run <code>init</code> inside your project — it writes{" "}
              <code>components.json</code> and applies this exact theme via the
              preset.
            </p>
            <InstallBox
              cmd={existingCmd}
              prompt={existingPrompt}
              pm={pm}
              onPmChange={setPm}
            />
          </TabsContent>

          <TabsContent value="theme" className="mt-4 grid gap-4">
            <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1 text-xs">
              {(["css", "json", "design", "agents"] as const).map((v) => (
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
                      : v === "design"
                        ? "DESIGN.md"
                        : "AGENTS.md"}
                </button>
              ))}
            </div>
            <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
              {themeText}
            </pre>
            {themeView === "design" || themeView === "agents" ? (
              <div className="grid grid-cols-2 gap-2">
                <BigCopyButton text={themeText} label="Copy" variant="outline" />
                <DownloadButton
                  text={themeText}
                  filename={themeView === "design" ? "DESIGN.md" : "AGENTS.md"}
                  label={
                    themeView === "design"
                      ? "Download DESIGN.md"
                      : "Download AGENTS.md"
                  }
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
