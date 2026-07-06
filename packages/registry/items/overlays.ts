import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "accordion",
    type: "registry:ui",
    description:
      "A vertically stacked set of interactive headings that each reveal a section of content, built on Radix Accordion. Use it for FAQs or collapsible content groups. Parts: Accordion (root, supports type 'single' or 'multiple'), AccordionItem, AccordionTrigger, AccordionContent.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/accordion.tsx", type: "registry:ui" }],
  },
  {
    name: "collapsible",
    type: "registry:ui",
    description:
      "An interactive component which expands and collapses a panel of content, built on Radix Collapsible. Use it for simple show/hide sections without the multi-item semantics of an accordion. Parts: Collapsible (root), CollapsibleTrigger, CollapsibleContent.",
    dependencies: ["radix-ui"],
    files: [{ path: "src/ui/collapsible.tsx", type: "registry:ui" }],
  },
  {
    name: "dialog",
    type: "registry:ui",
    description:
      "A window overlaid on the primary window, rendering content that requires the user's attention, built on Radix Dialog. Use it for modal forms or confirmations that block interaction with the page. Parts: Dialog (root), DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, DialogOverlay, DialogPortal.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/dialog.tsx", type: "registry:ui" }],
  },
  {
    name: "alert-dialog",
    type: "registry:ui",
    description:
      "A modal dialog that interrupts the user with important content and expects an explicit confirmation, built on Radix Alert Dialog. Use it for destructive actions (e.g. delete) that need a yes/no confirmation, unlike a regular Dialog it cannot be dismissed by clicking outside. Parts: AlertDialog (root), AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils", "button"],
    files: [{ path: "src/ui/alert-dialog.tsx", type: "registry:ui" }],
  },
  {
    name: "dropdown-menu",
    type: "registry:ui",
    description:
      "Displays a menu of actions or options triggered by a button, built on Radix Dropdown Menu. Use it for contextual action lists, with support for items, checkboxes, radio groups, submenus, labels, separators and shortcuts. Parts: DropdownMenu (root), DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/dropdown-menu.tsx", type: "registry:ui" }],
  },
  {
    name: "popover",
    type: "registry:ui",
    description:
      "Displays rich content in a portal, triggered by a button, built on Radix Popover. Use it for non-modal floating panels such as pickers or extra details that stay open until dismissed. Parts: Popover (root), PopoverTrigger, PopoverContent, PopoverAnchor.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/popover.tsx", type: "registry:ui" }],
  },
  {
    name: "tooltip",
    type: "registry:ui",
    description:
      "A popup that displays information related to an element when it receives keyboard focus or the mouse hovers over it, built on Radix Tooltip. Use it for short contextual hints on icons or truncated labels. Parts: TooltipProvider, Tooltip (root), TooltipTrigger, TooltipContent.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/tooltip.tsx", type: "registry:ui" }],
  },
  {
    name: "sheet",
    type: "registry:ui",
    description:
      "Extends the Dialog component to display content that complements the main content of the screen, sliding in from an edge, built on Radix Dialog. Use it for side panels, filters or mobile navigation drawers. Variant: side (top, bottom, left, right). Parts: Sheet (root), SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetClose.",
    dependencies: ["radix-ui", "class-variance-authority", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/sheet.tsx", type: "registry:ui" }],
  },
  {
    name: "tabs",
    type: "registry:ui",
    description:
      "A set of layered sections of content, only one of which is displayed at a time, built on Radix Tabs. Use it to switch between related views without navigation. Parts: Tabs (root), TabsList, TabsTrigger, TabsContent.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/tabs.tsx", type: "registry:ui" }],
  },
  {
    name: "hover-card",
    type: "registry:ui",
    description:
      "For sighted users to preview content available behind a link, shown after a short hover delay, built on Radix Hover Card. Use it for user profile previews or link previews, unlike Tooltip it supports rich interactive content. Parts: HoverCard (root), HoverCardTrigger, HoverCardContent.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/hover-card.tsx", type: "registry:ui" }],
  },
]
