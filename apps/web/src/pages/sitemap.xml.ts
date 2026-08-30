import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import registryIndex from "../../public/r/index.json";

const SITE = "https://ui.logic2b.com";

/** Self-contained sitemap: static routes + every docs page + blocks + charts.
 *  No integration dependency — just enumerate the routes we actually ship. */
export const GET: APIRoute = async () => {
  const [docs, docsEs] = await Promise.all([
    getCollection("docs"),
    getCollection("docsEs"),
  ]);

  const staticRoutes = [
    "/",
    "/docs",
    "/docs/components",
    "/blocks",
    "/demos",
    "/create",
    "/charts/area",
    "/charts/bar",
    "/charts/line",
    "/charts/pie",
    "/charts/radar",
    "/charts/radial",
  ];

  const docRoutes = docs.map((d) =>
    d.id === "index" ? "/docs" : `/docs/${d.id}`,
  );
  const spanishDocRoutes = docsEs.map((d) =>
    d.id === "index" ? "/es/docs" : `/es/docs/${d.id}`,
  );

  // Charts are registry:block but live under /charts, not /blocks/preview.
  const blockRoutes = registryIndex
    .filter(
      (i: { type: string; categories?: string[] }) =>
        i.type === "registry:block" && !i.categories?.includes("charts"),
    )
    .map((i: { name: string }) => `/blocks/preview/${i.name}`);

  const urls = [
    ...new Set([
      ...staticRoutes,
      ...docRoutes,
      ...spanishDocRoutes,
      ...blockRoutes,
    ]),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${SITE}${u}</loc></url>`)
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
