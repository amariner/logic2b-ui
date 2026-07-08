import { getCollection } from "astro:content";
import registryIndex from "../../public/r/index.json";

export type SearchGroup = "Components" | "Blocks" | "Charts" | "Guides";

export type SearchIndexItem = {
  title: string;
  description: string;
  url: string;
  group: SearchGroup;
};

const CHARTS: SearchIndexItem[] = [
  ["area", "Area charts — filled line charts for trends over a range."],
  ["bar", "Bar charts — compare values across categories."],
  ["line", "Line charts — track a value over time."],
  ["pie", "Pie & donut charts — show parts of a whole."],
].map(([slug, description]) => ({
  title: `${slug[0].toUpperCase()}${slug.slice(1)} Chart`,
  description,
  url: `/charts/${slug}`,
  group: "Charts",
}));

const EXTRA: SearchIndexItem[] = [
  {
    title: "Create — Theme Builder",
    description:
      "Design a theme live, share a preset, and export ready-to-paste CSS and framework scaffolds.",
    url: "/create",
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

  const blockItems: SearchIndexItem[] = registryIndex
    .filter((i: { type: string }) => i.type === "registry:block")
    .map((i: { name: string; title?: string; description: string }) => ({
      title: i.title ?? i.name,
      description: i.description,
      url: `/blocks#${i.name}`,
      group: "Blocks" as const,
    }));

  return [...docItems, ...blockItems, ...CHARTS, ...EXTRA].sort((a, b) => {
    const order: SearchGroup[] = ["Components", "Blocks", "Charts", "Guides"];
    const g = order.indexOf(a.group) - order.indexOf(b.group);
    return g !== 0 ? g : a.title.localeCompare(b.title);
  });
}
