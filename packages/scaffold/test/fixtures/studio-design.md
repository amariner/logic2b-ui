# Design Tokens — Style Reference
> generated with logic2b ui · preset `bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl`

**Theme:** light + dark (toggled with the `dark` class on `<html>`)
**Base:** Neutral · **Accent:** Base · **Radius:** 0.625rem
**Icons:** Lucide (`lucide-react`)

All colors are oklch CSS variables consumed through semantic utilities
(`bg-primary`, `text-muted-foreground`, `border-border`, …). Components
never hardcode colors — restyle everything by editing the tokens.

## Tokens — Semantic colors

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

## Tokens — Charts

| Token | Light | Dark |
|-------|-------|------|
| `--chart-1` | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` |
| `--chart-2` | `oklch(0.6 0.118 184.704)` | `oklch(0.696 0.17 162.48)` |
| `--chart-3` | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)` |
| `--chart-4` | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)` |
| `--chart-5` | `oklch(0.769 0.188 70.08)` | `oklch(0.645 0.246 16.439)` |

## Typography

- **Body (`--font-sans`):** 'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif
- **Headings (`--font-heading`):** 'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif

## Shape

- **`--radius`:** 0.625rem — every component derives its corner rounding
  (sm/md/lg/xl) from this single variable.

## Do

- Route every color through the semantic tokens above.
- Keep both modes first-class: check light and dark for every change.
- Use `--font-heading` for h1–h4 and `--font-sans` for body and UI text.

## Don't

- Don't hardcode hex/oklch values in components.
- Don't introduce accent colors beyond `--primary` and the chart ramp.
- Don't use heavy box-shadows for depth — prefer borders and surface steps.

## Install

```bash
npx logic2b@next init --preset bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl
```

Running `init` writes `components.json` and the CSS for these exact tokens
into your global stylesheet.
