import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "table",
    type: "registry:ui",
    description:
      "Displays tabular data in rows and columns. Use for lists of structured data with headers, body, footer and captions.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/table.tsx", type: "registry:ui" }],
  },
  {
    name: "breadcrumb",
    type: "registry:ui",
    description:
      "Displays the path to the current resource using a hierarchy of links. Use for navigation showing the user's location within a site.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/breadcrumb.tsx", type: "registry:ui" }],
  },
  {
    name: "pagination",
    type: "registry:ui",
    description:
      "Renders page navigation links for paginated content, such as tables or search results.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils", "button"],
    files: [{ path: "src/ui/pagination.tsx", type: "registry:ui" }],
  },
  {
    name: "scroll-area",
    type: "registry:ui",
    description:
      "Augments native scroll functionality with custom, cross-browser styled scrollbars. Use to control overflow inside a fixed-size container.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/scroll-area.tsx", type: "registry:ui" }],
  },
  {
    name: "aspect-ratio",
    type: "registry:ui",
    description:
      "Displays content, such as images or videos, within a fixed, desired ratio.",
    dependencies: ["radix-ui"],
    files: [{ path: "src/ui/aspect-ratio.tsx", type: "registry:ui" }],
  },
  {
    name: "command",
    type: "registry:ui",
    description:
      "A fast, composable command menu for building command palettes (cmd+k style search-and-run interfaces), built on cmdk.",
    dependencies: ["cmdk", "lucide-react"],
    registryDependencies: ["utils", "dialog"],
    files: [{ path: "src/ui/command.tsx", type: "registry:ui" }],
  },
  {
    name: "sonner",
    type: "registry:ui",
    description:
      "An opinionated toast notification component. Use to show brief, auto-dismissing messages to the user.",
    dependencies: ["sonner"],
    files: [{ path: "src/ui/sonner.tsx", type: "registry:ui" }],
  },
  {
    name: "sidebar",
    type: "registry:ui",
    description:
      "A composable, themeable app-shell sidebar with a provider (state, mobile sheet, cookie-persisted collapse, ⌘B shortcut), collapsible variants (offcanvas/icon/none) and menu primitives (group, menu, submenu, skeleton). Use as the base layout for dashboards.",
    dependencies: ["radix-ui", "lucide-react", "class-variance-authority"],
    registryDependencies: [
      "utils",
      "button",
      "input",
      "separator",
      "sheet",
      "skeleton",
      "tooltip",
    ],
    files: [{ path: "src/ui/sidebar.tsx", type: "registry:ui" }],
  },
  {
    name: "kbd",
    type: "registry:ui",
    description:
      "Displays a keyboard shortcut or key combination, e.g. a ⌘K hint next to a menu item. Parts: Kbd, KbdGroup (wraps multiple keys with a separator-free gap).",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/kbd.tsx", type: "registry:ui" }],
  },
  {
    name: "spinner",
    type: "registry:ui",
    description:
      "A spinning loading indicator built on lucide-react's Loader2 icon. Use inline in buttons or standalone to signal a pending async operation.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/spinner.tsx", type: "registry:ui" }],
  },
  {
    name: "empty",
    type: "registry:ui",
    description:
      "Displays an empty state placeholder with an icon, title, description and actions. Use for empty lists, search results with no matches or first-run states. Parts: Empty (root), EmptyHeader, EmptyMedia (variant default | icon), EmptyTitle, EmptyDescription, EmptyContent.",
    dependencies: ["class-variance-authority"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/empty.tsx", type: "registry:ui" }],
  },
]
