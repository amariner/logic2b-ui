import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { entryToMarkdown } from "@/lib/docs-md";

export const GET: APIRoute = async () => {
  const docs = await getCollection("docs");
  // Guides first, then components alphabetically.
  const sorted = [
    ...docs.filter((d) => !d.id.startsWith("components/")),
    ...docs
      .filter((d) => d.id.startsWith("components/"))
      .sort((a, b) => a.id.localeCompare(b.id)),
  ];

  const body = sorted.map(entryToMarkdown).join("\n---\n\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
