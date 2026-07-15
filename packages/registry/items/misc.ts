import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "table",
    type: "registry:ui",
    categories: ["data-display"],
    description:
      "Displays tabular data in rows and columns. Use for lists of structured data with headers, body, footer and captions.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/table.tsx", type: "registry:ui" }],
  },
  {
    name: "breadcrumb",
    type: "registry:ui",
    categories: ["navigation"],
    description:
      "Displays the path to the current resource using a hierarchy of links. Use for navigation showing the user's location within a site.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/breadcrumb.tsx", type: "registry:ui" }],
  },
  {
    name: "pagination",
    type: "registry:ui",
    categories: ["navigation"],
    description:
      "Renders page navigation links for paginated content, such as tables or search results.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils", "button"],
    files: [{ path: "src/ui/pagination.tsx", type: "registry:ui" }],
  },
  {
    name: "scroll-area",
    type: "registry:ui",
    categories: ["layout"],
    description:
      "Augments native scroll functionality with custom, cross-browser styled scrollbars. Use to control overflow inside a fixed-size container.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/scroll-area.tsx", type: "registry:ui" }],
  },
  {
    name: "aspect-ratio",
    type: "registry:ui",
    categories: ["layout"],
    description:
      "Displays content, such as images or videos, within a fixed, desired ratio.",
    dependencies: ["radix-ui"],
    files: [{ path: "src/ui/aspect-ratio.tsx", type: "registry:ui" }],
  },
  {
    name: "command",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "A fast, composable command menu for building command palettes (cmd+k style search-and-run interfaces), built on cmdk.",
    dependencies: ["cmdk", "lucide-react"],
    registryDependencies: ["utils", "dialog"],
    files: [{ path: "src/ui/command.tsx", type: "registry:ui" }],
  },
  {
    name: "sonner",
    type: "registry:ui",
    categories: ["feedback"],
    description:
      "An opinionated toast notification component. Use to show brief, auto-dismissing messages to the user.",
    dependencies: ["sonner"],
    files: [{ path: "src/ui/sonner.tsx", type: "registry:ui" }],
  },
  {
    name: "sidebar",
    type: "registry:ui",
    categories: ["navigation"],
    description:
      "A composable, themeable app-shell sidebar with a provider (state, mobile sheet, cookie-persisted collapse, ⌘B shortcut), collapsible variants (offcanvas/icon/none) and menu primitives (group, menu, submenu, skeleton). Use as the base layout for dashboards.",
    dependencies: ["radix-ui", "lucide-react", "class-variance-authority"],
    registryDependencies: [
      "utils",
      "use-mobile",
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
    categories: ["data-display"],
    description:
      "Displays a keyboard shortcut or key combination, e.g. a ⌘K hint next to a menu item. Parts: Kbd, KbdGroup (wraps multiple keys with a separator-free gap).",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/kbd.tsx", type: "registry:ui" }],
  },
  {
    name: "spinner",
    type: "registry:ui",
    categories: ["feedback"],
    description:
      "A spinning loading indicator built on lucide-react's Loader2 icon. Use inline in buttons or standalone to signal a pending async operation.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/spinner.tsx", type: "registry:ui" }],
  },
  {
    name: "empty",
    type: "registry:ui",
    categories: ["feedback"],
    description:
      "Displays an empty state placeholder with an icon, title, description and actions. Use for empty lists, search results with no matches or first-run states. Parts: Empty (root), EmptyHeader, EmptyMedia (variant default | icon), EmptyTitle, EmptyDescription, EmptyContent.",
    dependencies: ["class-variance-authority"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/empty.tsx", type: "registry:ui" }],
  },
  {
    name: "calendar",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A date field with a calendar grid for picking a single day, multiple days or a date range, built on react-day-picker. Use it standalone or compose it with popover for a date-picker input.",
    dependencies: ["react-day-picker", "lucide-react"],
    registryDependencies: ["utils", "button"],
    files: [{ path: "src/ui/calendar.tsx", type: "registry:ui" }],
  },
  {
    name: "carousel",
    type: "registry:ui",
    categories: ["data-display"],
    description:
      "A carousel of slides with previous/next controls and keyboard navigation, built on embla-carousel-react. Use for image galleries, testimonial rotators or onboarding steps. Parts: Carousel (root, orientation), CarouselContent, CarouselItem, CarouselPrevious, CarouselNext.",
    dependencies: ["embla-carousel-react", "lucide-react"],
    registryDependencies: ["utils", "button"],
    files: [{ path: "src/ui/carousel.tsx", type: "registry:ui" }],
  },
  {
    name: "resizable",
    type: "registry:ui",
    categories: ["layout"],
    description:
      "Resizable split panels the user can drag to resize, horizontal or vertical, built on react-resizable-panels. Use for split views like a code editor's sidebar/pane layout. Parts: ResizablePanelGroup (root, direction), ResizablePanel, ResizableHandle (withHandle for a visible grip).",
    dependencies: ["react-resizable-panels", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/resizable.tsx", type: "registry:ui" }],
  },
  {
    name: "input-otp",
    type: "registry:ui",
    categories: ["form"],
    description:
      "An accessible one-time-password input with individual character slots and a fake caret, built on input-otp. Use for verification codes (SMS/email/2FA). Parts: InputOTP (root), InputOTPGroup, InputOTPSlot (index), InputOTPSeparator.",
    dependencies: ["input-otp", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/input-otp.tsx", type: "registry:ui" }],
  },
  {
    name: "tree-view",
    type: "registry:ui",
    categories: ["data-display"],
    description:
      "A hierarchical tree for browsing nested items (files, folders, categories) following the WAI-ARIA tree pattern: expand/collapse, single selection, roving focus and full keyboard navigation. Parts: TreeView (root, expanded/selected state), TreeItem (value, label, icon; nest items to make a branch).",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/tree-view.tsx", type: "registry:ui" }],
  },
  {
    name: "stepper",
    type: "registry:ui",
    categories: ["navigation"],
    description:
      "A multi-step progress indicator for wizards, checkouts and onboarding flows, horizontal or vertical. Steps derive completed/active/upcoming state from the root value; the active step carries aria-current. Parts: Stepper (root, value/orientation), StepperItem (step), StepperTrigger, StepperIndicator (number/check), StepperTitle, StepperDescription, StepperSeparator.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/stepper.tsx", type: "registry:ui" }],
  },
  {
    name: "timeline",
    type: "registry:ui",
    categories: ["data-display"],
    description:
      "A vertical timeline for activity feeds, changelogs and process histories. Composable: each TimelineItem holds a TimelineIndicator (dot + connector line, hidden on the last item) and a TimelineContent. Parts: Timeline (root ol), TimelineItem, TimelineIndicator, TimelineContent, TimelineTime, TimelineTitle, TimelineDescription.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/timeline.tsx", type: "registry:ui" }],
  },
  {
    name: "code-block",
    type: "registry:ui",
    categories: ["data-display"],
    title: "Code Block",
    description:
      "A styled code container with a one-click copy button. Dependency-free (no syntax highlighter): renders the code verbatim in a <pre> and copies it via the Clipboard API with a copied-state affordance. Optional language label in the header.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/code-block.tsx", type: "registry:ui" }],
  },
]
