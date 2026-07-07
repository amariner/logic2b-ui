# logic2b ui — Style Reference
> engineered darkness, one electric signal

**Theme:** dark-first (light mode fully supported)

logic2b ui reads as an instrument, not a decoration: a near-black canvas where
content is carved out of the void by luminance stepping, never by heavy shadows
or gradients. Display type is set in Space Grotesk with tight tracking and
compressed line-height — confident, geometric, slightly futuristic — while
Inter carries body copy and UI chrome. A single electric blue provides every
functional accent: primary actions, focus rings, active borders, glows. Nothing
else in the interface is allowed to be chromatic except data (charts) and
status (destructive red). Components feel engineered: hairline 1px borders,
minimal elevation, translucent surfaces that let the void show through.

## Tokens — Color primitives

The raw palette. Components never reference these directly — they consume the
semantic tokens in the next section. All values are oklch (exact conversions
from the source hex).

| Name | Hex | oklch | Role |
|------|-----|-------|------|
| Void | `#000000` | `oklch(0 0 0)` | Page canvas in dark mode — the infinite black |
| Graphite | `#111111` | `oklch(0.1776 0 0)` | Cards, first surface above the void; foreground text in light mode |
| Obsidian | `#171717` | `oklch(0.2046 0 0)` | Popovers, secondary/muted surfaces, recessed controls |
| Slate | `#242424` | `oklch(0.2603 0 0)` | Hover states and the brightest dark surface |
| Smoke | `#666666` | `oklch(0.5103 0 0)` | Muted text on light backgrounds |
| Mist | `#999999` | `oklch(0.683 0 0)` | Muted text on dark backgrounds — readable, never competing |
| Pearl | `#cccccc` | `oklch(0.8452 0 0)` | Neutral chart stop on dark |
| Bone | `#ffffff` | `oklch(1 0 0)` | Headings and body on dark; page canvas in light mode |
| Electric Blue | `#0099ff` | `oklch(0.669 0.1837 248.807)` | THE accent (dark mode): primary fills, rings, active borders, glows |
| Action Blue | `#0066ff` | `oklch(0.5635 0.2408 260.818)` | THE accent (light mode): primary fills and rings on white |
| Signal Green | `#4cd963` | `oklch(0.7838 0.2004 146.164)` | Chart series only — never a status color |
| Amber | `#ffbb00` | `oklch(0.8328 0.1716 82.058)` | Chart series only — never a status color |
| Alert Red | `#ff0022` | `oklch(0.6293 0.256 26.417)` | Destructive actions and the red chart stop |

## Tokens — Semantic mapping

The system is consumed exclusively through these tokens (`bg-primary`,
`text-muted-foreground`, …). Hardcoding colors in components is forbidden.

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `oklch(1 0 0)` | `oklch(0 0 0)` |
| `--foreground` | `oklch(0.1776 0 0)` | `oklch(1 0 0)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.1776 0 0)` |
| `--card-foreground` | `oklch(0.1776 0 0)` | `oklch(1 0 0)` |
| `--popover` | `oklch(1 0 0)` | `oklch(0.2046 0 0)` |
| `--popover-foreground` | `oklch(0.1776 0 0)` | `oklch(1 0 0)` |
| `--primary` | `oklch(0.5635 0.2408 260.818)` | `oklch(0.669 0.1837 248.807)` |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(0 0 0)` |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.2046 0 0)` |
| `--secondary-foreground` | `oklch(0.1776 0 0)` | `oklch(1 0 0)` |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.2046 0 0)` |
| `--muted-foreground` | `oklch(0.5103 0 0)` | `oklch(0.683 0 0)` |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.2603 0 0)` |
| `--accent-foreground` | `oklch(0.1776 0 0)` | `oklch(1 0 0)` |
| `--destructive` | `oklch(0.58 0.237 26.417)` | `oklch(0.6293 0.256 26.417)` |
| `--destructive-foreground` | `oklch(1 0 0)` | `oklch(1 0 0)` |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.5635 0.2408 260.818)` | `oklch(0.669 0.1837 248.807)` |
| `--chart-1` | Action Blue | Electric Blue |
| `--chart-2` | `oklch(0.62 0.19 146.164)` | Signal Green |
| `--chart-3` | `oklch(0.723 0.16 82.058)` | Amber |
| `--chart-4` | Alert Red | Alert Red |
| `--chart-5` | Smoke | Pearl |
| `--radius` | `0.5rem` | `0.5rem` |

Key signature: in dark mode the primary button is Electric Blue with **black**
text — a switched-on neon control on the void. In light mode it is Action Blue
with white text.

## Tokens — Typography

### Space Grotesk (`--font-heading`)
- **Role:** display and headings (h1–h4). Geometric presence with tight
  tracking (-0.025em baseline; up to -0.04em at display sizes) and compressed
  line-height (0.9–1.1 at display sizes). This is the system's voice.
- **Weights:** variable 300–700; headings default to 600–700.
- Self-hosted via `@fontsource-variable/space-grotesk`.

### Inter (`--font-sans`)
- **Role:** body, navigation, UI controls, labels — the workhorse. Tracking
  neutral to slightly negative at large sizes.
- **Weights:** variable 100–900; UI text uses 400–600.
- Self-hosted via `@fontsource-variable/inter`.

### Monospace (`--font-mono`)
- **Role:** code blocks, install commands, technical metadata. System stack
  (`ui-monospace, SFMono-Regular, Menlo, monospace`) — no webfont cost.

### Type scale (site)

| Role | Size | Line height | Tracking | Font |
|------|------|-------------|----------|------|
| caption | 12px | 1.2 | -0.01em | Inter |
| body-sm | 14px | 1.4 | -0.006em | Inter |
| body | 16px | 1.5 | -0.011em | Inter |
| subheading | 20px | 1.3 | -0.02em | Space Grotesk 600 |
| heading | 30–36px | 1.15 | -0.025em | Space Grotesk 700 |
| display | 48–68px | 0.95–1.05 | -0.035em | Space Grotesk 700 |

## Spacing, shape & elevation

- **Density:** compact controls, generous section rhythm. Section gap ~80px;
  element gap 8–12px; card padding 24–32px.
- **Radius:** `--radius: 0.5rem` (8px) for inputs and buttons; cards derive
  `--radius-xl` (12px). Tags and pills are fully rounded (`9999px`).
- **Elevation is luminance, not shadow.** Depth comes from the surface ladder
  (void → graphite → obsidian → slate) and 1px hairline borders
  (`oklch(1 0 0 / 10%)`). Box-shadows are reserved for overlays (popover,
  dialog) and the accent glow: `rgba(0, 153, 255, 0.2) 0 5px 20px` applied
  sparingly to elements that must feel switched on.

## Surfaces (dark)

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Void | `#000000` | Page canvas |
| 1 | Graphite | `#111111` | Cards, panels |
| 2 | Obsidian | `#171717` | Popovers, secondary fills, recessed controls |
| 3 | Slate | `#242424` | Hover / pressed states |

## Do's and Don'ts

### Do
- Use Space Grotesk 600–700 for every heading; keep tracking negative and
  line-height compressed at display sizes.
- Use Electric Blue exclusively for interactive emphasis: primary fills, focus
  rings, active borders, glows. One accent, everywhere, nothing else.
- Communicate depth with the surface ladder and hairline borders.
- Keep the dark canvas pure black (`#000`) — dark mode is the brand mode.
- Route every color through semantic tokens (`bg-primary`, `border-border`).

### Don't
- Don't introduce a second chromatic accent. Green/amber/red exist only as
  chart series and destructive state.
- Don't use box-shadows on standard cards — luminance stepping only.
- Don't use white card fills in dark mode; cards live in the #111–#242424 band.
- Don't use warm or tinted grays; the neutral ramp is strictly achromatic.
- Don't mix fonts inside a text block: Space Grotesk for headings, Inter for
  everything else, mono for code only.
- Don't set body text below 12px.

## Component treatments (target spec)

- **Primary button:** Electric Blue fill, black text (dark) / Action Blue fill,
  white text (light). Radius `--radius`; pill (`9999px`) reserved for hero CTAs
  and tags.
- **Secondary button:** Obsidian fill, white text (dark); light-gray fill,
  graphite text (light). Reads as a recessed control.
- **Ghost button:** transparent, hover lifts to `--accent`.
- **Card:** `--card` surface, 1px `--border` hairline, no shadow, radius-xl.
- **Input:** `--input` hairline border, focus ring Electric/Action Blue.
- **Active/selected:** 1px accent border, optional blue glow shadow.

## Agent quick reference

- Text primary: `--foreground` · Text secondary: `--muted-foreground`
- Page: `--background` · Card: `--card` · Hover: `--accent`
- The one accent: `--primary` (Electric Blue dark / Action Blue light)
- Focus: `--ring` · Hairline: `--border`
- Headings: `font-heading` (Space Grotesk), tracking tight
- Example hero: 60px Space Grotesk 700, line-height 1, tracking -0.035em,
  white on `#000`; below it one `bg-primary` CTA and one ghost button.

## Similar brands

- **Linear** — dark canvas as a design surface, compressed geometric display
  type, single accent.
- **Vercel** — monochrome interface, typography-dominant hierarchy.
- **Framer** — black canvas with electric-blue punctuation, luminance depth.
- **Raycast** — dark UI, blue accent glows, compact density.
