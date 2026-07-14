import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "login-01",
    type: "registry:block",
    description:
      "A simple, centered login form with email and password fields. Use as the starting point for an authentication page.",
    registryDependencies: ["button", "card", "input", "label"],
    files: [
      { path: "src/blocks/login-01/login-form.tsx", type: "registry:block" },
    ],
  },
  {
    name: "sidebar-01",
    type: "registry:block",
    description:
      "A simple sidebar with navigation links grouped by section. Use as the starting point for a dashboard's app-shell navigation.",
    dependencies: ["lucide-react"],
    registryDependencies: ["sidebar"],
    files: [
      {
        path: "src/blocks/sidebar-01/app-sidebar.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "login-02",
    type: "registry:block",
    description:
      "A two-column login page: form on one side, a decorative panel on the other. Use as an alternative, more spacious authentication page layout.",
    dependencies: ["lucide-react"],
    registryDependencies: ["button", "input", "label"],
    files: [
      { path: "src/blocks/login-02/login-form.tsx", type: "registry:block" },
    ],
  },
  {
    name: "signup-01",
    type: "registry:block",
    description:
      "A simple, centered signup form with name, email, password and confirm password fields. Use as the starting point for a registration page.",
    registryDependencies: ["button", "card", "input", "label"],
    files: [
      {
        path: "src/blocks/signup-01/signup-form.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "dashboard-01",
    type: "registry:block",
    description:
      "A dashboard with a sidebar, stat cards, an interactive area chart and a data table. Use as the starting point for an admin or analytics app-shell.",
    dependencies: ["recharts", "lucide-react"],
    registryDependencies: ["sidebar-01", "card", "badge", "chart", "table"],
    files: [
      {
        path: "src/blocks/dashboard-01/section-cards.tsx",
        type: "registry:block",
      },
      {
        path: "src/blocks/dashboard-01/chart-area-interactive.tsx",
        type: "registry:block",
      },
      {
        path: "src/blocks/dashboard-01/data-table.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "login-03",
    type: "registry:block",
    title: "Login with social",
    description:
      "A centered login card with GitHub and Google provider buttons, an 'or continue with' divider, and email/password fields. Use for an authentication page with social sign-in.",
    categories: ["authentication"],
    registryDependencies: ["button", "card", "input", "label"],
    files: [
      { path: "src/blocks/login-03/login-form.tsx", type: "registry:block" },
    ],
  },
  {
    name: "pricing-01",
    type: "registry:block",
    title: "Three-tier pricing",
    description:
      "A responsive three-tier pricing section with a featured plan, feature checklists and per-plan calls to action. Use on a marketing or upgrade page.",
    categories: ["marketing"],
    dependencies: ["lucide-react"],
    registryDependencies: ["badge", "button", "card"],
    files: [{ path: "src/blocks/pricing-01/pricing.tsx", type: "registry:block" }],
  },
  {
    name: "stats-01",
    type: "registry:block",
    title: "KPI stat cards",
    description:
      "A row of four KPI stat cards with values and trend deltas. Use as the header of a dashboard or analytics overview.",
    categories: ["dashboard"],
    dependencies: ["lucide-react"],
    registryDependencies: ["card"],
    files: [{ path: "src/blocks/stats-01/stats.tsx", type: "registry:block" }],
  },
  {
    name: "faq-01",
    type: "registry:block",
    title: "FAQ accordion",
    description:
      "A centered FAQ section built on the accordion, with a heading and a contact prompt. Use on a marketing, pricing or support page.",
    categories: ["marketing"],
    registryDependencies: ["accordion"],
    files: [{ path: "src/blocks/faq-01/faq.tsx", type: "registry:block" }],
  },
  {
    name: "cta-01",
    type: "registry:block",
    title: "Call to action",
    description:
      "A bordered, centered call-to-action band with a headline, supporting copy and two buttons. Use to close a landing page.",
    categories: ["marketing"],
    dependencies: ["lucide-react"],
    registryDependencies: ["button"],
    files: [{ path: "src/blocks/cta-01/cta.tsx", type: "registry:block" }],
  },
  {
    name: "contact-01",
    type: "registry:block",
    title: "Contact form",
    description:
      "A centered contact form card with name, email and message fields. Use as a standalone contact page or a section.",
    categories: ["marketing"],
    registryDependencies: ["button", "card", "input", "label", "textarea"],
    files: [
      { path: "src/blocks/contact-01/contact-form.tsx", type: "registry:block" },
    ],
  },
  {
    name: "hero-01",
    type: "registry:block",
    title: "Marketing hero",
    description:
      "A centered marketing hero with a badge, a large display headline, supporting copy and two calls to action. Use as the top of a landing page.",
    categories: ["marketing"],
    dependencies: ["lucide-react"],
    registryDependencies: ["badge", "button"],
    files: [{ path: "src/blocks/hero-01/hero.tsx", type: "registry:block" }],
  },
  {
    name: "testimonials-01",
    type: "registry:block",
    title: "Testimonials grid",
    description:
      "A grid of testimonial cards with quotes and avatars (initials fallback). Use as social proof on a marketing page.",
    categories: ["marketing"],
    registryDependencies: ["avatar", "card"],
    files: [
      {
        path: "src/blocks/testimonials-01/testimonials.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "settings-01",
    type: "registry:block",
    title: "Settings panel",
    description:
      "A settings card with profile fields, notification switches and save/cancel actions. Use as an account or preferences page.",
    categories: ["application"],
    registryDependencies: ["button", "card", "input", "label", "separator", "switch"],
    files: [
      { path: "src/blocks/settings-01/settings.tsx", type: "registry:block" },
    ],
  },
  {
    name: "signup-02",
    type: "registry:block",
    title: "Two-column signup",
    description:
      "A two-column signup page: decorative panel on one side, name/email/password form on the other. Use as a spacious registration page.",
    categories: ["authentication"],
    dependencies: ["lucide-react"],
    registryDependencies: ["button", "input", "label"],
    files: [
      { path: "src/blocks/signup-02/signup-form.tsx", type: "registry:block" },
    ],
  },
  {
    name: "navbar-01",
    type: "registry:block",
    title: "Marketing navbar",
    description:
      "A sticky top navigation bar with a logo, inline links, sign-in and CTA buttons, and a mobile menu button. Use as a marketing site header.",
    categories: ["marketing"],
    dependencies: ["lucide-react"],
    registryDependencies: ["button"],
    files: [{ path: "src/blocks/navbar-01/navbar.tsx", type: "registry:block" }],
  },
  {
    name: "feature-grid-01",
    type: "registry:block",
    title: "Feature grid",
    description:
      "A responsive grid of feature cards, each with an icon, title and description. Use to showcase product capabilities on a landing page.",
    categories: ["marketing"],
    dependencies: ["lucide-react"],
    registryDependencies: [],
    files: [
      {
        path: "src/blocks/feature-grid-01/feature-grid.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "footer-01",
    type: "registry:block",
    title: "Site footer",
    description:
      "A multi-column site footer with a brand blurb, link columns, a copyright line and social icons. Use as the bottom of a marketing site.",
    categories: ["marketing"],
    registryDependencies: [],
    files: [{ path: "src/blocks/footer-01/footer.tsx", type: "registry:block" }],
  },
  {
    name: "chat-01",
    type: "registry:block",
    title: "Chat",
    description:
      "A chat card with a contact header, a scrollable message thread with user/agent bubbles, and a working message input. Use for support chat or messaging UIs.",
    categories: ["application"],
    dependencies: ["lucide-react"],
    registryDependencies: ["avatar", "button", "card", "input"],
    files: [{ path: "src/blocks/chat-01/chat.tsx", type: "registry:block" }],
  },
  {
    name: "team-01",
    type: "registry:block",
    title: "Team members",
    description:
      "A team management card listing members with avatars and per-member role selects, plus an invite-by-email row. Use in settings or workspace admin pages.",
    categories: ["application"],
    registryDependencies: ["avatar", "button", "card", "input", "select", "separator"],
    files: [
      { path: "src/blocks/team-01/team-members.tsx", type: "registry:block" },
    ],
  },
  {
    name: "products-01",
    type: "registry:block",
    title: "Products table",
    description:
      "A products data table with live search, status badges, per-row action menus and responsive columns. Use for catalog, inventory or CRUD list pages.",
    categories: ["application"],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "badge",
      "button",
      "card",
      "dropdown-menu",
      "input",
      "table",
    ],
    files: [
      {
        path: "src/blocks/products-01/products-table.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "dashboard-02",
    type: "registry:block",
    title: "Analytics dashboard",
    description:
      "An analytics overview: a KPI stat row above a responsive grid that composes the interactive area chart, a stacked bar chart, a donut and a KPI ring. Use as an analytics landing page.",
    categories: ["dashboard"],
    dependencies: ["lucide-react", "recharts"],
    registryDependencies: [
      "card",
      "chart-area-04",
      "chart-bar-04",
      "chart-pie-03",
      "chart-radial-02",
    ],
    files: [
      {
        path: "src/blocks/dashboard-02/analytics-dashboard.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "onboarding-01",
    type: "registry:block",
    title: "Onboarding wizard",
    description:
      "A multi-step onboarding card with a numbered step indicator, a progress bar and per-step form fields, plus Back/Continue navigation. Use as a first-run setup flow.",
    categories: ["application"],
    dependencies: ["lucide-react"],
    registryDependencies: ["button", "card", "input", "label", "progress"],
    files: [
      {
        path: "src/blocks/onboarding-01/onboarding.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "hero-01-animated",
    type: "registry:block",
    title: "Marketing hero (animated)",
    description:
      "The animated twin of hero-01: the same centered marketing hero, revealed as a staggered fade-up on mount. Drop-in replacement — same Hero export. Built on the motion engine (tw-animate-css), respects prefers-reduced-motion.",
    categories: ["marketing"],
    dependencies: ["lucide-react"],
    registryDependencies: ["badge", "button", "motion"],
    files: [
      {
        path: "src/blocks/hero-01-animated/hero.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "stats-01-animated",
    type: "registry:block",
    title: "KPI stat cards (animated)",
    description:
      "The animated twin of stats-01: the KPI values count up on mount and the cards cascade in as a staggered fade-up. Drop-in replacement — same Stats export. Built on the motion engine and the useCountUp hook, respects prefers-reduced-motion.",
    categories: ["dashboard"],
    dependencies: ["lucide-react"],
    registryDependencies: ["card", "motion", "use-count-up"],
    files: [
      {
        path: "src/blocks/stats-01-animated/stats.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "feature-grid-01-animated",
    type: "registry:block",
    title: "Feature grid (animated)",
    description:
      "The animated twin of feature-grid-01: the heading reveals first, then the feature cards cascade in as a staggered fade-up on mount. Drop-in replacement — same FeatureGrid export. Built on the motion engine (tw-animate-css), respects prefers-reduced-motion.",
    categories: ["marketing"],
    dependencies: ["lucide-react"],
    registryDependencies: ["motion"],
    files: [
      {
        path: "src/blocks/feature-grid-01-animated/feature-grid.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "kanban-01",
    type: "registry:block",
    title: "Kanban board",
    description:
      "A three-column kanban board (to do / in progress / done) with cards you drag between columns, using native HTML5 drag-and-drop — no dependencies. Columns show a live count and highlight while a card is dragged over them. Use as the base for a task board or pipeline view.",
    categories: ["application"],
    registryDependencies: ["utils", "badge"],
    files: [{ path: "src/blocks/kanban-01/kanban.tsx", type: "registry:block" }],
  },
  {
    name: "cart-01",
    type: "registry:block",
    title: "Shopping cart",
    description:
      "An e-commerce cart: line items with a thumbnail, variant, per-line quantity stepper and remove action, plus an order summary card (subtotal, free-over-threshold shipping, total) and a checkout button. Totals recompute live. Use as the cart page of a storefront.",
    categories: ["ecommerce"],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "utils",
      "button",
      "card",
      "number-field",
      "separator",
    ],
    files: [{ path: "src/blocks/cart-01/cart.tsx", type: "registry:block" }],
  },
  {
    name: "checkout-01",
    type: "registry:block",
    title: "Checkout",
    description:
      "A two-column checkout: contact, shipping address and payment form fields on one side, an order summary (line items, subtotal, shipping, tax, total) with a Pay button on the other. Use as the checkout page of a storefront.",
    categories: ["ecommerce"],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "utils",
      "button",
      "card",
      "input",
      "label",
      "separator",
    ],
    files: [
      { path: "src/blocks/checkout-01/checkout.tsx", type: "registry:block" },
    ],
  },
  {
    name: "product-detail-01",
    type: "registry:block",
    title: "Product detail",
    description:
      "A product detail page: an image gallery with selectable thumbnails, title, rating, price and description, a size selector, a quantity stepper and an add-to-cart button whose total updates with quantity. Use as a storefront product page.",
    categories: ["ecommerce"],
    registryDependencies: [
      "utils",
      "badge",
      "button",
      "number-field",
      "rating",
      "separator",
    ],
    files: [
      {
        path: "src/blocks/product-detail-01/product-detail.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "admin-orders-01",
    type: "registry:block",
    title: "Orders admin dashboard",
    description:
      "An e-commerce back-office dashboard: a KPI row (revenue, orders, AOV, refunds with deltas) over an orders table with customer avatars, status badges, per-row actions, live search and status filter tabs. Use as the admin panel of a storefront.",
    categories: ["application"],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "utils",
      "avatar",
      "badge",
      "button",
      "card",
      "dropdown-menu",
      "input",
      "table",
      "tabs",
    ],
    files: [
      {
        path: "src/blocks/admin-orders-01/admin-orders.tsx",
        type: "registry:block",
      },
    ],
  },
  {
    name: "admin-reservations-01",
    type: "registry:block",
    title: "Reservations admin dashboard",
    description:
      "A reservations back-office dashboard: a KPI row (today's bookings, guests, occupancy, no-shows) over a bookings table with guest avatars, resource, time, party size, confirmed/held/cancelled status badges, per-row actions, live search and status filter tabs. Use as the admin panel of a booking system.",
    categories: ["application"],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "utils",
      "avatar",
      "badge",
      "button",
      "card",
      "dropdown-menu",
      "input",
      "table",
      "tabs",
    ],
    files: [
      {
        path: "src/blocks/admin-reservations-01/admin-reservations.tsx",
        type: "registry:block",
      },
    ],
  },
]
