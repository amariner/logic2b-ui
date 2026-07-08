import registryIndex from "../../public/r/index.json";

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Pages that have a docs page but no registry:ui item of their own — either
// compositions (date-picker, combobox) or recipes/guides (data-table,
// typography). Listed manually so they stay discoverable in the sidebar.
const EXTRA_PAGES: NavItem[] = [
  { title: "Combobox", href: "/docs/components/combobox" },
  { title: "Data Table", href: "/docs/components/data-table" },
  { title: "Date Picker", href: "/docs/components/date-picker" },
  { title: "Typography", href: "/docs/components/typography" },
];

function buildComponentNav(): NavItem[] {
  const fromRegistry: NavItem[] = registryIndex
    .filter((item) => item.type === "registry:ui")
    .map((item) => ({
      title:
        item.name.charAt(0).toUpperCase() +
        item.name.slice(1).replace(/-/g, " "),
      href: `/docs/components/${item.name}`,
    }));

  return [...fromRegistry, ...EXTRA_PAGES].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
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
    items: buildComponentNav(),
  },
];
