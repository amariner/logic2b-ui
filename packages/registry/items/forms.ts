import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "form",
    type: "registry:ui",
    description:
      "A set of composable components (built on react-hook-form + zod) for building accessible forms with labels, descriptions and validation messages wired to field state. Use for any form that needs validation.",
    dependencies: ["radix-ui", "react-hook-form", "@hookform/resolvers", "zod"],
    registryDependencies: ["utils", "label"],
    files: [{ path: "src/ui/form.tsx", type: "registry:ui" }],
  },
  {
    name: "checkbox",
    type: "registry:ui",
    description:
      "A control that allows the user to toggle between checked, unchecked and indeterminate states. Use for boolean options in forms, built on Radix Checkbox.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/checkbox.tsx", type: "registry:ui" }],
  },
  {
    name: "radio-group",
    type: "registry:ui",
    description:
      "A set of checkable buttons where no more than one can be checked at a time. Use when the user must pick exactly one option from a visible list, built on Radix Radio Group.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/radio-group.tsx", type: "registry:ui" }],
  },
  {
    name: "switch",
    type: "registry:ui",
    description:
      "A control that toggles between checked and unchecked states, presented as a physical switch. Use for on/off settings, built on Radix Switch.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/switch.tsx", type: "registry:ui" }],
  },
  {
    name: "select",
    type: "registry:ui",
    description:
      "Displays a list of options for the user to pick from, triggered by a button. Use for choosing one value from a longer or dropdown-style list, built on Radix Select.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/select.tsx", type: "registry:ui" }],
  },
  {
    name: "slider",
    type: "registry:ui",
    description:
      "An input where the user selects a value, or range of values, by dragging a handle within a track. Use for numeric ranges like volume or price, built on Radix Slider.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/slider.tsx", type: "registry:ui" }],
  },
  {
    name: "progress",
    type: "registry:ui",
    description:
      "Displays an indicator showing the completion progress of a task. Use to communicate long-running operations, built on Radix Progress.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/progress.tsx", type: "registry:ui" }],
  },
  {
    name: "toggle",
    type: "registry:ui",
    description:
      "A two-state button that can be either on or off. Use for a single toggleable action like bold formatting, built on Radix Toggle.",
    dependencies: ["radix-ui", "class-variance-authority"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/toggle.tsx", type: "registry:ui" }],
  },
  {
    name: "toggle-group",
    type: "registry:ui",
    description:
      "A set of two-state buttons that can be toggled on or off, grouped together with shared variant and size. Use for grouped exclusive or multiple selection toggles like text alignment, built on Radix Toggle Group.",
    dependencies: ["radix-ui", "class-variance-authority"],
    registryDependencies: ["utils", "toggle"],
    files: [{ path: "src/ui/toggle-group.tsx", type: "registry:ui" }],
  },
]
