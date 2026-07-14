"use client"

import * as React from "react"

import { cn } from "@/registry/lib/utils"

/* ---------------------------------------------------------------- color math */

type Hsv = [h: number, s: number, v: number]

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")
  )
}

function hexToHsv(hex: string): Hsv | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  let r = (int >> 16) & 255
  let g = (int >> 8) & 255
  let b = int & 255
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, max === 0 ? 0 : d / max, max]
}

const hsvToHex = ([h, s, v]: Hsv) => rgbToHex(...hsvToRgb(h, s, v))

/* ------------------------------------------------------------------ component */

export interface ColorPickerProps
  extends Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> {
  /** Current color as a `#rrggbb` hex string (controlled). */
  value?: string
  defaultValue?: string
  onValueChange?: (hex: string) => void
}

/**
 * A self-contained HSV color picker: a saturation/value area, a hue slider and
 * a hex input. Controlled via `value`/`onValueChange` or uncontrolled via
 * `defaultValue`. Emits `#rrggbb`. Zero dependencies.
 */
function ColorPicker({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: ColorPickerProps) {
  const [hsv, setHsv] = React.useState<Hsv>(
    () => hexToHsv(value ?? defaultValue ?? "#000000") ?? [0, 0, 0]
  )
  const hex = hsvToHex(hsv)
  const lastEmit = React.useRef(hex)
  const [hexDraft, setHexDraft] = React.useState(hex)

  // Sync from a controlled value that changed outside our own emissions.
  React.useEffect(() => {
    if (value && value.toLowerCase() !== lastEmit.current.toLowerCase()) {
      const parsed = hexToHsv(value)
      if (parsed) {
        setHsv(parsed)
        setHexDraft(hsvToHex(parsed))
      }
    }
  }, [value])

  const commit = (next: Hsv) => {
    setHsv(next)
    const h = hsvToHex(next)
    setHexDraft(h)
    lastEmit.current = h
    onValueChange?.(h)
  }

  const [hue, sat, val] = hsv
  const svRef = React.useRef<HTMLDivElement>(null)
  const hueRef = React.useRef<HTMLDivElement>(null)

  const moveSv = (e: React.PointerEvent) => {
    const rect = svRef.current?.getBoundingClientRect()
    if (!rect) return
    commit([
      hue,
      clamp01((e.clientX - rect.left) / rect.width),
      clamp01(1 - (e.clientY - rect.top) / rect.height),
    ])
  }

  const moveHue = (e: React.PointerEvent) => {
    const rect = hueRef.current?.getBoundingClientRect()
    if (!rect) return
    commit([clamp01((e.clientX - rect.left) / rect.width) * 360, sat, val])
  }

  const startDrag =
    (handler: (e: React.PointerEvent) => void) => (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      handler(e)
    }

  const hueHex = hsvToHex([hue, 1, 1])

  return (
    <div
      data-slot="color-picker"
      className={cn("flex w-56 flex-col gap-3", className)}
      {...props}
    >
      {/* Saturation / value area */}
      <div
        ref={svRef}
        data-slot="color-picker-area"
        onPointerDown={startDrag(moveSv)}
        onPointerMove={(e) => e.buttons === 1 && moveSv(e)}
        className="relative h-40 w-full cursor-crosshair touch-none overflow-hidden rounded-md border"
        style={{
          backgroundColor: hueHex,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
      >
        <span
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/30"
          style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%` }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        data-slot="color-picker-hue"
        onPointerDown={startDrag(moveHue)}
        onPointerMove={(e) => e.buttons === 1 && moveHue(e)}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full border"
        style={{
          backgroundImage:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/30"
          style={{ left: `${(hue / 360) * 100}%` }}
        />
      </div>

      {/* Swatch + hex input */}
      <div className="flex items-center gap-2">
        <span
          data-slot="color-picker-swatch"
          className="size-8 shrink-0 rounded-md border"
          style={{ backgroundColor: hex }}
        />
        <input
          data-slot="color-picker-hex"
          aria-label="Hex color"
          value={hexDraft}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value
            setHexDraft(next)
            const parsed = hexToHsv(next)
            if (parsed) commit(parsed)
          }}
          onBlur={() => setHexDraft(hex)}
          className={cn(
            "border-input h-8 w-full min-w-0 rounded-md border bg-transparent px-2 font-mono text-sm uppercase shadow-xs outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          )}
        />
      </div>
    </div>
  )
}

export { ColorPicker }
