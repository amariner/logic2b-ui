import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { entryToMarkdown } from "@/lib/docs-md";

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection("docs");
  return docs.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
};

export const GET: APIRoute = ({ props }) => {
  return new Response(entryToMarkdown(props.entry), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
