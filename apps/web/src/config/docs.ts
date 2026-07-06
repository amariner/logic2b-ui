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
    items: registryIndex
      .filter((item) => item.type === "registry:ui")
      .map((item) => ({
        title: item.name.charAt(0).toUpperCase() + item.name.slice(1).replace(/-/g, " "),
        href: `/docs/components/${item.name}`,
      })),
  },
];
