import registryIndex from "../../public/r/index.json";

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Component category slugs, in sidebar display order. */
const CATEGORY_ORDER = [
  "form",
  "data-display",
  "overlays",
  "navigation",
  "feedback",
  "layout",
  "motion",
  "guides",
] as const;

type CategorySlug = (typeof CATEGORY_ORDER)[number];

const CATEGORY_LABEL: Record<CategorySlug, string> = {
  form: "Form",
  "data-display": "Data Display",
  overlays: "Overlays",
  navigation: "Navigation",
  feedback: "Feedback",
  layout: "Layout",
  motion: "Motion & Scroll",
  guides: "Guides",
};

// Pages that have a docs page but no registry:ui item of their own — either
// compositions (date-picker, combobox) or recipes/guides (data-table,
// typography). Listed manually, with the category they slot into, so they
// stay discoverable in the grouped sidebar.
const EXTRA_PAGES: (NavItem & { category: CategorySlug })[] = [
  { title: "Combobox", href: "/docs/components/combobox", category: "overlays" },
  { title: "Data Table", href: "/docs/components/data-table", category: "data-display" },
  { title: "Date Picker", href: "/docs/components/date-picker", category: "form" },
  { title: "Typography", href: "/docs/components/typography", category: "guides" },
];

export interface NavGroup {
  slug: CategorySlug;
  title: string;
  items: NavItem[];
}

/** Registry `registry:ui` items grouped by their first `categories` entry,
 *  in `CATEGORY_ORDER`. Powers the collapsible Components sidebar. */
export function buildComponentGroups(): NavGroup[] {
  const byCategory = new Map<CategorySlug, NavItem[]>();

  for (const item of registryIndex) {
    if (item.type !== "registry:ui") continue;
    const category = (item.categories?.[0] as CategorySlug) ?? "guides";
    const nav: NavItem = {
      title:
        item.name.charAt(0).toUpperCase() +
        item.name.slice(1).replace(/-/g, " "),
      href: `/docs/components/${item.name}`,
    };
    byCategory.set(category, [...(byCategory.get(category) ?? []), nav]);
  }

  for (const page of EXTRA_PAGES) {
    byCategory.set(page.category, [
      ...(byCategory.get(page.category) ?? []),
      { title: page.title, href: page.href },
    ]);
  }

  return CATEGORY_ORDER.filter((slug) => byCategory.has(slug)).map((slug) => ({
    slug,
    title: CATEGORY_LABEL[slug],
    items: (byCategory.get(slug) ?? []).sort((a, b) =>
      a.title.localeCompare(b.title)
    ),
  }));
}

export const componentGroups: NavGroup[] = buildComponentGroups();

export const docsNav: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Theming", href: "/docs/theming" },
      { title: "Bring your own backend", href: "/docs/backend" },
      { title: "For LLMs & Agents", href: "/docs/llms" },
    ],
  },
];
