import { getCollection } from "astro:content";

export type SearchIndexItem = {
  title: string;
  description: string;
  url: string;
  group: "Components" | "Docs";
};

export async function getSearchIndex(): Promise<SearchIndexItem[]> {
  const docs = await getCollection("docs");

  return docs
    .map((d) => ({
      title: d.data.title,
      description: d.data.description,
      url: `/docs/${d.id}`,
      group: (d.id.startsWith("components/") ? "Components" : "Docs") as
        | "Components"
        | "Docs",
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
