import type { RegistryItem } from "../types.ts"

export const items: RegistryItem[] = [
  {
    name: "form",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A set of composable components (built on react-hook-form + zod) for building accessible forms with labels, descriptions and validation messages wired to field state. Use for any form that needs validation.",
    dependencies: ["radix-ui", "react-hook-form", "@hookform/resolvers", "zod"],
    registryDependencies: ["utils", "label"],
    files: [{ path: "src/ui/form.tsx", type: "registry:ui" }],
  },
  {
    name: "checkbox",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A control that allows the user to toggle between checked, unchecked and indeterminate states. Use for boolean options in forms, built on Radix Checkbox.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/checkbox.tsx", type: "registry:ui" }],
  },
  {
    name: "radio-group",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A set of checkable buttons where no more than one can be checked at a time. Use when the user must pick exactly one option from a visible list, built on Radix Radio Group.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/radio-group.tsx", type: "registry:ui" }],
  },
  {
    name: "switch",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A control that toggles between checked and unchecked states, presented as a physical switch. Use for on/off settings, built on Radix Switch.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/switch.tsx", type: "registry:ui" }],
  },
  {
    name: "select",
    type: "registry:ui",
    categories: ["form"],
    description:
      "Displays a list of options for the user to pick from, triggered by a button. Use for choosing one value from a longer or dropdown-style list, built on Radix Select.",
    dependencies: ["radix-ui", "lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/select.tsx", type: "registry:ui" }],
  },
  {
    name: "native-select",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A styled wrapper around the native <select> element: platform-native option list and keyboard/touch behavior, with a token-matched border, focus ring and chevron. Use when you want OS-native select UX (mobile pickers, screen reader familiarity) instead of Select's custom listbox.",
    dependencies: ["lucide-react", "class-variance-authority"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/native-select.tsx", type: "registry:ui" }],
  },
  {
    name: "slider",
    type: "registry:ui",
    categories: ["form"],
    description:
      "An input where the user selects a value, or range of values, by dragging a handle within a track. Use for numeric ranges like volume or price, built on Radix Slider.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/slider.tsx", type: "registry:ui" }],
  },
  {
    name: "progress",
    type: "registry:ui",
    categories: ["feedback"],
    description:
      "Displays an indicator showing the completion progress of a task. Use to communicate long-running operations, built on Radix Progress.",
    dependencies: ["radix-ui"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/progress.tsx", type: "registry:ui" }],
  },
  {
    name: "toggle",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A two-state button that can be either on or off. Use for a single toggleable action like bold formatting, built on Radix Toggle.",
    dependencies: ["radix-ui", "class-variance-authority"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/toggle.tsx", type: "registry:ui" }],
  },
  {
    name: "toggle-group",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A set of two-state buttons that can be toggled on or off, grouped together with shared variant and size. Use for grouped exclusive or multiple selection toggles like text alignment, built on Radix Toggle Group.",
    dependencies: ["radix-ui", "class-variance-authority"],
    registryDependencies: ["utils", "toggle"],
    files: [{ path: "src/ui/toggle-group.tsx", type: "registry:ui" }],
  },
  {
    name: "button-group",
    type: "registry:ui",
    categories: ["form"],
    description:
      "Groups related buttons (and optionally a text label or select) together edge-to-edge, horizontal or vertical. Use for segmented actions like a split button or a toolbar. Parts: ButtonGroup (root, orientation), ButtonGroupText, ButtonGroupSeparator.",
    registryDependencies: ["utils", "separator"],
    files: [{ path: "src/ui/button-group.tsx", type: "registry:ui" }],
  },
  {
    name: "input-group",
    type: "registry:ui",
    categories: ["form"],
    description:
      "Wraps an input or textarea with addons (icons, text, buttons) aligned to either edge, sharing one bordered container. Use for search boxes with an icon, inputs with a unit suffix, or inline actions. Parts: InputGroup (root), InputGroupAddon (align inline-start | inline-end | block-start | block-end), InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea.",
    dependencies: ["class-variance-authority"],
    registryDependencies: ["utils", "button"],
    files: [{ path: "src/ui/input-group.tsx", type: "registry:ui" }],
  },
  {
    name: "field",
    type: "registry:ui",
    categories: ["form"],
    description:
      "Composable primitives for laying out a form field (label, control slot, description, validation error) without requiring react-hook-form. Use for simple forms or to wrap a single control; use the form component instead when you need react-hook-form + zod wiring. Parts: FieldSet, FieldLegend, FieldGroup, Field (orientation vertical | horizontal | responsive), FieldContent, FieldLabel, FieldTitle, FieldDescription, FieldSeparator, FieldError.",
    dependencies: ["class-variance-authority"],
    registryDependencies: ["utils", "label", "separator"],
    files: [{ path: "src/ui/field.tsx", type: "registry:ui" }],
  },
  {
    name: "tags-input",
    type: "registry:ui",
    categories: ["form"],
    description:
      "Free-form multi-value input rendered as removable chips: Enter or comma commits, paste splits on commas, Backspace on an empty field removes the last tag, duplicates are ignored and max caps the list. Controlled or uncontrolled via value/defaultValue + onValueChange.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/tags-input.tsx", type: "registry:ui" }],
  },
  {
    name: "rating",
    type: "registry:ui",
    categories: ["form"],
    description:
      "A star rating input following the radio-group pattern: each step is a radio with aria-checked, arrow keys move the value (Home/End jump to the ends), hover previews, clicking the current value clears it, and readOnly renders a static labelled image. Swap the star for any icon via the icon prop.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/rating.tsx", type: "registry:ui" }],
  },
  {
    name: "number-field",
    type: "registry:ui",
    categories: ["form"],
    title: "Number Field",
    description:
      "A numeric input with decrement/increment steppers, min/max clamping and step. Controlled via value/onValueChange or uncontrolled via defaultValue. Renders a real <input type=number> (native form submission + keyboard) with the native spinners hidden in favor of the styled buttons.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/number-field.tsx", type: "registry:ui" }],
  },
  {
    name: "autocomplete",
    type: "registry:ui",
    categories: ["form"],
    title: "Autocomplete",
    description:
      "A free-text input with a filtered suggestion list — the editable ARIA combobox pattern. Unlike a select-style combobox it accepts arbitrary text; the list just offers matches. Fully keyboard-driven (↑/↓ move, Enter picks, Esc closes), controlled or uncontrolled, dependency-free.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/autocomplete.tsx", type: "registry:ui" }],
  },
  {
    name: "file-dropzone",
    type: "registry:ui",
    categories: ["form"],
    title: "File Dropzone",
    description:
      "A drag-and-drop file surface with click/keyboard to browse. Native DnD (no dependencies): highlights while a file is dragged over it and calls onFiles with the dropped or selected files. Supports accept, multiple and disabled; rendering the file list is left to the consumer.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/file-dropzone.tsx", type: "registry:ui" }],
  },
  {
    name: "color-picker",
    type: "registry:ui",
    categories: ["form"],
    title: "Color Picker",
    description:
      "A self-contained HSV color picker: a draggable saturation/value area, a hue slider and a hex input. Controlled via value/onValueChange or uncontrolled via defaultValue; emits #rrggbb. Pointer-driven, zero dependencies.",
    registryDependencies: ["utils"],
    files: [{ path: "src/ui/color-picker.tsx", type: "registry:ui" }],
  },
]
