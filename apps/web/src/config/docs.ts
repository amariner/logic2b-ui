import registryIndex from "../../public/r/index.json";

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const docsNav: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Theming", href: "/docs/theming" },
      { title: "For LLMs & Agents", href: "/docs/llms" },
    ],
  },
  {
    title: "Components",
    items: insertDatePicker(
      registryIndex
        .filter((item) => item.type === "registry:ui")
        .map((item) => ({
          title:
            item.name.charAt(0).toUpperCase() +
            item.name.slice(1).replace(/-/g, " "),
          href: `/docs/components/${item.name}`,
        }))
    ),
  },
];

// "date-picker" has no registry item of its own (it's a composition of
// popover + calendar, same as upstream shadcn) — insert it manually right
// after Calendar so it stays discoverable in the sidebar.
function insertDatePicker(items: NavItem[]): NavItem[] {
  const index = items.findIndex((item) => item.title === "Calendar");
  const datePicker: NavItem = {
    title: "Date Picker",
    href: "/docs/components/date-picker",
  };
  if (index === -1) return [...items, datePicker];
  return [...items.slice(0, index + 1), datePicker, ...items.slice(index + 1)];
}
