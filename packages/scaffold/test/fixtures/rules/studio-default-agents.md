# AGENTS.md — UI house rules
> generated with logic2b ui · preset `bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl`

This project's interface is built on the logic2b ui design system
(https://ui.logic2b.com): a shadcn-compatible component registry restyled entirely
through CSS tokens. Follow these rules for any work that touches the UI.

## Read project context before writes

Read the app's `package.json`, `tsconfig.json` or `jsconfig.json` (including
local extends/references), `components.json` and `.logic2b/manifest.json` when
present. For a workspace, select the application root first. Treat configuration
as data; do not execute it or read environment files.

Confirm declared framework/React/Tailwind versions, import aliases and their
physical destinations, the stylesheet entry and icon library. Use the confirmed
`components.json` aliases for UI, components, hooks, lib and utils destinations.
Default `@/components` examples describe fresh scaffolds; they do not establish
this app's layout. Use the CLI only when its path mapping matches these confirmed
destinations; otherwise map registry payloads to the confirmed paths manually.

Inspect installed source and the manifest's item versions and file inventory;
compare retained `.logic2b/base/` snapshots before changing tracked files.
A missing manifest does not mean the app has no UI. Preserve custom wrappers,
native HTML controls, public APIs, local edits and unrelated styles/token overrides.
If aliases, versions, stylesheet paths or installed-file evidence are missing or
conflicting, record those unknowns and obtain the needed context before writes.


## Stack contract

- Registry components target React 19 + Tailwind CSS v4. Confirm compatibility
  with the app's declared versions before changing dependencies.
  Icons come from lucide-react.
- Find the theme through the confirmed stylesheet entry and imports.
  Its token blocks are `:root` (light) and
  `.dark` (dark). Dark mode toggles with the `dark` class on `<html>`.
- Code layout follows confirmed `components.json` aliases and physical paths.
  Fresh scaffolds commonly use `@/components/ui`, `@/components` and
  `@/lib/utils`; preserve an existing app's custom destinations.

## Reuse existing UI and registry components

Read the installed source before choosing an implementation. Reuse existing
components, wrappers and native controls when they meet the requirement. If a
compatible registry item is missing, install it at the confirmed destinations:

- CLI: `npx logic2b@next add <name>` (resolves registry dependencies).
- No shell? Use the MCP endpoint `https://ui.logic2b.com/mcp` — the `install_plan` tool
  returns the exact files to write and npm deps to add — or fetch the raw registry payload directly.

The following catalog lists available registry items, not this app's installed
inventory. Confirm installed items from the manifest and actual source.

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
- Requested re-theming can regenerate tokens from a preset
  (`npx logic2b@next init --preset bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl` or the MCP `apply_preset`
  tool). Confirm the target stylesheet and review the token diff first;
  preserve unrelated styles and local overrides outside the requested change.

## Component conventions

- One file per component; variants via `class-variance-authority` with the
  variants object exported (e.g. `buttonVariants`).
- Merge classes with `cn()`; every component root carries a `data-slot`
  attribute — use it for reliable selection in tests and styles.
- Extend by composition (wrap, pass `className`) instead of editing
  installed `ui/*` internals; if you must fork one, keep its public API.
- Preserve installed controlled forms and native HTML controls along with
  their behavior contracts. Use react-hook-form + zod through the `form`
  component when the application's form requirements need them.
- Charts use Recharts through the `chart` component so series colors bind
  to the `--chart-*` tokens.

## Customer journey behavior

The following blocks ship a `behavior` contract. Read it with the installed
source, preserve controlled inputs and local content customizations, and wire
the callbacks to the consuming application's data and authorization rules.
Only these blocks have this declared state coverage.

### `admin-customers-01`

Built-in states: `loading`, `empty`, `no-results`, `error`, `success`, `permission-denied`.
- Consumer state `submitting`: Compose customer-edit-01 and supply its submitting status while the application saves.
- Consumer state `validation-error`: Compose customer-edit-01 for field validation and server validation errors.
- Consumer state `unsaved`: The edit form guards Cancel unless onCancelRequest delegates it to the host; guard dialog dismissal/navigation too.
- Consumer state `offline`: The application detects connectivity and selects error/retry or its own offline explanation.
- Consumer state `partial`: The application owns pagination and partial-result disclosure; customers is the supplied collection.
- search (`query`, `onQueryChange`): Supply both props for a controlled query; otherwise local search is built in.
- create (`onAdd`, `canWrite`): Open and authorize a creation flow. No callback means the action is disabled.
- edit (`onEdit`, `canWrite`): Open the selected customer editor and persist successful changes to customers.
- retry (`onRetry`): Retry the data request and provide the resulting status; no request is made by the block.
- Supply customers and asynchronous request status; the default records are examples, not a backend.
- Authorize operations on the server and set canWrite/status from that outcome; disabled buttons are not an authorization boundary.
- Connect onAdd, onEdit and onRetry; update customers only after an application-confirmed save.
- Preserve local columns, content overrides and tokens when adapting or updating the copied source.

Copy lives in the exported content object; customize it through the content prop.
At narrow widths, retain customer identity, segment and edit action; secondary columns appear from sm/md. The application chooses which data to expose. Check keyboard operation, failure/retry,
preserved input and every applicable state at mobile and desktop sizes.

### `customer-edit-01`

Built-in states: `idle`, `loading`, `error`, `success`, `submitting`, `validation-error`, `permission-denied`, `unsaved`.
- Consumer state `offline`: The host detects connectivity and supplies error or another offline explanation; values stay controlled.
- change (`value`, `onChange`): Store the draft value and a baseline for dirty tracking; keep it through request failures.
- save (`onSubmit`, `status`, `validationErrors`): Set submitting synchronously, persist/authorize on the server, then provide success/error/permission-denied and updated field errors.
- cancel (`onCancel`, `onCancelRequest`, `initialValue`, `dirty`): Close/discard only after onCancel is called. If supplying onCancelRequest, own the dirty confirmation for every dismissal request, including Cancel; guard parent dialog dismissal and route navigation.
- Supply controlled value/onChange and an application-owned onSubmit; there is no backend or automatic persistence.
- Enforce permissions and authoritative validation on the server; client validation is basic name/email guidance.
- Set submitting before awaiting a request and keep the value on failures; do not show success before persistence confirms it.
- The built-in unsaved guard protects Cancel unless onCancelRequest delegates it to the host. The host must guard all dismissal requests, Escape/outside clicks/navigation, retain focus and prevent dismissal during submission.

Copy lives in the exported content object; customize it through the content prop.
Single-column labeled form with wrapping messages and reachable save/cancel/discard actions. Check keyboard operation, failure/retry,
preserved input and every applicable state at mobile and desktop sizes.


## Verify before finishing

1. TypeScript compiles and the app renders with zero console errors.
2. The change looks right in light **and** dark mode.
3. No raw palette classes or color literals slipped into changed files.

## Machine-readable registry

- Index: https://ui.logic2b.com/r/index.json · item payloads: https://ui.logic2b.com/r/<name>.json
- Docs for agents: https://ui.logic2b.com/llms.txt (full: https://ui.logic2b.com/llms-full.txt)
- MCP: `https://ui.logic2b.com/mcp` (remote, streamable HTTP) or `npx -y @logic2b/mcp@next` (stdio).
