export type PlaygroundValue =
  | string
  | number
  | boolean
  | null
  | PlaygroundDateValue
  | readonly PlaygroundValue[]
  | { readonly [key: string]: PlaygroundValue }

export interface PlaygroundDateValue {
  readonly $type: "date"
  readonly value: string
}

export interface PlaygroundNode {
  exportName?: string
  element?: "a" | "button" | "div" | "input" | "label" | "li" | "ol" | "p" | "span" | "ul"
  module?: "registry" | "recharts"
  props?: Readonly<Record<string, PlaygroundValue>>
  bindings?: Readonly<Record<string, string>>
  action?: {
    event: "onClick"
    type: "toast"
    message: string
  }
  children?: string | readonly PlaygroundNode[]
}

export type PlaygroundControl =
  | {
      prop: string
      label: string
      kind: "text" | "code"
      maxLength?: number
    }
  | {
      prop: string
      label: string
      kind: "boolean"
    }
  | {
      prop: string
      label: string
      kind: "number"
      min?: number
      max?: number
      step?: number
      array?: boolean
    }
  | {
      prop: string
      label: string
      kind: "select"
      options: readonly { value: string; label: string }[]
    }

export interface PlaygroundRecipe {
  name: string
  exportName: string
  adapter?: "form"
  rootElement?: "div"
  initialProps: Readonly<Record<string, PlaygroundValue>>
  controls: readonly PlaygroundControl[]
  children?: string
  options?: readonly { value: string; label: string }[]
  rootProps?: readonly string[]
  composition?: readonly PlaygroundNode[]
  previewClassName?: string
}

const variants = (...values: string[]) =>
  values.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }))

const playgroundDate = (value: string): PlaygroundDateValue => ({
  $type: "date",
  value,
})

export const PLAYGROUND_RECIPES = {
  accordion: {
    name: "accordion",
    exportName: "Accordion",
    initialProps: { type: "single", defaultValue: "item-1", collapsible: true },
    controls: [
      { prop: "defaultValue", label: "Open item", kind: "select", options: variants("item-1", "item-2") },
      { prop: "collapsible", label: "Collapsible", kind: "boolean" },
    ],
    rootProps: ["type", "defaultValue", "collapsible"],
    composition: [
      {
        exportName: "AccordionItem",
        props: { value: "item-1" },
        children: [
          { exportName: "AccordionTrigger", children: "What is logic2b ui?" },
          { exportName: "AccordionContent", children: "A registry built for people and coding agents." },
        ],
      },
      {
        exportName: "AccordionItem",
        props: { value: "item-2" },
        children: [
          { exportName: "AccordionTrigger", children: "Can I own the source?" },
          { exportName: "AccordionContent", children: "Yes. Components are copied into your application." },
        ],
      },
    ],
    previewClassName: "w-full max-w-lg",
  },
  button: {
    name: "button",
    exportName: "Button",
    initialProps: { variant: "default", size: "default", disabled: false },
    controls: [
      { prop: "variant", label: "Variant", kind: "select", options: variants("default", "secondary", "destructive", "outline", "ghost", "link") },
      { prop: "size", label: "Size", kind: "select", options: variants("default", "sm", "lg", "icon") },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    children: "Continue",
  },
  badge: {
    name: "badge",
    exportName: "Badge",
    initialProps: { variant: "default" },
    controls: [
      { prop: "variant", label: "Variant", kind: "select", options: variants("default", "secondary", "destructive", "outline") },
    ],
    children: "Status",
  },
  avatar: {
    name: "avatar",
    exportName: "Avatar",
    initialProps: { className: "size-12" },
    controls: [
      {
        prop: "className",
        label: "Size",
        kind: "select",
        options: [
          { value: "size-8", label: "Small" },
          { value: "size-12", label: "Medium" },
          { value: "size-16", label: "Large" },
        ],
      },
    ],
    composition: [
      { exportName: "AvatarFallback", children: "AM" },
    ],
  },
  breadcrumb: {
    name: "breadcrumb",
    exportName: "Breadcrumb",
    initialProps: { "aria-label": "Project breadcrumb" },
    controls: [
      { prop: "aria-label", label: "Accessible label", kind: "text", maxLength: 80 },
    ],
    composition: [
      {
        exportName: "BreadcrumbList",
        children: [
          {
            exportName: "BreadcrumbItem",
            children: [
              { exportName: "BreadcrumbLink", props: { href: "#" }, children: "Projects" },
            ],
          },
          { exportName: "BreadcrumbSeparator" },
          {
            exportName: "BreadcrumbItem",
            children: [
              { exportName: "BreadcrumbLink", props: { href: "#" }, children: "logic2b" },
            ],
          },
          { exportName: "BreadcrumbSeparator" },
          {
            exportName: "BreadcrumbItem",
            children: [
              { exportName: "BreadcrumbPage", children: "Components" },
            ],
          },
        ],
      },
    ],
  },
  alert: {
    name: "alert",
    exportName: "Alert",
    initialProps: { variant: "default", className: "grid-cols-1" },
    controls: [
      { prop: "variant", label: "Variant", kind: "select", options: variants("default", "destructive") },
    ],
    children: "Your changes have been saved.",
    previewClassName: "w-full max-w-md",
  },
  "aspect-ratio": {
    name: "aspect-ratio",
    exportName: "AspectRatio",
    initialProps: {
      ratio: 1.7778,
      className: "flex items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground",
    },
    controls: [
      { prop: "ratio", label: "Ratio", kind: "number", min: 0.5, max: 3, step: 0.1 },
    ],
    children: "Responsive media",
    previewClassName: "w-full max-w-md",
  },
  card: {
    name: "card",
    exportName: "Card",
    initialProps: { className: "w-full max-w-sm px-6" },
    controls: [
      {
        prop: "className",
        label: "Width",
        kind: "select",
        options: [
          { value: "w-full max-w-xs px-6", label: "Extra small" },
          { value: "w-full max-w-sm px-6", label: "Small" },
          { value: "w-full max-w-md px-6", label: "Medium" },
        ],
      },
    ],
    composition: [
      {
        exportName: "CardHeader",
        children: [
          { exportName: "CardTitle", children: "Project health" },
          { exportName: "CardDescription", children: "All quality gates are passing." },
        ],
      },
      {
        exportName: "CardContent",
        children: [
          { element: "p", props: { className: "text-sm" }, children: "The registry and documentation are synchronized." },
        ],
      },
      {
        exportName: "CardFooter",
        children: [
          { element: "button", props: { type: "button", className: "rounded-md border px-3 py-2 text-sm font-medium" }, children: "View report" },
        ],
      },
    ],
    previewClassName: "flex w-full justify-center",
  },
  checkbox: {
    name: "checkbox",
    exportName: "Checkbox",
    initialProps: { defaultChecked: true, disabled: false, "aria-label": "Accept terms" },
    controls: [
      { prop: "defaultChecked", label: "Checked", kind: "boolean" },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
  },
  collapsible: {
    name: "collapsible",
    exportName: "Collapsible",
    initialProps: { defaultOpen: true, disabled: false },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    composition: [
      {
        exportName: "CollapsibleTrigger",
        props: { className: "w-full rounded-md border px-4 py-2 text-left text-sm font-medium" },
        children: "Repository details",
      },
      {
        exportName: "CollapsibleContent",
        props: { className: "mt-2 rounded-md bg-muted p-4 text-sm text-muted-foreground" },
        children: "React 19 · Tailwind v4 · Cloudflare Workers",
      },
    ],
    previewClassName: "w-full max-w-md",
  },
  empty: {
    name: "empty",
    exportName: "Empty",
    initialProps: { className: "w-full max-w-md border" },
    controls: [
      {
        prop: "className",
        label: "Surface",
        kind: "select",
        options: [
          { value: "w-full max-w-md border", label: "Solid border" },
          { value: "w-full max-w-md border border-dashed", label: "Dashed border" },
          { value: "w-full max-w-md bg-muted/50", label: "Muted" },
        ],
      },
    ],
    composition: [
      {
        exportName: "EmptyHeader",
        children: [
          { exportName: "EmptyTitle", children: "No components selected" },
          { exportName: "EmptyDescription", children: "Choose a component to add it to your installation plan." },
        ],
      },
      {
        exportName: "EmptyContent",
        children: [
          { element: "button", props: { type: "button", className: "rounded-md border px-3 py-2 font-medium" }, children: "Browse components" },
        ],
      },
    ],
    previewClassName: "flex w-full justify-center",
  },
  field: {
    name: "field",
    exportName: "FieldGroup",
    initialProps: { orientation: "vertical" },
    controls: [
      { prop: "orientation", label: "Orientation", kind: "select", options: variants("vertical", "horizontal", "responsive") },
    ],
    rootProps: [],
    composition: [
      {
        exportName: "Field",
        bindings: { orientation: "orientation" },
        children: [
          { exportName: "FieldLabel", props: { htmlFor: "playground-email" }, children: "Email" },
          { element: "input", props: { id: "playground-email", type: "email", defaultValue: "team@logic2b.com", className: "h-9 rounded-md border bg-background px-3 text-sm" } },
          { exportName: "FieldDescription", children: "Used for release notifications." },
        ],
      },
    ],
    previewClassName: "w-full max-w-md",
  },
  input: {
    name: "input",
    exportName: "Input",
    initialProps: { type: "email", placeholder: "you@example.com", disabled: false, "aria-label": "Email address" },
    controls: [
      { prop: "type", label: "Type", kind: "select", options: variants("text", "email", "password", "search") },
      { prop: "placeholder", label: "Placeholder", kind: "text", maxLength: 80 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    previewClassName: "w-full max-w-sm",
  },
  "input-group": {
    name: "input-group",
    exportName: "InputGroup",
    initialProps: { placeholder: "Monthly budget", disabled: false, "aria-label": "Budget amount" },
    controls: [
      { prop: "placeholder", label: "Placeholder", kind: "text", maxLength: 80 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    rootProps: ["aria-label"],
    composition: [
      {
        exportName: "InputGroupAddon",
        children: [
          { exportName: "InputGroupText", children: "€" },
        ],
      },
      {
        exportName: "InputGroupInput",
        props: { type: "text", defaultValue: "2,400", "aria-label": "Amount" },
        bindings: { placeholder: "placeholder", disabled: "disabled" },
      },
      {
        exportName: "InputGroupAddon",
        props: { align: "inline-end" },
        children: [
          { exportName: "InputGroupText", children: "EUR" },
        ],
      },
    ],
    previewClassName: "w-full max-w-md",
  },
  "input-otp": {
    name: "input-otp",
    exportName: "InputOTP",
    initialProps: { maxLength: 6, defaultValue: "248135", disabled: false, "aria-label": "Verification code" },
    controls: [
      { prop: "defaultValue", label: "Code", kind: "text", maxLength: 6 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    rootProps: ["maxLength", "defaultValue", "disabled", "aria-label"],
    composition: [
      {
        exportName: "InputOTPGroup",
        children: [
          { exportName: "InputOTPSlot", props: { index: 0 } },
          { exportName: "InputOTPSlot", props: { index: 1 } },
          { exportName: "InputOTPSlot", props: { index: 2 } },
        ],
      },
      { exportName: "InputOTPSeparator" },
      {
        exportName: "InputOTPGroup",
        children: [
          { exportName: "InputOTPSlot", props: { index: 3 } },
          { exportName: "InputOTPSlot", props: { index: 4 } },
          { exportName: "InputOTPSlot", props: { index: 5 } },
        ],
      },
    ],
  },
  item: {
    name: "item",
    exportName: "Item",
    initialProps: { variant: "outline", size: "default" },
    controls: [
      { prop: "variant", label: "Variant", kind: "select", options: variants("default", "outline", "muted") },
      { prop: "size", label: "Size", kind: "select", options: variants("default", "sm") },
    ],
    composition: [
      {
        exportName: "ItemContent",
        children: [
          { exportName: "ItemTitle", children: "Registry release" },
          { exportName: "ItemDescription", children: "Versioned source and accessibility metadata are ready." },
        ],
      },
      {
        exportName: "ItemActions",
        children: [
          { element: "span", props: { className: "rounded-full bg-muted px-2 py-1 text-xs" }, children: "Ready" },
        ],
      },
    ],
    previewClassName: "w-full max-w-lg",
  },
  kbd: {
    name: "kbd",
    exportName: "KbdGroup",
    initialProps: { className: "gap-1" },
    controls: [
      {
        prop: "className",
        label: "Spacing",
        kind: "select",
        options: [
          { value: "gap-1", label: "Compact" },
          { value: "gap-2", label: "Comfortable" },
          { value: "gap-3", label: "Wide" },
        ],
      },
    ],
    composition: [
      { exportName: "Kbd", children: "⌘" },
      { element: "span", props: { className: "text-xs text-muted-foreground" }, children: "+" },
      { exportName: "Kbd", children: "K" },
    ],
  },
  label: {
    name: "label",
    exportName: "Label",
    initialProps: { htmlFor: "workspace-name" },
    controls: [
      { prop: "htmlFor", label: "Target id", kind: "text", maxLength: 48 },
    ],
    composition: [
      { element: "span", children: "Workspace" },
      {
        element: "input",
        props: { type: "text", defaultValue: "logic2b", className: "h-9 rounded-md border bg-background px-3 text-sm" },
        bindings: { id: "htmlFor" },
      },
    ],
  },
  table: {
    name: "table",
    exportName: "Table",
    initialProps: { className: "table-auto" },
    controls: [
      { prop: "className", label: "Layout", kind: "select", options: variants("table-auto", "table-fixed") },
    ],
    composition: [
      {
        exportName: "TableHeader",
        children: [
          {
            exportName: "TableRow",
            children: [
              { exportName: "TableHead", children: "Package" },
              { exportName: "TableHead", children: "Status" },
              { exportName: "TableHead", props: { className: "text-right" }, children: "Tests" },
            ],
          },
        ],
      },
      {
        exportName: "TableBody",
        children: [
          {
            exportName: "TableRow",
            children: [
              { exportName: "TableCell", children: "registry" },
              { exportName: "TableCell", children: "Passing" },
              { exportName: "TableCell", props: { className: "text-right" }, children: "136" },
            ],
          },
          {
            exportName: "TableRow",
            children: [
              { exportName: "TableCell", children: "web" },
              { exportName: "TableCell", children: "Passing" },
              { exportName: "TableCell", props: { className: "text-right" }, children: "648" },
            ],
          },
        ],
      },
      { exportName: "TableCaption", children: "Current quality-gate status." },
    ],
    previewClassName: "w-full max-w-lg",
  },
  tabs: {
    name: "tabs",
    exportName: "Tabs",
    initialProps: { defaultValue: "overview", orientation: "horizontal" },
    controls: [
      { prop: "defaultValue", label: "Active tab", kind: "select", options: variants("overview", "activity") },
      { prop: "orientation", label: "Orientation", kind: "select", options: variants("horizontal", "vertical") },
    ],
    composition: [
      {
        exportName: "TabsList",
        children: [
          { exportName: "TabsTrigger", props: { value: "overview" }, children: "Overview" },
          { exportName: "TabsTrigger", props: { value: "activity" }, children: "Activity" },
        ],
      },
      {
        exportName: "TabsContent",
        props: { value: "overview", className: "rounded-md border p-4 text-sm" },
        children: "68 components now have live playgrounds.",
      },
      {
        exportName: "TabsContent",
        props: { value: "activity", className: "rounded-md border p-4 text-sm" },
        children: "The latest quality gates are green.",
      },
    ],
    previewClassName: "w-full max-w-lg",
  },
  textarea: {
    name: "textarea",
    exportName: "Textarea",
    initialProps: { placeholder: "Write a message…", rows: 4, disabled: false, "aria-label": "Message" },
    controls: [
      { prop: "placeholder", label: "Placeholder", kind: "text", maxLength: 120 },
      { prop: "rows", label: "Rows", kind: "number", min: 2, max: 10, step: 1 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    previewClassName: "w-full max-w-sm",
  },
  progress: {
    name: "progress",
    exportName: "Progress",
    initialProps: { value: 64, "aria-label": "Upload progress" },
    controls: [
      { prop: "value", label: "Value", kind: "number", min: 0, max: 100, step: 1 },
    ],
    previewClassName: "w-full max-w-sm",
  },
  pagination: {
    name: "pagination",
    exportName: "Pagination",
    initialProps: { className: "justify-center" },
    controls: [
      {
        prop: "className",
        label: "Alignment",
        kind: "select",
        options: [
          { value: "justify-start", label: "Start" },
          { value: "justify-center", label: "Center" },
          { value: "justify-end", label: "End" },
        ],
      },
    ],
    composition: [
      {
        exportName: "PaginationContent",
        children: [
          { exportName: "PaginationItem", children: [{ exportName: "PaginationPrevious", props: { href: "#" } }] },
          { exportName: "PaginationItem", children: [{ exportName: "PaginationLink", props: { href: "#" }, children: "1" }] },
          { exportName: "PaginationItem", children: [{ exportName: "PaginationLink", props: { href: "#", isActive: true }, children: "2" }] },
          { exportName: "PaginationItem", children: [{ exportName: "PaginationLink", props: { href: "#" }, children: "3" }] },
          { exportName: "PaginationItem", children: [{ exportName: "PaginationNext", props: { href: "#" } }] },
        ],
      },
    ],
    previewClassName: "w-full",
  },
  parallax: {
    name: "parallax",
    exportName: "Parallax",
    initialProps: { range: "12%", className: "h-48 w-full max-w-lg rounded-xl border" },
    controls: [
      { prop: "range", label: "Range", kind: "text", maxLength: 16 },
    ],
    composition: [
      {
        element: "div",
        props: { className: "flex h-full min-h-64 items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-primary/5 text-sm font-medium" },
        children: "Scroll-linked layer",
      },
    ],
    previewClassName: "flex w-full justify-center",
  },
  switch: {
    name: "switch",
    exportName: "Switch",
    initialProps: { defaultChecked: true, disabled: false, "aria-label": "Enable notifications" },
    controls: [
      { prop: "defaultChecked", label: "Checked", kind: "boolean" },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
  },
  slider: {
    name: "slider",
    exportName: "Slider",
    initialProps: { defaultValue: [40], min: 0, max: 100, disabled: false, "aria-label": "Volume" },
    controls: [
      { prop: "defaultValue", label: "Value", kind: "number", min: 0, max: 100, step: 1, array: true },
      { prop: "min", label: "Minimum", kind: "number", min: -100, max: 100, step: 1 },
      { prop: "max", label: "Maximum", kind: "number", min: 1, max: 500, step: 1 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    previewClassName: "w-full max-w-sm",
  },
  toggle: {
    name: "toggle",
    exportName: "Toggle",
    initialProps: { variant: "default", size: "default", defaultPressed: false, disabled: false },
    controls: [
      { prop: "variant", label: "Variant", kind: "select", options: variants("default", "outline") },
      { prop: "size", label: "Size", kind: "select", options: variants("default", "sm", "lg") },
      { prop: "defaultPressed", label: "Pressed", kind: "boolean" },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    children: "Bold",
  },
  "toggle-group": {
    name: "toggle-group",
    exportName: "ToggleGroup",
    initialProps: {
      type: "single",
      defaultValue: "center",
      variant: "outline",
      size: "default",
      disabled: false,
      "aria-label": "Text alignment",
    },
    controls: [
      { prop: "defaultValue", label: "Alignment", kind: "select", options: variants("left", "center", "right") },
      { prop: "variant", label: "Variant", kind: "select", options: variants("default", "outline") },
      { prop: "size", label: "Size", kind: "select", options: variants("default", "sm", "lg") },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    composition: [
      { exportName: "ToggleGroupItem", props: { value: "left", "aria-label": "Align left" }, children: "Left" },
      { exportName: "ToggleGroupItem", props: { value: "center", "aria-label": "Align center" }, children: "Center" },
      { exportName: "ToggleGroupItem", props: { value: "right", "aria-label": "Align right" }, children: "Right" },
    ],
  },
  "number-field": {
    name: "number-field",
    exportName: "NumberField",
    initialProps: { defaultValue: 3, min: 0, max: 12, step: 1, disabled: false, "aria-label": "Quantity" },
    controls: [
      { prop: "defaultValue", label: "Value", kind: "number", min: 0, max: 12, step: 1 },
      { prop: "min", label: "Minimum", kind: "number", min: -100, max: 100, step: 1 },
      { prop: "max", label: "Maximum", kind: "number", min: 1, max: 500, step: 1 },
      { prop: "step", label: "Step", kind: "number", min: 1, max: 20, step: 1 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    previewClassName: "w-full max-w-xs",
  },
  rating: {
    name: "rating",
    exportName: "Rating",
    initialProps: { defaultValue: 3, max: 5, readOnly: false, disabled: false, "aria-label": "Product rating" },
    controls: [
      { prop: "defaultValue", label: "Value", kind: "number", min: 0, max: 10, step: 1 },
      { prop: "max", label: "Maximum", kind: "number", min: 1, max: 10, step: 1 },
      { prop: "readOnly", label: "Read only", kind: "boolean" },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
  },
  "radio-group": {
    name: "radio-group",
    exportName: "RadioGroup",
    initialProps: { defaultValue: "team", disabled: false, "aria-label": "Workspace plan" },
    controls: [
      { prop: "defaultValue", label: "Selected plan", kind: "select", options: variants("starter", "team", "enterprise") },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    composition: [
      {
        element: "label",
        props: { htmlFor: "plan-starter", className: "flex items-center gap-2 text-sm" },
        children: [
          { exportName: "RadioGroupItem", props: { id: "plan-starter", value: "starter" } },
          { element: "span", children: "Starter" },
        ],
      },
      {
        element: "label",
        props: { htmlFor: "plan-team", className: "flex items-center gap-2 text-sm" },
        children: [
          { exportName: "RadioGroupItem", props: { id: "plan-team", value: "team" } },
          { element: "span", children: "Team" },
        ],
      },
      {
        element: "label",
        props: { htmlFor: "plan-enterprise", className: "flex items-center gap-2 text-sm" },
        children: [
          { exportName: "RadioGroupItem", props: { id: "plan-enterprise", value: "enterprise" } },
          { element: "span", children: "Enterprise" },
        ],
      },
    ],
  },
  resizable: {
    name: "resizable",
    exportName: "ResizablePanelGroup",
    initialProps: { direction: "horizontal" },
    controls: [
      { prop: "direction", label: "Direction", kind: "select", options: variants("horizontal", "vertical") },
    ],
    composition: [
      {
        exportName: "ResizablePanel",
        props: { defaultSize: 40 },
        children: [
          { element: "div", props: { className: "flex h-full items-center justify-center bg-muted/40 text-sm" }, children: "Navigation" },
        ],
      },
      { exportName: "ResizableHandle", props: { withHandle: true } },
      {
        exportName: "ResizablePanel",
        props: { defaultSize: 60 },
        children: [
          { element: "div", props: { className: "flex h-full items-center justify-center text-sm" }, children: "Content" },
        ],
      },
    ],
    previewClassName: "h-48 w-full max-w-lg overflow-hidden rounded-lg border",
  },
  separator: {
    name: "separator",
    exportName: "Separator",
    initialProps: { orientation: "horizontal", decorative: true },
    controls: [
      { prop: "orientation", label: "Orientation", kind: "select", options: variants("horizontal", "vertical") },
      { prop: "decorative", label: "Decorative", kind: "boolean" },
    ],
    previewClassName: "flex h-32 w-full max-w-md items-center justify-center",
  },
  "scroll-area": {
    name: "scroll-area",
    exportName: "ScrollArea",
    initialProps: { className: "h-48 w-full max-w-md rounded-lg border", "aria-label": "Release notes" },
    controls: [
      {
        prop: "className",
        label: "Height",
        kind: "select",
        options: [
          { value: "h-32 w-full max-w-md rounded-lg border", label: "Compact" },
          { value: "h-48 w-full max-w-md rounded-lg border", label: "Default" },
          { value: "h-64 w-full max-w-md rounded-lg border", label: "Tall" },
        ],
      },
    ],
    composition: [
      {
        element: "div",
        props: { className: "space-y-4 p-4" },
        children: [
          { element: "p", props: { className: "font-medium" }, children: "Release 1.2" },
          { element: "p", props: { className: "text-sm text-muted-foreground" }, children: "Versioned registry manifests and integrity checks." },
          { element: "p", props: { className: "font-medium" }, children: "Release 1.1" },
          { element: "p", props: { className: "text-sm text-muted-foreground" }, children: "Portable design tokens for web, iOS and Android." },
          { element: "p", props: { className: "font-medium" }, children: "Release 1.0" },
          { element: "p", props: { className: "text-sm text-muted-foreground" }, children: "The first stable component registry." },
        ],
      },
    ],
    previewClassName: "flex w-full justify-center",
  },
  "scroll-reveal": {
    name: "scroll-reveal",
    exportName: "ScrollReveal",
    initialProps: { preset: "fade-up", duration: 500, delay: 0, once: true, className: "rounded-lg border bg-card p-6" },
    controls: [
      { prop: "preset", label: "Preset", kind: "select", options: variants("fade", "fade-up", "fade-down", "fade-left", "fade-right", "scale", "blur") },
      { prop: "duration", label: "Duration (ms)", kind: "number", min: 0, max: 2000, step: 50 },
      { prop: "delay", label: "Delay (ms)", kind: "number", min: 0, max: 1000, step: 50 },
      { prop: "once", label: "Reveal once", kind: "boolean" },
    ],
    children: "Revealed content",
  },
  skeleton: {
    name: "skeleton",
    exportName: "Skeleton",
    initialProps: { className: "h-20 w-full max-w-sm" },
    controls: [
      {
        prop: "className",
        label: "Shape",
        kind: "select",
        options: [
          { value: "size-16 rounded-full", label: "Avatar" },
          { value: "h-4 w-full max-w-sm", label: "Text line" },
          { value: "h-20 w-full max-w-sm", label: "Card" },
        ],
      },
    ],
    previewClassName: "flex w-full justify-center",
  },
  spinner: {
    name: "spinner",
    exportName: "Spinner",
    initialProps: { className: "size-6", "aria-label": "Loading content" },
    controls: [
      {
        prop: "className",
        label: "Size",
        kind: "select",
        options: [
          { value: "size-4", label: "Small" },
          { value: "size-6", label: "Medium" },
          { value: "size-8", label: "Large" },
        ],
      },
    ],
  },
  motion: {
    name: "motion",
    exportName: "Motion",
    initialProps: { preset: "fade-up", hover: "lift", duration: 500, delay: 0 },
    controls: [
      { prop: "preset", label: "Enter preset", kind: "select", options: variants("fade", "fade-up", "fade-down", "fade-left", "fade-right", "scale", "blur") },
      { prop: "hover", label: "Hover preset", kind: "select", options: variants("lift", "sink", "scale", "glow") },
      { prop: "duration", label: "Duration (ms)", kind: "number", min: 0, max: 2000, step: 50 },
      { prop: "delay", label: "Delay (ms)", kind: "number", min: 0, max: 1000, step: 50 },
    ],
    children: "Animated content",
    previewClassName: "rounded-lg border bg-card p-6",
  },
  "motion-blur": {
    name: "motion-blur",
    exportName: "MotionBlur",
    initialProps: { duration: 500, delay: 0 },
    controls: [
      { prop: "duration", label: "Duration (ms)", kind: "number", min: 0, max: 2000, step: 50 },
      { prop: "delay", label: "Delay (ms)", kind: "number", min: 0, max: 1000, step: 50 },
    ],
    children: "Blur reveal",
    previewClassName: "rounded-lg border bg-card p-6",
  },
  "motion-fade": {
    name: "motion-fade",
    exportName: "MotionFade",
    initialProps: { duration: 500, delay: 0 },
    controls: [
      { prop: "duration", label: "Duration (ms)", kind: "number", min: 0, max: 2000, step: 50 },
      { prop: "delay", label: "Delay (ms)", kind: "number", min: 0, max: 1000, step: 50 },
    ],
    children: "Fade reveal",
    previewClassName: "rounded-lg border bg-card p-6",
  },
  "motion-scale": {
    name: "motion-scale",
    exportName: "MotionScale",
    initialProps: { duration: 500, delay: 0 },
    controls: [
      { prop: "duration", label: "Duration (ms)", kind: "number", min: 0, max: 2000, step: 50 },
      { prop: "delay", label: "Delay (ms)", kind: "number", min: 0, max: 1000, step: 50 },
    ],
    children: "Scale reveal",
    previewClassName: "rounded-lg border bg-card p-6",
  },
  "motion-slide": {
    name: "motion-slide",
    exportName: "MotionSlide",
    initialProps: { direction: "up", duration: 500, delay: 0 },
    controls: [
      { prop: "direction", label: "Direction", kind: "select", options: variants("up", "down", "left", "right") },
      { prop: "duration", label: "Duration (ms)", kind: "number", min: 0, max: 2000, step: 50 },
      { prop: "delay", label: "Delay (ms)", kind: "number", min: 0, max: 1000, step: 50 },
    ],
    children: "Slide reveal",
    previewClassName: "rounded-lg border bg-card p-6",
  },
  autocomplete: {
    name: "autocomplete",
    exportName: "Autocomplete",
    initialProps: {
      options: ["Accordion", "Button", "Dialog", "Tabs", "Tooltip"],
      defaultValue: "Button",
      placeholder: "Find a component…",
      disabled: false,
      "aria-label": "Component search",
    },
    controls: [
      { prop: "defaultValue", label: "Initial query", kind: "text", maxLength: 48 },
      { prop: "placeholder", label: "Placeholder", kind: "text", maxLength: 80 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    previewClassName: "w-full max-w-sm",
  },
  "button-group": {
    name: "button-group",
    exportName: "ButtonGroup",
    initialProps: { orientation: "horizontal", "aria-label": "Editor actions" },
    controls: [
      { prop: "orientation", label: "Orientation", kind: "select", options: variants("horizontal", "vertical") },
    ],
    composition: [
      { element: "button", props: { type: "button", className: "rounded-md border px-3 py-2 text-sm font-medium" }, children: "Undo" },
      { exportName: "ButtonGroupText", children: "3 changes" },
      { element: "button", props: { type: "button", className: "rounded-md border px-3 py-2 text-sm font-medium" }, children: "Publish" },
    ],
  },
  "color-picker": {
    name: "color-picker",
    exportName: "ColorPicker",
    initialProps: { defaultValue: "#2563eb", "aria-label": "Brand color" },
    controls: [
      { prop: "defaultValue", label: "Initial hex", kind: "text", maxLength: 7 },
    ],
  },
  "navigation-menu": {
    name: "navigation-menu",
    exportName: "NavigationMenu",
    initialProps: { viewport: false, "aria-label": "Product navigation" },
    controls: [
      { prop: "viewport", label: "Viewport", kind: "boolean" },
    ],
    composition: [
      {
        exportName: "NavigationMenuList",
        children: [
          {
            exportName: "NavigationMenuItem",
            children: [
              { exportName: "NavigationMenuTrigger", children: "Platform" },
              {
                exportName: "NavigationMenuContent",
                props: { className: "w-64" },
                children: [
                  { exportName: "NavigationMenuLink", props: { href: "#registry" }, children: "Registry" },
                  { exportName: "NavigationMenuLink", props: { href: "#tokens" }, children: "Design tokens" },
                ],
              },
            ],
          },
          {
            exportName: "NavigationMenuItem",
            children: [
              { exportName: "NavigationMenuLink", props: { href: "#docs" }, children: "Documentation" },
            ],
          },
        ],
      },
    ],
  },
  stepper: {
    name: "stepper",
    exportName: "Stepper",
    initialProps: { defaultValue: 2, orientation: "horizontal", "aria-label": "Release progress" },
    controls: [
      { prop: "defaultValue", label: "Active step", kind: "number", min: 1, max: 3, step: 1 },
      { prop: "orientation", label: "Orientation", kind: "select", options: variants("horizontal", "vertical") },
    ],
    composition: [
      {
        exportName: "StepperItem",
        props: { step: 1 },
        children: [
          { exportName: "StepperTrigger", children: [{ exportName: "StepperIndicator" }, { exportName: "StepperTitle", children: "Plan" }] },
          { exportName: "StepperSeparator" },
        ],
      },
      {
        exportName: "StepperItem",
        props: { step: 2 },
        children: [
          { exportName: "StepperTrigger", children: [{ exportName: "StepperIndicator" }, { exportName: "StepperTitle", children: "Build" }] },
          { exportName: "StepperSeparator" },
        ],
      },
      {
        exportName: "StepperItem",
        props: { step: 3 },
        children: [
          { exportName: "StepperTrigger", children: [{ exportName: "StepperIndicator" }, { exportName: "StepperTitle", children: "Release" }] },
        ],
      },
    ],
    previewClassName: "w-full max-w-xl",
  },
  "tags-input": {
    name: "tags-input",
    exportName: "TagsInput",
    initialProps: {
      defaultValue: ["registry", "accessible"],
      placeholder: "Add a tag…",
      max: 5,
      disabled: false,
      "aria-label": "Component tags",
    },
    controls: [
      { prop: "placeholder", label: "Placeholder", kind: "text", maxLength: 80 },
      { prop: "max", label: "Maximum tags", kind: "number", min: 1, max: 10, step: 1 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    previewClassName: "w-full max-w-md",
  },
  timeline: {
    name: "timeline",
    exportName: "Timeline",
    initialProps: { className: "w-full max-w-md", "aria-label": "Release timeline" },
    controls: [
      {
        prop: "className",
        label: "Width",
        kind: "select",
        options: [
          { value: "w-full max-w-sm", label: "Compact" },
          { value: "w-full max-w-md", label: "Default" },
          { value: "w-full max-w-lg", label: "Wide" },
        ],
      },
    ],
    composition: [
      {
        exportName: "TimelineItem",
        children: [
          { exportName: "TimelineIndicator" },
          { exportName: "TimelineContent", children: [{ exportName: "TimelineTime", children: "09:00" }, { exportName: "TimelineTitle", children: "Quality gates passed" }, { exportName: "TimelineDescription", children: "Registry, CLI and web checks are green." }] },
        ],
      },
      {
        exportName: "TimelineItem",
        children: [
          { exportName: "TimelineIndicator" },
          { exportName: "TimelineContent", children: [{ exportName: "TimelineTime", children: "10:30" }, { exportName: "TimelineTitle", children: "Release prepared" }, { exportName: "TimelineDescription", children: "Versioned artifacts are ready for review." }] },
        ],
      },
    ],
  },
  "tree-view": {
    name: "tree-view",
    exportName: "TreeView",
    initialProps: {
      defaultExpanded: ["packages"],
      defaultSelected: "registry",
      "aria-label": "Repository files",
    },
    controls: [
      { prop: "defaultSelected", label: "Selected item", kind: "select", options: variants("registry", "web", "roadmap") },
    ],
    composition: [
      {
        exportName: "TreeItem",
        props: { value: "packages", label: "packages" },
        children: [
          { exportName: "TreeItem", props: { value: "registry", label: "registry" } },
          { exportName: "TreeItem", props: { value: "web", label: "web" } },
        ],
      },
      { exportName: "TreeItem", props: { value: "roadmap", label: "ROADMAP.md" } },
    ],
    previewClassName: "w-full max-w-sm",
  },
  "alert-dialog": {
    name: "alert-dialog",
    exportName: "AlertDialog",
    initialProps: { defaultOpen: false },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
    ],
    composition: [
      { exportName: "AlertDialogTrigger", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Delete release" },
      {
        exportName: "AlertDialogContent",
        children: [
          { exportName: "AlertDialogHeader", children: [{ exportName: "AlertDialogTitle", children: "Delete this release?" }, { exportName: "AlertDialogDescription", children: "This action permanently removes the release artifacts." }] },
          { exportName: "AlertDialogFooter", children: [{ exportName: "AlertDialogCancel", children: "Cancel" }, { exportName: "AlertDialogAction", children: "Delete" }] },
        ],
      },
    ],
  },
  dialog: {
    name: "dialog",
    exportName: "Dialog",
    initialProps: { defaultOpen: false },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
    ],
    composition: [
      { exportName: "DialogTrigger", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Edit project" },
      {
        exportName: "DialogContent",
        children: [
          { exportName: "DialogHeader", children: [{ exportName: "DialogTitle", children: "Edit project" }, { exportName: "DialogDescription", children: "Update the project details, then save your changes." }] },
          { element: "label", props: { className: "grid gap-2 text-sm" }, children: [{ element: "span", children: "Project name" }, { element: "input", props: { type: "text", defaultValue: "logic2b ui", className: "h-9 rounded-md border px-3" } }] },
          { exportName: "DialogFooter", children: [{ exportName: "DialogClose", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Save changes" }] },
        ],
      },
    ],
  },
  drawer: {
    name: "drawer",
    exportName: "Drawer",
    initialProps: { defaultOpen: false, direction: "bottom" },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
      { prop: "direction", label: "Direction", kind: "select", options: variants("bottom", "top", "left", "right") },
    ],
    composition: [
      { exportName: "DrawerTrigger", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Open release drawer" },
      {
        exportName: "DrawerContent",
        children: [
          { exportName: "DrawerHeader", children: [{ exportName: "DrawerTitle", children: "Release checklist" }, { exportName: "DrawerDescription", children: "Review each quality gate before publishing." }] },
          { element: "div", props: { className: "px-4 pb-4 text-sm" }, children: "Tests · accessibility · visual baselines" },
          { exportName: "DrawerFooter", children: [{ exportName: "DrawerClose", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Done" }] },
        ],
      },
    ],
  },
  sheet: {
    name: "sheet",
    exportName: "Sheet",
    initialProps: { defaultOpen: false, side: "right" },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
      { prop: "side", label: "Side", kind: "select", options: variants("top", "right", "bottom", "left") },
    ],
    rootProps: ["defaultOpen"],
    composition: [
      { exportName: "SheetTrigger", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Open settings" },
      {
        exportName: "SheetContent",
        bindings: { side: "side" },
        children: [
          { exportName: "SheetHeader", children: [{ exportName: "SheetTitle", children: "Project settings" }, { exportName: "SheetDescription", children: "Configure the generated registry output." }] },
          { element: "div", props: { className: "p-4 text-sm" }, children: "Package name · output path · aliases" },
          { exportName: "SheetFooter", children: [{ exportName: "SheetClose", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Save" }] },
        ],
      },
    ],
  },
  popover: {
    name: "popover",
    exportName: "Popover",
    initialProps: { defaultOpen: false },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
    ],
    composition: [
      { exportName: "PopoverTrigger", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Release details" },
      { exportName: "PopoverContent", children: "Version 1.2 is ready after all quality gates pass." },
    ],
  },
  "hover-card": {
    name: "hover-card",
    exportName: "HoverCard",
    initialProps: { defaultOpen: false, openDelay: 100, closeDelay: 100 },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
      { prop: "openDelay", label: "Open delay", kind: "number", min: 0, max: 1000, step: 50 },
    ],
    composition: [
      { exportName: "HoverCardTrigger", props: { href: "#logic2b", className: "font-medium underline underline-offset-4" }, children: "@logic2b" },
      { exportName: "HoverCardContent", children: "Composable UI infrastructure for people and coding agents." },
    ],
  },
  tooltip: {
    name: "tooltip",
    exportName: "Tooltip",
    initialProps: { defaultOpen: false },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
    ],
    composition: [
      { exportName: "TooltipTrigger", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Registry status" },
      { exportName: "TooltipContent", children: "All quality gates pass" },
    ],
  },
  select: {
    name: "select",
    exportName: "Select",
    initialProps: { defaultValue: "team", disabled: false },
    controls: [
      { prop: "defaultValue", label: "Selected plan", kind: "select", options: variants("starter", "team", "enterprise") },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    composition: [
      { exportName: "SelectTrigger", props: { className: "w-56", "aria-label": "Workspace plan" }, children: [{ exportName: "SelectValue", props: { placeholder: "Choose a plan" } }] },
      { exportName: "SelectContent", children: [{ exportName: "SelectItem", props: { value: "starter" }, children: "Starter" }, { exportName: "SelectItem", props: { value: "team" }, children: "Team" }, { exportName: "SelectItem", props: { value: "enterprise" }, children: "Enterprise" }] },
    ],
  },
  command: {
    name: "command",
    exportName: "Command",
    initialProps: { className: "w-full max-w-md border shadow-sm", "aria-label": "Component commands" },
    controls: [
      {
        prop: "className",
        label: "Width",
        kind: "select",
        options: [
          { value: "w-full max-w-sm border shadow-sm", label: "Compact" },
          { value: "w-full max-w-md border shadow-sm", label: "Default" },
          { value: "w-full max-w-lg border shadow-sm", label: "Wide" },
        ],
      },
    ],
    composition: [
      { exportName: "CommandInput", props: { placeholder: "Search components…", "aria-label": "Search commands" } },
      {
        exportName: "CommandList",
        children: [
          { exportName: "CommandEmpty", children: "No component found." },
          { exportName: "CommandGroup", props: { heading: "Components" }, children: [{ exportName: "CommandItem", props: { value: "button" }, children: "Button" }, { exportName: "CommandItem", props: { value: "dialog" }, children: "Dialog" }, { exportName: "CommandItem", props: { value: "tooltip" }, children: "Tooltip" }] },
        ],
      },
    ],
  },
  "context-menu": {
    name: "context-menu",
    exportName: "ContextMenu",
    initialProps: { modal: true },
    controls: [
      { prop: "modal", label: "Modal", kind: "boolean" },
    ],
    composition: [
      { exportName: "ContextMenuTrigger", props: { className: "flex h-36 w-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground" }, children: "Right-click this surface" },
      { exportName: "ContextMenuContent", children: [{ exportName: "ContextMenuLabel", children: "Project" }, { exportName: "ContextMenuItem", children: "Open documentation" }, { exportName: "ContextMenuItem", children: "Copy install command" }, { exportName: "ContextMenuSeparator" }, { exportName: "ContextMenuItem", props: { variant: "destructive" }, children: "Remove project" }] },
    ],
  },
  "dropdown-menu": {
    name: "dropdown-menu",
    exportName: "DropdownMenu",
    initialProps: { defaultOpen: false, modal: true },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
      { prop: "modal", label: "Modal", kind: "boolean" },
    ],
    composition: [
      { exportName: "DropdownMenuTrigger", props: { className: "rounded-md border px-4 py-2 text-sm font-medium" }, children: "Project actions" },
      { exportName: "DropdownMenuContent", children: [{ exportName: "DropdownMenuLabel", children: "Workspace" }, { exportName: "DropdownMenuItem", children: "Open project" }, { exportName: "DropdownMenuItem", children: "Duplicate" }, { exportName: "DropdownMenuSeparator" }, { exportName: "DropdownMenuItem", props: { variant: "destructive" }, children: "Archive" }] },
    ],
  },
  menubar: {
    name: "menubar",
    exportName: "Menubar",
    initialProps: { className: "w-fit", "aria-label": "Project menu" },
    controls: [
      {
        prop: "className",
        label: "Width",
        kind: "select",
        options: [
          { value: "w-fit", label: "Content" },
          { value: "w-72", label: "Medium" },
          { value: "w-96", label: "Wide" },
        ],
      },
    ],
    composition: [
      { exportName: "MenubarMenu", children: [{ exportName: "MenubarTrigger", children: "Project" }, { exportName: "MenubarContent", children: [{ exportName: "MenubarItem", children: "New project" }, { exportName: "MenubarItem", children: "Open…" }, { exportName: "MenubarSeparator" }, { exportName: "MenubarItem", children: "Export" }] }] },
      { exportName: "MenubarMenu", children: [{ exportName: "MenubarTrigger", children: "Help" }, { exportName: "MenubarContent", children: [{ exportName: "MenubarItem", children: "Documentation" }, { exportName: "MenubarItem", children: "Keyboard shortcuts" }] }] },
    ],
  },
  carousel: {
    name: "carousel",
    exportName: "Carousel",
    initialProps: { orientation: "horizontal", className: "w-full max-w-xs", "aria-label": "Registry highlights" },
    controls: [
      { prop: "orientation", label: "Orientation", kind: "select", options: variants("horizontal", "vertical") },
    ],
    composition: [
      { exportName: "CarouselContent", props: { className: "h-44" }, children: [{ exportName: "CarouselItem", children: [{ element: "div", props: { className: "flex h-40 items-center justify-center rounded-lg border bg-muted text-3xl font-semibold" }, children: "1" }] }, { exportName: "CarouselItem", children: [{ element: "div", props: { className: "flex h-40 items-center justify-center rounded-lg border bg-muted text-3xl font-semibold" }, children: "2" }] }, { exportName: "CarouselItem", children: [{ element: "div", props: { className: "flex h-40 items-center justify-center rounded-lg border bg-muted text-3xl font-semibold" }, children: "3" }] }] },
      { exportName: "CarouselPrevious" },
      { exportName: "CarouselNext" },
    ],
  },
  calendar: {
    name: "calendar",
    exportName: "Calendar",
    initialProps: {
      mode: "single",
      defaultMonth: playgroundDate("2026-08-15"),
      today: playgroundDate("2026-08-15"),
      selected: playgroundDate("2026-08-15"),
      showOutsideDays: true,
      captionLayout: "label",
      "aria-label": "August 2026 release calendar",
    },
    controls: [
      { prop: "showOutsideDays", label: "Outside days", kind: "boolean" },
      { prop: "captionLayout", label: "Caption", kind: "select", options: variants("label", "dropdown", "dropdown-months", "dropdown-years") },
    ],
  },
  chart: {
    name: "chart",
    exportName: "ChartContainer",
    initialProps: {
      className: "h-64 w-full max-w-lg",
      config: {
        visitors: {
          label: "Visitors",
          color: "var(--chart-1)",
        },
      },
      role: "img",
      "aria-label": "Monthly visitors from January to June 2026",
    },
    controls: [
      {
        prop: "className",
        label: "Chart size",
        kind: "select",
        options: [
          { value: "h-52 w-full max-w-md", label: "Compact" },
          { value: "h-64 w-full max-w-lg", label: "Medium" },
          { value: "h-72 w-full max-w-xl", label: "Large" },
        ],
      },
    ],
    composition: [
      {
        exportName: "BarChart",
        module: "recharts",
        props: {
          accessibilityLayer: true,
          data: [
            { month: "Jan", visitors: 186 },
            { month: "Feb", visitors: 305 },
            { month: "Mar", visitors: 237 },
            { month: "Apr", visitors: 273 },
            { month: "May", visitors: 209 },
            { month: "Jun", visitors: 314 },
          ],
          margin: { left: 8, right: 8 },
        },
        children: [
          {
            exportName: "CartesianGrid",
            module: "recharts",
            props: { vertical: false },
          },
          {
            exportName: "XAxis",
            module: "recharts",
            props: {
              dataKey: "month",
              tickLine: false,
              axisLine: false,
              tickMargin: 10,
            },
          },
          {
            exportName: "Bar",
            module: "recharts",
            props: {
              dataKey: "visitors",
              fill: "var(--color-visitors)",
              radius: 6,
            },
          },
        ],
      },
    ],
    previewClassName: "w-full max-w-xl",
  },
  form: {
    name: "form",
    exportName: "Form",
    adapter: "form",
    initialProps: {
      placeholder: "logic2b",
      description: "This is your public display name.",
      disabled: false,
    },
    controls: [
      { prop: "placeholder", label: "Placeholder", kind: "text", maxLength: 48 },
      { prop: "description", label: "Description", kind: "text", maxLength: 100 },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    previewClassName: "w-full max-w-sm",
  },
  sonner: {
    name: "sonner",
    exportName: "Toaster",
    rootElement: "div",
    initialProps: {
      position: "top-center",
      richColors: true,
      className: "flex min-h-28 items-center justify-center",
    },
    controls: [
      {
        prop: "position",
        label: "Position",
        kind: "select",
        options: variants("top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"),
      },
      { prop: "richColors", label: "Rich colors", kind: "boolean" },
    ],
    rootProps: ["className"],
    composition: [
      {
        exportName: "Toaster",
        bindings: { position: "position", richColors: "richColors" },
      },
      {
        element: "button",
        props: {
          type: "button",
          className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm",
        },
        action: {
          event: "onClick",
          type: "toast",
          message: "Release published successfully",
        },
        children: "Publish release",
      },
    ],
  },
  sidebar: {
    name: "sidebar",
    exportName: "SidebarProvider",
    initialProps: { defaultOpen: true, className: "min-h-72 overflow-hidden rounded-lg border" },
    controls: [
      { prop: "defaultOpen", label: "Open", kind: "boolean" },
    ],
    composition: [
      {
        exportName: "Sidebar",
        props: { collapsible: "none", className: "h-72" },
        children: [
          { exportName: "SidebarHeader", children: [{ exportName: "SidebarInput", props: { placeholder: "Search…", "aria-label": "Search navigation" } }] },
          { exportName: "SidebarContent", children: [{ exportName: "SidebarGroup", children: [{ exportName: "SidebarGroupLabel", children: "Platform" }, { exportName: "SidebarGroupContent", children: [{ exportName: "SidebarMenu", children: [{ exportName: "SidebarMenuItem", children: [{ exportName: "SidebarMenuButton", props: { type: "button", isActive: true }, children: "Registry" }] }, { exportName: "SidebarMenuItem", children: [{ exportName: "SidebarMenuButton", props: { type: "button" }, children: "Design tokens" }] }, { exportName: "SidebarMenuItem", children: [{ exportName: "SidebarMenuButton", props: { type: "button" }, children: "Benchmarks" }] }] }] }] }] },
          { exportName: "SidebarFooter", children: "logic2b ui" },
        ],
      },
      { exportName: "SidebarInset", props: { className: "min-h-72 p-6" }, children: [{ exportName: "SidebarTrigger" }, { element: "p", props: { className: "mt-6 text-sm text-muted-foreground" }, children: "Project workspace" }] },
    ],
    previewClassName: "w-full max-w-2xl",
  },
  "file-dropzone": {
    name: "file-dropzone",
    exportName: "FileDropzone",
    initialProps: { accept: "image/*", multiple: true, disabled: false, inputLabel: "Upload project images", className: "w-full max-w-md" },
    controls: [
      { prop: "accept", label: "Accepted files", kind: "text", maxLength: 48 },
      { prop: "multiple", label: "Multiple files", kind: "boolean" },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    previewClassName: "w-full max-w-md",
  },
  "code-block": {
    name: "code-block",
    exportName: "CodeBlock",
    initialProps: { code: "const ready = true\nconsole.log(ready)", language: "ts" },
    controls: [
      { prop: "language", label: "Language", kind: "text", maxLength: 24 },
      { prop: "code", label: "Code", kind: "code", maxLength: 500 },
    ],
    previewClassName: "w-full max-w-xl",
  },
  "native-select": {
    name: "native-select",
    exportName: "NativeSelect",
    initialProps: { size: "default", defaultValue: "team", disabled: false, "aria-label": "Workspace plan" },
    controls: [
      { prop: "size", label: "Size", kind: "select", options: variants("default", "sm") },
      { prop: "defaultValue", label: "Value", kind: "select", options: variants("starter", "team", "enterprise") },
      { prop: "disabled", label: "Disabled", kind: "boolean" },
    ],
    options: variants("starter", "team", "enterprise"),
    previewClassName: "w-full max-w-sm",
  },
} as const satisfies Record<string, PlaygroundRecipe>

export type PlaygroundName = keyof typeof PLAYGROUND_RECIPES

export const PLAYGROUND_NAMES = Object.keys(PLAYGROUND_RECIPES) as PlaygroundName[]

export function hasPlayground(name: string): name is PlaygroundName {
  return Object.hasOwn(PLAYGROUND_RECIPES, name)
}
