import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import registryIndex from "../../public/r/index.json";

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.href ?? "https://ui.logic2b.com/").replace(/\/$/, "");
  const docs = await getCollection("docs");

  const guides = docs.filter((d) => !d.id.startsWith("components/"));
  const components = docs.filter((d) => d.id.startsWith("components/"));

  const line = (d: (typeof docs)[number]) => {
    return `- [${d.data.title}](${base}/docs/${d.id}.md): ${d.data.description}`;
  };

  type RegistryEntry = {
    name: string;
    type: string;
    title?: string;
    description: string;
    categories?: string[];
  };
  const registry = registryIndex as RegistryEntry[];
  const isChart = (i: RegistryEntry) => i.categories?.includes("charts");

  // Point agents at each item's installable JSON payload (metadata + source).
  const registryLine = (i: RegistryEntry) =>
    `- [${i.title ?? i.name}](${base}/r/${i.name}.json): ${i.description}`;

  const blocks = registry.filter(
    (i) => i.type === "registry:block" && !isChart(i),
  );
  const charts = registry.filter(
    (i) => i.type === "registry:block" && isChart(i),
  );

  const body = [
    "# logic2b ui",
    "",
    "> Copy-paste UI components with an open JSON registry, designed for",
    "> consumption by LLMs and coding agents.",
    "",
    "Every docs page is available as plain Markdown by appending `.md` to its URL.",
    `The registry index is at ${base}/r/index.json and each component's full`,
    `payload (metadata + source) at ${base}/r/<name>.json.`,
    "",
    "## Docs",
    "",
    ...guides.map(line),
    "",
    "## Components",
    "",
    ...components.map(line),
    "",
    "## Blocks",
    "",
    "Full sections and layouts, installable with `npx logic2b add <name>`.",
    "Each link is the item's JSON payload (metadata + source).",
    "",
    ...blocks.map(registryLine),
    "",
    "## Charts",
    "",
    "Recharts-based charts, installable with `npx logic2b add <name>`.",
    "",
    ...charts.map(registryLine),
    "",
    "## Optional",
    "",
    `- [Full documentation in one file](${base}/llms-full.txt)`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
