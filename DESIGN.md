# logic2b ui — Style Reference
> engineered darkness, monochrome discipline

**Theme:** dark-first (light mode fully supported)

logic2b ui reads as an instrument, not a decoration: a near-black canvas where
content is carved out by luminance stepping, never by heavy shadows or
gradients. Type is set in Inter across the board — display and headings
tighten their tracking and compress line-height for a confident, engineered
voice, while regular weights carry body copy and UI chrome. The interface itself is strictly monochrome: in dark mode the
primary action is a flash of white on the dark canvas; the only chromatic
color belongs to data (charts) and status (destructive red). Components feel
engineered: hairline 1px borders, minimal elevation, restraint everywhere.

## Tokens — Semantic mapping

The system is consumed exclusively through these tokens (`bg-primary`,
`text-muted-foreground`, …). Hardcoding colors in components is forbidden.
All values are oklch.

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--destructive-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |
| `--radius` | `0.625rem` | `0.625rem` |

Chart series (`--chart-1…5`) are the one place color lives; the default
palette mixes warm and cool stops per mode (see `apps/web/src/styles/global.css`).

Key signature: in dark mode the primary button is near-white with dark text —
a flash of brightness on the dark canvas. Depth never comes from shadows; it
comes from the luminance ladder and hairline borders.

## Tokens — Typography

### Inter (`--font-heading` and `--font-sans`)
- **Role:** the whole interface. Headings (h1–h4) use tight tracking
  (-0.025em baseline; up to -0.04em at display sizes) and compressed
  line-height (0.95–1.1 at display sizes); body, navigation, controls and
  labels use regular weights. One family, differentiated by weight/tracking.
- **Weights:** variable 100–900; headings 600–700, UI text 400–600.
- Self-hosted via `@fontsource-variable/inter`. `--font-heading` stays a
  separate token so a project (or the theme studio) can swap in a display
  family without touching components.

### Monospace (`--font-mono`)
- **Role:** code blocks, install commands, technical metadata. System stack
  (`ui-monospace, SFMono-Regular, Menlo, monospace`) — no webfont cost.

### Type scale (site)

| Role | Size | Line height | Tracking | Font |
|------|------|-------------|----------|------|
| caption | 12px | 1.2 | -0.01em | Inter |
| body-sm | 14px | 1.4 | -0.006em | Inter |
| body | 16px | 1.5 | -0.011em | Inter |
| subheading | 20px | 1.3 | -0.02em | Inter 600 |
| heading | 30–36px | 1.15 | -0.025em | Inter 700 |
| display | 48–68px | 0.95–1.05 | -0.035em | Inter 700 |

## Spacing, shape & elevation

- **Density:** compact controls, generous section rhythm. Section gap ~80px;
  element gap 8–12px; card padding 24–32px.
- **Radius:** `--radius: 0.625rem`; inputs/buttons derive `--radius-md`,
  cards `--radius-xl`. Tags and pills are fully rounded (`9999px`).
- **Elevation is luminance, not shadow.** Depth comes from the surface ladder
  and 1px hairline borders (`oklch(1 0 0 / 10%)` in dark). Box-shadows are
  reserved for overlays (popover, dialog, dropdown).

## Surfaces (dark)

| Level | Token | Value | Purpose |
|-------|-------|-------|---------|
| 0 | `--background` | `oklch(0.145 0 0)` | Page canvas |
| 1 | `--card` / `--popover` | `oklch(0.205 0 0)` | Cards, panels, overlays |
| 2 | `--secondary` / `--muted` / `--accent` | `oklch(0.269 0 0)` | Recessed fills, hover states |

## Do's and Don'ts

### Do
- Use Inter 600–700 for every heading; keep tracking negative and
  line-height compressed at display sizes.
- Keep the interface monochrome: white-on-dark primary, gray ladder for
  everything else.
- Communicate depth with the surface ladder and hairline borders.
- Dark is the default mode; light must always remain first-class.
- Route every color through semantic tokens (`bg-primary`, `border-border`).

### Don't
- Don't introduce chromatic accents in UI chrome. Color exists only in chart
  series and the destructive state.
- Don't use box-shadows on standard cards — luminance stepping only.
- Don't use warm or tinted grays; the neutral ramp is strictly achromatic.
- Don't mix fonts inside a text block: one family for text, mono for code
  only.
- Don't set body text below 12px.

## Component treatments

- **Primary button:** near-white fill, dark text (dark mode); near-black fill,
  white text (light mode). The brightest element on screen.
- **Secondary/ghost:** recessed `--secondary` fill or transparent with hover
  lift to `--accent`.
- **Card:** `--card` surface, 1px `--border` hairline, no shadow.
- **Dialog/popover:** `--popover` surface — one luminance step above the
  canvas — with border and a restrained shadow.
- **Input:** `--input` hairline border; focus ring via `--ring`.

## Agent quick reference

- Text primary: `--foreground` · Text secondary: `--muted-foreground`
- Page: `--background` · Card/overlay: `--card` / `--popover` · Hover: `--accent`
- Primary action: `--primary` (near-white on dark, near-black on light)
- Focus: `--ring` · Hairline: `--border`
- Headings: `font-heading` (Inter by default), tracking tight
- Example hero: 60px Inter 700, line-height 1, tracking -0.035em,
  white on the dark canvas; below it one `bg-primary` CTA and one ghost button.

## Similar brands

- **Vercel** — monochrome interface, typography-dominant hierarchy, white
  primary actions on dark.
- **Linear** — dark canvas as a design surface, compressed geometric display
  type.
- **Raycast** — dark UI, compact density, engineered feel.
