# AGENTS.md — UI house rules
> generated with logic2b ui · preset `bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl`

This project's interface is built on the logic2b ui design system
(https://ui.logic2b.com): a shadcn-compatible component registry restyled entirely
through CSS tokens. Follow these rules for any work that touches the UI.

## Customer journey behavior

For installed blocks with a `behavior` contract, inspect its state matrix,
content paths, action callbacks and consumer responsibilities. Verify loading,
empty/no-results, failure/retry, submitting, validation, permission denial and
unsaved changes where applicable. Wire real data and persistence; preserve
custom copy, columns and tokens. Disabled controls never replace server
permissions. Check keyboard operation and mobile layout in the consuming app.
Only use tools that the current host actually exposes.

## Stack contract

- React 19 + Tailwind CSS v4 (CSS-first config — there is no
  `tailwind.config.js`). Icons come from lucide-react.
- The theme is the token blocks in `theme.css`: `:root` (light) and
  `.dark` (dark). Dark mode toggles with the `dark` class on `<html>`.
- Code layout: primitives in `@/components/ui`, installed blocks in
  `@/components`, charts in `@/components/charts`, the `cn()` class helper
  in `@/lib/utils`.

## Don't hand-roll what the registry ships

Before writing any UI element from scratch, install it:

- CLI: `npx logic2b@next add <name>` (resolves registry dependencies).
- No shell? Use the MCP endpoint `https://ui.logic2b.com/mcp` — the `install_plan` tool
  returns the exact files to write and npm deps to add — or fetch the raw registry payload directly.

Available primitives (71):
`button` · `card` · `input` · `label` · `badge` · `separator` · `item` · `avatar` · `skeleton` · `alert` · `textarea` · `accordion` · `collapsible` · `dialog` · `alert-dialog` · `dropdown-menu` · `popover` · `tooltip` · `sheet` · `tabs` · `hover-card` · `context-menu` · `menubar` · `navigation-menu` · `drawer` · `form` · `checkbox` · `radio-group` · `switch` · `select` · `native-select` · `slider` · `progress` · `toggle` · `toggle-group` · `button-group` · `input-group` · `field` · `tags-input` · `rating` · `number-field` · `autocomplete` · `file-dropzone` · `color-picker` · `table` · `breadcrumb` · `pagination` · `scroll-area` · `aspect-ratio` · `command` · `sonner` · `sidebar` · `kbd` · `spinner` · `empty` · `calendar` · `carousel` · `resizable` · `input-otp` · `tree-view` · `stepper` · `timeline` · `code-block` · `motion` · `motion-fade` · `motion-slide` · `motion-scale` · `motion-blur` · `scroll-reveal` · `parallax` · `chart`

Blocks (39):
`login-01` · `sidebar-01` · `login-02` · `signup-01` · `dashboard-01` · `login-03` · `pricing-01` · `stats-01` · `faq-01` · `cta-01` · `contact-01` · `hero-01` · `testimonials-01` · `settings-01` · `signup-02` · `navbar-01` · `feature-grid-01` · `footer-01` · `landing-page-01` · `chat-01` · `ai-chat-01` · `mail-client-01` · `calendar-app-01` · `team-01` · `products-01` · `dashboard-02` · `onboarding-01` · `hero-01-animated` · `stats-01-animated` · `feature-grid-01-animated` · `kanban-01` · `cart-01` · `checkout-01` · `product-detail-01` · `admin-orders-01` · `admin-reservations-01` · `admin-analytics-01` · `admin-customers-01` · `customer-edit-01`

Charts (27):
`chart-area-01` · `chart-area-02` · `chart-bar-01` · `chart-bar-02` · `chart-line-01` · `chart-line-02` · `chart-pie-01` · `chart-pie-02` · `chart-radar-01` · `chart-radial-01` · `chart-area-03` · `chart-bar-03` · `chart-bar-04` · `chart-line-03` · `chart-pie-03` · `chart-radar-02` · `chart-radial-02` · `chart-sparkline-01` · `chart-sparkline-02` · `chart-sparkline-03` · `chart-kpi-01` · `chart-kpi-02` · `chart-composed-01` · `chart-composed-02` · `chart-heatmap-01` · `chart-area-04` · `chart-realtime-01`

Also install rather than reimplement: new UI libraries (MUI, Chakra, Ant,
DaisyUI…) are off-limits — they fight the token system.

## Theme rules

- Colors go through semantic utilities only: `bg-primary`,
  `text-muted-foreground`, `border-border`, `bg-card`… Never raw palette
  classes (`bg-blue-500`), never hex/oklch literals in components.
- The accent is `--primary`. Beyond it, color belongs only to the chart
  ramp (`--chart-1`…`--chart-5`) and the destructive state.
- Radius derives from `--radius` (currently 0.625rem) via `rounded-sm` to
  `rounded-xl` — don't invent arbitrary radii.
- Type: `--font-sans` (Inter Variable) for body and UI,
  `--font-heading` (Inter Variable) for h1–h4.
- Depth comes from borders and surface steps (`bg-card`, `bg-muted`), not
  box-shadows.
- Every change must hold in **both modes** — check light and dark.
- Re-theming happens by regenerating tokens from a preset
  (`npx logic2b@next init --preset bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl` or the MCP `apply_preset`
  tool), not by hand-editing individual token values.

## Component conventions

- One file per component; variants via `class-variance-authority` with the
  variants object exported (e.g. `buttonVariants`).
- Merge classes with `cn()`; every component root carries a `data-slot`
  attribute — use it for reliable selection in tests and styles.
- Extend by composition (wrap, pass `className`) instead of editing
  installed `ui/*` internals; if you must fork one, keep its public API.
- Forms use react-hook-form + zod through the `form` component. Charts use
  Recharts through the `chart` component so series colors bind to the
  `--chart-*` tokens.

## Verify before finishing

1. TypeScript compiles and the app renders with zero console errors.
2. The change looks right in light **and** dark mode.
3. No raw palette classes or color literals slipped into changed files.

## Machine-readable registry

- Index: https://ui.logic2b.com/r/index.json · item payloads: https://ui.logic2b.com/r/<name>.json
- Docs for agents: https://ui.logic2b.com/llms.txt (full: https://ui.logic2b.com/llms-full.txt)
- MCP: `https://ui.logic2b.com/mcp` (remote, streamable HTTP) or `npx -y @logic2b/mcp@next` (stdio).
