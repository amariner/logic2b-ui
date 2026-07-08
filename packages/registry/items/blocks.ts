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
]
