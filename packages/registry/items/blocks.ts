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
]
