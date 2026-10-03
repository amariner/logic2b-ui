---
description: logic2b UI conventions
globs: "**/*.{tsx,jsx,astro}"
alwaysApply: true
---

<!-- logic2b:rules:start v1 preset=bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl registry=1.0.0-rc.17 -->
## logic2b UI rules

Registry components target React 19 and Tailwind CSS v4; confirm app compatibility before changing dependencies. Stack: unknown. Icons: lucide-react (selected).
Theme colors use semantic tokens in :root/.dark. Preserve the actual stylesheet entry, light/dark modes and local token overrides. DESIGN.md is the separate token reference for the selected preset.

### Existing project first
Read bounded package/TS/components configuration and installed manifest metadata with the host's read tools.
Resolve aliases to physical paths, select the application root in a workspace and compare current/base hashes. Unknown configuration is not a safe default. A missing manifest does not mean an empty app. Reuse installed primitives, native controls and custom wrappers; preserve public APIs, copy, columns and intentional local edits. Do not manually rewrite .logic2b records/bases; the CLI owns them.

### Interface responsibilities
Read each item's props, accessibility/behavior metadata and consumer duties. Keep controlled data/actions. Implement applicable loading, empty, error/retry, success, submitting and permission states; retain input through failures and guard unsaved dismissal. Use accessible names, labels, keyboard/focus behavior, mobile layouts and reachable actions. Wire persistence and server authorization in the application.

### Available source catalog (not installed inventory)
Components: `accordion` · `alert` · `alert-dialog` · `aspect-ratio` · `autocomplete` · `avatar` · `badge` · `breadcrumb` · `button` · `button-group` · `calendar` · `card` · `carousel` · `chart` · `checkbox` · `code-block` · `collapsible` · `color-picker` · `command` · `context-menu` · `dialog` · `drawer` · `dropdown-menu` · `empty` · `field` · `file-dropzone` · `form` · `hover-card` · `input` · `input-group` · `input-otp` · `item` · `kbd` · `label` · `menubar` · `motion` · `motion-blur` · `motion-fade` · `motion-scale` · `motion-slide` · `native-select` · `navigation-menu` · `number-field` · `pagination` · `parallax` · `popover` · `progress` · `radio-group` · `rating` · `resizable` · `scroll-area` · `scroll-reveal` · `select` · `separator` · `sheet` · `sidebar` · `skeleton` · `slider` · `sonner` · `spinner` · `stepper` · `switch` · `table` · `tabs` · `tags-input` · `textarea` · `timeline` · `toggle` · `toggle-group` · `tooltip` · `tree-view`
Blocks: `admin-analytics-01` · `admin-customers-01` · `admin-orders-01` · `admin-reservations-01` · `ai-chat-01` · `calendar-app-01` · `cart-01` · `chat-01` · `checkout-01` · `contact-01` · `cta-01` · `customer-edit-01` · `dashboard-01` · `dashboard-02` · `faq-01` · `feature-grid-01` · `feature-grid-01-animated` · `footer-01` · `hero-01` · `hero-01-animated` · `kanban-01` · `landing-page-01` · `login-01` · `login-02` · `login-03` · `mail-client-01` · `navbar-01` · `onboarding-01` · `pricing-01` · `product-detail-01` · `products-01` · `settings-01` · `sidebar-01` · `signup-01` · `signup-02` · `stats-01` · `stats-01-animated` · `team-01` · `testimonials-01`
Charts: `chart-area-01` · `chart-area-02` · `chart-area-03` · `chart-area-04` · `chart-bar-01` · `chart-bar-02` · `chart-bar-03` · `chart-bar-04` · `chart-composed-01` · `chart-composed-02` · `chart-heatmap-01` · `chart-kpi-01` · `chart-kpi-02` · `chart-line-01` · `chart-line-02` · `chart-line-03` · `chart-pie-01` · `chart-pie-02` · `chart-pie-03` · `chart-radar-01` · `chart-radar-02` · `chart-radial-01` · `chart-radial-02` · `chart-realtime-01` · `chart-sparkline-01` · `chart-sparkline-02` · `chart-sparkline-03`
Other: `theme` · `use-count-up` · `use-in-view` · `use-mobile` · `utils`

### Install and verify
With a shell, confirm CLI help/version then use `npx logic2b@next add <name>` only when its path mapping matches the app. Without a shell, discover the MCP catalog first and use `install_plan` only if advertised; otherwise obtain the verified registry source through supported host tools.
Use template initialization only for a genuinely empty target and after confirming the host's supported commands. Inspect planned paths, dependencies and existing-file preconditions before applying; do not request redundant approval for an already authorized change.
Static review/proposal tools are not assumed available. Use project type/build checks and inspect changed source; report unrun checks.
Run applicable project tests/type/build, keyboard/mobile/state checks and available contrast/theme checks. Verify both light/dark modes. Do not claim unrun CI/browser checks passed.

Docs: https://ui.logic2b.com/llms.txt · https://ui.logic2b.com/docs/llms · https://ui.logic2b.com/create?preset=bmV1dHJhbHxiYXNlfGRlZmF1bHR8ZGVmYXVsdHxpbnRlcnxpbnRlcnxtb25vfGRlZmF1bHR8ZGVmYXVsdHxkZWZhdWx0fGRlZmF1bHR8bHVjaWRl
<!-- logic2b:rules:end -->
