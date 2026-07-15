import { getCollection } from "astro:content";
import registryIndex from "../../public/r/index.json";

export type SearchGroup = "Components" | "Blocks" | "Charts" | "Guides";

export type SearchIndexItem = {
  title: string;
  description: string;
  url: string;
  group: SearchGroup;
};

/** Pull the "charts-<slug>" category off a registry item to build its URL. */
function chartCategory(categories: string[] | undefined): string | undefined {
  return categories
    ?.find((c) => c.startsWith("charts-"))
    ?.replace("charts-", "");
}

const EXTRA: SearchIndexItem[] = [
  {
    title: "Create — Theme Builder",
    description:
      "Design a theme live, share a preset, and export ready-to-paste CSS and framework scaffolds.",
    url: "/create",
    group: "Guides",
  },
  {
    title: "Typeset — Type Scale Studio",
    description:
      "Design a type scale live: heading, body and mono fonts, measure, size, leading and flow. Preview against a real docs article and export typeset.css.",
    url: "/typeset",
    group: "Guides",
  },
];

export async function getSearchIndex(): Promise<SearchIndexItem[]> {
  const docs = await getCollection("docs");

  const docItems: SearchIndexItem[] = docs.map((d) => ({
    title: d.data.title,
    description: d.data.description,
    url: `/docs/${d.id}`,
    group: d.id.startsWith("components/") ? "Components" : "Guides",
  }));

  type RegistryEntry = {
    name: string;
    type: string;
    title?: string;
    description: string;
    categories?: string[];
  };
  const registryItems = registryIndex as RegistryEntry[];

  const isChart = (i: RegistryEntry) => i.categories?.includes("charts");

  const blockItems: SearchIndexItem[] = registryItems
    .filter((i) => i.type === "registry:block" && !isChart(i))
    .map((i) => ({
      title: i.title ?? i.name,
      description: i.description,
      url: `/blocks/${i.categories?.[0] ?? "application"}/${i.name}`,
      group: "Blocks" as const,
    }));

  // Every installable chart is searchable and deep-links to its category page.
  const chartItems: SearchIndexItem[] = registryItems
    .filter((i) => i.type === "registry:block" && isChart(i))
    .map((i) => {
      const category = chartCategory(i.categories);
      return {
        title: i.title ?? i.name,
        description: i.description,
        url: category ? `/charts/${category}#${i.name}` : "/charts/area",
        group: "Charts" as const,
      };
    });

  return [...docItems, ...blockItems, ...chartItems, ...EXTRA].sort((a, b) => {
    const order: SearchGroup[] = ["Components", "Blocks", "Charts", "Guides"];
    const g = order.indexOf(a.group) - order.indexOf(b.group);
    return g !== 0 ? g : a.title.localeCompare(b.title);
  });
}
