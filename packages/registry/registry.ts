export type RegistryItemType = "registry:ui" | "registry:lib" | "registry:block" | "registry:chart"

export interface RegistryItem {
  name: string
  type: RegistryItemType
  description: string
  dependencies?: string[]
  registryDependencies?: string[]
  files: { path: string; type: RegistryItemType }[]
}

export const registry: RegistryItem[] = [
  {
    name: "utils",
    type: "registry:lib",
    description:
      "The cn() helper that merges Tailwind classes with clsx and tailwind-merge. Required by every component.",
    dependencies: ["clsx", "tailwind-merge"],
    files: [{ path: "src/lib/utils.ts", type: "registry:lib" }],
  },
  {
    name: "button",
    type: "registry:ui",
    description:
      "Displays a button or a component that looks like a button. Variants: default, destructive, outline, secondary, ghost, link. Sizes: default, sm, lg, icon.",
    dependencies: ["radix-ui", "class-variance-authority"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/button.tsx", type: "registry:ui" }],
  },
  {
    name: "card",
    type: "registry:ui",
    description:
      "Displays a card with header, title, description, action, content and footer sections.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/card.tsx", type: "registry:ui" }],
  },
  {
    name: "input",
    type: "registry:ui",
    description:
      "Displays a form input field. Supports all native input types, file inputs, invalid state styling.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/input.tsx", type: "registry:ui" }],
  },
  {
    name: "label",
    type: "registry:ui",
    description:
      "Renders an accessible label associated with form controls, built on Radix Label.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/label.tsx", type: "registry:ui" }],
  },
  {
    name: "badge",
    type: "registry:ui",
    description:
      "Displays a badge or a component that looks like a badge. Variants: default, secondary, destructive, outline.",
    dependencies: ["radix-ui", "class-variance-authority"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/badge.tsx", type: "registry:ui" }],
  },
  {
    name: "separator",
    type: "registry:ui",
    description:
      "Visually or semantically separates content, horizontal or vertical, built on Radix Separator.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/separator.tsx", type: "registry:ui" }],
  },
  {
    name: "avatar",
    type: "registry:ui",
    description:
      "An image element with a fallback for representing a user, built on Radix Avatar.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/avatar.tsx", type: "registry:ui" }],
  },
  {
    name: "skeleton",
    type: "registry:ui",
    description: "Use to show a placeholder while content is loading.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/skeleton.tsx", type: "registry:ui" }],
  },
  {
    name: "alert",
    type: "registry:ui",
    description:
      "Displays a callout for user attention with title and description. Variants: default, destructive.",
    dependencies: ["class-variance-authority"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/alert.tsx", type: "registry:ui" }],
  },
  {
    name: "textarea",
    type: "registry:ui",
    description:
      "Displays a form textarea that auto-sizes to its content (field-sizing).",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/textarea.tsx", type: "registry:ui" }],
  },
]
