import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import registryIndex from "../../public/r/index.json";

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.href ?? "https://ui.logic2b.dev/").replace(/\/$/, "");
  const docs = await getCollection("docs");

  const guides = docs.filter((d) => !d.id.startsWith("components/"));
  const components = docs.filter((d) => d.id.startsWith("components/"));

  const line = (d: (typeof docs)[number]) => {
    return `- [${d.data.title}](${base}/docs/${d.id}.md): ${d.data.description}`;
  };

  const body = [
    "# logic2b ui",
    "",
    "> Copy-paste React + Tailwind components with a shadcn-compatible registry,",
    "> optimized for Cloudflare and for consumption by LLMs and coding agents.",
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
    "## Optional",
    "",
    `- [Full documentation in one file](${base}/llms-full.txt)`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
