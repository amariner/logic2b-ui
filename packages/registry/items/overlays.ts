import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "accordion",
    type: "registry:ui",
    categories: ["data-display"],
    description:
      "A vertically stacked set of interactive headings that each reveal a section of content, built on Radix Accordion. Use it for FAQs or collapsible content groups. Parts: Accordion (root, supports type 'single' or 'multiple'), AccordionItem, AccordionTrigger, AccordionContent.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/accordion.tsx", type: "registry:ui" }],
  },
  {
    name: "collapsible",
    type: "registry:ui",
    categories: ["data-display"],
    description:
      "An interactive component which expands and collapses a panel of content, built on Radix Collapsible. Use it for simple show/hide sections without the multi-item semantics of an accordion. Parts: Collapsible (root), CollapsibleTrigger, CollapsibleContent.",
    dependencies: ["radix-ui"],
    files: [{ path: "src/ui/collapsible.tsx", type: "registry:ui" }],
  },
  {
    name: "dialog",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "A window overlaid on the primary window, rendering content that requires the user's attention, built on Radix Dialog. Use it for modal forms or confirmations that block interaction with the page. Parts: Dialog (root), DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, DialogOverlay, DialogPortal.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/dialog.tsx", type: "registry:ui" }],
  },
  {
    name: "alert-dialog",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "A modal dialog that interrupts the user with important content and expects an explicit confirmation, built on Radix Alert Dialog. Use it for destructive actions (e.g. delete) that need a yes/no confirmation, unlike a regular Dialog it cannot be dismissed by clicking outside. Parts: AlertDialog (root), AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils", "button"],
    files: [{ path: "src/ui/alert-dialog.tsx", type: "registry:ui" }],
  },
  {
    name: "dropdown-menu",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "Displays a menu of actions or options triggered by a button, built on Radix Dropdown Menu. Use it for contextual action lists, with support for items, checkboxes, radio groups, submenus, labels, separators and shortcuts. Parts: DropdownMenu (root), DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/dropdown-menu.tsx", type: "registry:ui" }],
  },
  {
    name: "popover",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "Displays rich content in a portal, triggered by a button, built on Radix Popover. Use it for non-modal floating panels such as pickers or extra details that stay open until dismissed. Parts: Popover (root), PopoverTrigger, PopoverContent, PopoverAnchor.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/popover.tsx", type: "registry:ui" }],
  },
  {
    name: "tooltip",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "A popup that displays information related to an element when it receives keyboard focus or the mouse hovers over it, built on Radix Tooltip. Use it for short contextual hints on icons or truncated labels. Parts: TooltipProvider, Tooltip (root), TooltipTrigger, TooltipContent.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/tooltip.tsx", type: "registry:ui" }],
  },
  {
    name: "sheet",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "Extends the Dialog component to display content that complements the main content of the screen, sliding in from an edge, built on Radix Dialog. Use it for side panels, filters or mobile navigation drawers. Variant: side (top, bottom, left, right). Parts: Sheet (root), SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetClose.",
    dependencies: ["radix-ui", "class-variance-authority", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/sheet.tsx", type: "registry:ui" }],
  },
  {
    name: "tabs",
    type: "registry:ui",
    categories: ["navigation"],
    description:
      "A set of layered sections of content, only one of which is displayed at a time, built on Radix Tabs. Use it to switch between related views without navigation. Parts: Tabs (root), TabsList, TabsTrigger, TabsContent.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/tabs.tsx", type: "registry:ui" }],
  },
  {
    name: "hover-card",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "For sighted users to preview content available behind a link, shown after a short hover delay, built on Radix Hover Card. Use it for user profile previews or link previews, unlike Tooltip it supports rich interactive content. Parts: HoverCard (root), HoverCardTrigger, HoverCardContent.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/hover-card.tsx", type: "registry:ui" }],
  },
  {
    name: "context-menu",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "Displays a menu of actions or options triggered by right-clicking an element, built on Radix Context Menu. Use it for contextual actions on a table row, card or canvas item. Parts: ContextMenu (root), ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuPortal.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/context-menu.tsx", type: "registry:ui" }],
  },
  {
    name: "menubar",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "A horizontal bar of menus, like a desktop application's menu bar, built on Radix Menubar. Use for app-shell top-level command menus (File, Edit, View...). Parts: Menubar (root), MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarLabel, MenubarSeparator, MenubarShortcut, MenubarGroup, MenubarSub, MenubarSubTrigger, MenubarSubContent, MenubarPortal.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/menubar.tsx", type: "registry:ui" }],
  },
  {
    name: "navigation-menu",
    type: "registry:ui",
    categories: ["navigation"],
    description:
      "A collection of links and dropdown panels for site or app navigation, built on Radix Navigation Menu. Use for a primary site nav with dropdown mega-menus, unlike menubar it's meant for navigation links, not commands. Parts: NavigationMenu (root, viewport), NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink, NavigationMenuIndicator, NavigationMenuViewport, navigationMenuTriggerStyle (cva for plain link items).",
    dependencies: ["radix-ui", "class-variance-authority", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/navigation-menu.tsx", type: "registry:ui" }],
  },
  {
    name: "drawer",
    type: "registry:ui",
    categories: ["overlays"],
    description:
      "Extends the Dialog component to display content sliding in from an edge with a drag handle, built on vaul. Use for mobile-friendly bottom sheets, unlike sheet it supports drag-to-dismiss. Parts: Drawer (root, direction top | bottom | left | right), DrawerTrigger, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription, DrawerClose, DrawerOverlay, DrawerPortal.",
    dependencies: ["vaul"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/drawer.tsx", type: "registry:ui" }],
  },
]
