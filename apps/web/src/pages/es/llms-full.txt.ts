import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { entryToMarkdown } from "@/lib/docs-md";

export const GET: APIRoute = async () => {
  const docs = (await getCollection("docsEs")).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  return new Response(docs.map(entryToMarkdown).join("\n---\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
