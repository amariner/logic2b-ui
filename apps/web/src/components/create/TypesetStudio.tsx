import * as React from "react"

import { Button } from "@/registry/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs"

import {
  DEFAULT_CONFIG,
  FONTS,
  FLOWS,
  LEADINGS,
  MEASURES,
  SIZES,
  auditTypeset,
  buildTypesetCssExport,
  decodePreset,
  encodePreset,
  resolveTypeset,
  type Mode,
  type ReadabilityCheck,
  type ThemeConfig,
} from "@/lib/themes"
import { buildTypesetPrompt } from "@/lib/prompts"

const FONT_LABELS: Record<string, string> = {
  inter: "Inter",
  grotesk: "Space Grotesk",
  sans: "Sans",
  system: "System",
  serif: "Serif",
  mono: "Mono",
}
const MEASURE_LABELS: Record<string, string> = {
  narrow: "Narrow",
  default: "Default",
  relaxed: "Relaxed",
  wide: "Wide",
}
const SIZE_LABELS: Record<string, string> = {
  sm: "Small",
  default: "Default",
  lg: "Large",
  xl: "Extra Large",
}
const LEADING_LABELS: Record<string, string> = {
  tight: "Tight",
  default: "Default",
  relaxed: "Relaxed",
}
const FLOW_LABELS: Record<string, string> = {
  tight: "Tight",
  default: "Default",
  relaxed: "Relaxed",
}

/** Only the typeset-relevant fields — shuffle/reset never touch color/radius,
 *  those stay whatever they were (this studio composes with /create through
 *  the same preset id, it doesn't own the palette). */
const TYPESET_KEYS = ["heading", "font", "mono", "measure", "size", "leading", "flow"] as const
type TypesetKey = (typeof TYPESET_KEYS)[number]

/* Turn the config's typeset fields into inline CSS variables for the preview. */
function useTypesetStyle(cfg: ThemeConfig): React.CSSProperties {
  return React.useMemo(() => {
    const t = resolveTypeset(cfg)
    return {
      "--font-heading": t.fontHeading,
      "--font-sans": t.fontSans,
      "--font-mono": t.fontMono,
      "--type-measure": t.measure,
      "--type-size-base": t.size,
      "--type-leading-base": t.leading,
      "--type-flow": t.flow,
    } as React.CSSProperties
  }, [cfg])
}

/* Same customizer row as /create: label, current value, swatch/glyph. */
function ControlRow({
  label,
  valueLabel,
  glyph,
  options,
  value,
  onChange,
}: {
  label: string
  valueLabel: string
  glyph?: React.ReactNode
  options: { key: string; label: string }[]
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
          <span className="text-muted-foreground">{glyph}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.key} value={o.key}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function useCopy(text: string) {
  const [copied, setCopied] = React.useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return { copied, copy }
}

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

/** Readability audit (measure/leading heuristics) — same "warn in the rail"
 *  pattern as the theme studio's contrast audit, for typography instead of
 *  color. */
function ReadabilityDialog({ cfg }: { cfg: ThemeConfig }) {
  const checks = React.useMemo(() => auditTypeset(cfg), [cfg])
  const warnings = checks.filter((c) => !c.ok).length

  const Row = ({ c }: { c: ReadabilityCheck }) => (
    <div className="grid gap-0.5 py-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            c.ok ? "bg-[oklch(0.696_0.17_162.48)]" : "bg-destructive"
          }`}
        />
        <span className="text-xs font-semibold">{c.label}</span>
      </div>
      <p className="pl-3.5 text-xs text-muted-foreground">{c.message}</p>
    </div>
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          Readability
          <span
            className={`font-mono text-xs ${
              warnings > 0 ? "text-[oklch(0.769_0.188_70.08)]" : "text-muted-foreground"
            }`}
          >
            {warnings > 0 ? `${warnings} warning${warnings > 1 ? "s" : ""}` : "✓ passes"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-popover sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Readability audit</DialogTitle>
          <DialogDescription>
            Heuristic checks on line length and leading — the usual traps for
            long-form reading, not hard rules.
          </DialogDescription>
        </DialogHeader>
        <div className="grid divide-y">
          {checks.map((c) => (
            <Row key={c.key} c={c} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BigCopyButton({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopy(text)
  return (
    <Button className="w-full" onClick={copy}>
      {copied ? "Copied!" : label}
    </Button>
  )
}

/* Docs / Prompt tabs for the typeset.css export — same shape as /create's
   InstallBox, minus the package-manager switch (there's no CLI command
   here, just a file to drop in). */
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
  const css = buildTypesetCssExport(cfg, presetId)
  const prompt = buildTypesetPrompt(cfg, presetId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover sm:max-w-[480px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Get Code</DialogTitle>
          <DialogDescription>
            Copy the typeset.css this scale exports, or a prompt for your AI
            assistant.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="docs" activationMode="manual">
          <TabsList>
            <TabsTrigger value="docs">Docs</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
          </TabsList>
          <TabsContent value="docs" className="mt-4 grid gap-4">
            <p className="text-sm text-muted-foreground">
              Copy <code>typeset.css</code> into your project, next to your
              main stylesheet.
            </p>
            <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
              {css}
            </pre>
            <BigCopyButton text={css} label="Copy typeset.css" />
          </TabsContent>
          <TabsContent value="prompt" className="mt-4 grid gap-4">
            <p className="text-sm text-muted-foreground">
              A self-contained brief for Claude Code, Cursor or Copilot.
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
              {prompt}
            </pre>
            <BigCopyButton text={prompt} label="Copy Prompt" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function TypesetStudio({ children }: { children?: React.ReactNode }) {
  const [cfg, setCfg] = React.useState<ThemeConfig>(DEFAULT_CONFIG)
  const [mode, setMode] = React.useState<Mode>("dark")
  const [codeOpen, setCodeOpen] = React.useState(false)

  // Undo/redo history — a plain stack of configs, index-addressed.
  const [history, setHistory] = React.useState<ThemeConfig[]>([DEFAULT_CONFIG])
  const [index, setIndex] = React.useState(0)

  const commit = React.useCallback(
    (next: ThemeConfig) => {
      setCfg(next)
      setHistory((h) => [...h.slice(0, index + 1), next])
      setIndex((i) => i + 1)
    },
    [index],
  )
  const set = (patch: Partial<ThemeConfig>) => commit({ ...cfg, ...patch })

  const canUndo = index > 0
  const canRedo = index < history.length - 1
  const undo = React.useCallback(() => {
    setIndex((i) => {
      if (i === 0) return i
      setCfg(history[i - 1])
      return i - 1
    })
  }, [history])
  const redo = React.useCallback(() => {
    setIndex((i) => {
      if (i >= history.length - 1) return i
      setCfg(history[i + 1])
      return i + 1
    })
  }, [history])

  const shuffle = React.useCallback(() => {
    const pick = <T,>(obj: Record<string, T>) => {
      const keys = Object.keys(obj)
      return keys[Math.floor(Math.random() * keys.length)]
    }
    commit({
      ...cfg,
      heading: pick(FONTS),
      font: pick(FONTS),
      mono: pick(FONTS),
      measure: pick(MEASURES),
      size: pick(SIZES),
      leading: pick(LEADINGS),
      flow: pick(FLOWS),
    })
  }, [cfg, commit])

  const reset = React.useCallback(() => {
    const defaults = Object.fromEntries(
      TYPESET_KEYS.map((k) => [k, DEFAULT_CONFIG[k as TypesetKey]]),
    )
    commit({ ...cfg, ...defaults })
  }, [cfg, commit])

  const toggleMode = React.useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"))
  }, [])

  const style = useTypesetStyle(cfg)
  const presetId = encodePreset(cfg)

  // Header actions (BaseLayout renders Shuffle + Get Code for cta="get-code").
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

  // Keyboard shortcuts: R shuffle, D light/dark, ⌘Z undo, ⇧⌘Z redo, ⇧R reset.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === "r" && e.shiftKey) {
        e.preventDefault()
        reset()
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault()
        shuffle()
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault()
        toggleMode()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [shuffle, reset, undo, redo, toggleMode])

  // Shareable links: apply ?preset=… on load, keep the URL in sync
  // (replaceState — no history spam). Same codec/param as /create, so a
  // theme can travel between the two studios.
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("preset")
    if (!id) return
    const fromUrl = decodePreset(id.trim())
    if (fromUrl) {
      setCfg(fromUrl)
      setHistory([fromUrl])
      setIndex(0)
    }
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

  const fontOpts = Object.keys(FONTS).map((key) => ({
    key,
    label: FONT_LABELS[key] ?? key,
  }))
  const measureOpts = Object.keys(MEASURES).map((key) => ({
    key,
    label: `${MEASURE_LABELS[key] ?? key} (${MEASURES[key]})`,
  }))
  const sizeOpts = Object.keys(SIZES).map((key) => ({
    key,
    label: `${SIZE_LABELS[key] ?? key} (${SIZES[key]})`,
  }))
  const leadingOpts = Object.keys(LEADINGS).map((key) => ({
    key,
    label: `${LEADING_LABELS[key] ?? key} (${LEADINGS[key]})`,
  }))
  const flowOpts = Object.keys(FLOWS).map((key) => ({
    key,
    label: `${FLOW_LABELS[key] ?? key} (${FLOWS[key]})`,
  }))

  return (
    <div
      className={`flex w-full flex-col gap-3 p-3 lg:h-[calc(100dvh-3.5rem)] lg:flex-row lg:overflow-hidden ${
        mode === "dark" ? "bg-[oklch(0.115_0_0)]" : "bg-neutral-50"
      }`}
    >
      <aside className="dark flex max-h-[70dvh] w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[oklch(0.185_0_0)] text-foreground shadow-sm lg:h-full lg:max-h-none lg:w-72 lg:shrink-0">
        <div className="shrink-0 border-b border-white/10 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent">
                Menu
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={shuffle}>
                Shuffle
                <DropdownMenuShortcut>R</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleMode}>
                Light/Dark
                <DropdownMenuShortcut>D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!canUndo} onSelect={undo}>
                Undo
                <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canRedo} onSelect={redo}>
                Redo
                <DropdownMenuShortcut>⇧⌘Z</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={reset}>
                Reset
                <DropdownMenuShortcut>⇧R</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
            <p className="px-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Fonts
            </p>
            <ControlRow
              label="Heading"
              valueLabel={FONT_LABELS[cfg.heading] ?? cfg.heading}
              glyph={<span className="text-base font-semibold">Aa</span>}
              options={fontOpts}
              value={cfg.heading}
              onChange={(k) => set({ heading: k })}
            />
            <ControlRow
              label="Body"
              valueLabel={FONT_LABELS[cfg.font] ?? cfg.font}
              glyph={<span className="text-base">Aa</span>}
              options={fontOpts}
              value={cfg.font}
              onChange={(k) => set({ font: k })}
            />
            <ControlRow
              label="Mono"
              valueLabel={FONT_LABELS[cfg.mono] ?? cfg.mono}
              glyph={<span className="font-mono text-sm">Aa</span>}
              options={fontOpts}
              value={cfg.mono}
              onChange={(k) => set({ mono: k })}
            />

            <p className="px-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Scale
            </p>
            <ControlRow
              label="Measure"
              valueLabel={`${MEASURE_LABELS[cfg.measure] ?? cfg.measure} · ${MEASURES[cfg.measure]}`}
              glyph={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 6H3" /><path d="M21 18H3" /><path d="M7 12h10" /></svg>
              }
              options={measureOpts}
              value={cfg.measure}
              onChange={(k) => set({ measure: k })}
            />
            <ControlRow
              label="Size"
              valueLabel={`${SIZE_LABELS[cfg.size] ?? cfg.size} · ${SIZES[cfg.size]}`}
              glyph={<span className="text-sm font-semibold">T↕</span>}
              options={sizeOpts}
              value={cfg.size}
              onChange={(k) => set({ size: k })}
            />
            <ControlRow
              label="Leading"
              valueLabel={`${LEADING_LABELS[cfg.leading] ?? cfg.leading} · ${LEADINGS[cfg.leading]}`}
              glyph={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
              }
              options={leadingOpts}
              value={cfg.leading}
              onChange={(k) => set({ leading: k })}
            />
            <ControlRow
              label="Flow"
              valueLabel={`${FLOW_LABELS[cfg.flow] ?? cfg.flow} · ${FLOWS[cfg.flow]}`}
              glyph={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="6" x="3" y="3" rx="1" /><rect width="18" height="6" x="3" y="15" rx="1" /></svg>
              }
              options={flowOpts}
              value={cfg.flow}
              onChange={(k) => set({ flow: k })}
            />
          </div>
        </div>

        <div className="grid shrink-0 gap-2 border-t border-white/10 p-4">
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">
            <span className="truncate">--preset {presetId}</span>
            <CopyLinkButton />
          </div>
          <ReadabilityDialog cfg={cfg} />
          <Button className="w-full" onClick={() => setCodeOpen(true)}>
            Get Code
          </Button>
        </div>
      </aside>

      <GetCodeDialog cfg={cfg} presetId={presetId} open={codeOpen} onOpenChange={setCodeOpen} />

      <div
        style={style}
        className={`typeset-canvas relative min-w-0 flex-1 overflow-y-auto rounded-xl text-foreground shadow-sm lg:h-full ${
          mode === "dark" ? "dark border border-white/10 bg-[oklch(0.16_0_0)]" : "bg-neutral-100"
        }`}
      >
        <div className="flex min-h-full justify-center px-6 py-12 sm:px-10">
          <article className="prose">{children}</article>
        </div>
      </div>
    </div>
  )
}
