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
]
