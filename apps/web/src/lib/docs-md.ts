import type { CollectionEntry } from "astro:content";

const demoSources = import.meta.glob<string>("../demos/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
});

const registryJson = import.meta.glob<Record<string, unknown>>(
  "../../public/r/*.json",
  { eager: true }
);

/**
 * Converts a docs MDX entry to plain LLM-friendly Markdown:
 * strips imports, inlines demo sources for <ComponentPreview>, and appends
 * the full component source for component pages.
 */
export function entryToMarkdown(entry: CollectionEntry<"docs">): string {
  let body = entry.body ?? "";

  // Strip MDX import statements.
  body = body.replace(/^import\s.+?;?\s*$/gm, "");

  // Replace <ComponentPreview name="x-demo" /> with the demo source code.
  body = body.replace(
    /<ComponentPreview\s+name="([^"]+)"\s*\/>/g,
    (_match, name: string) => {
      const source = demoSources[`../demos/${name}.tsx`];
      if (!source) return "";
      return [
        "### Example",
        "",
        "```tsx",
        source
          .replaceAll("@/registry/ui/", "@/components/ui/")
          .replaceAll("@/registry/blocks/", "@/components/")
          .replaceAll("@/registry/lib/", "@/lib/")
          .trim(),
        "```",
      ].join("\n");
    }
  );

  const sections = [
    `# ${entry.data.title}`,
    "",
    entry.data.description,
    body.trim(),
  ];

  // For component pages, append the full source from the registry payload.
  if (entry.id.startsWith("components/")) {
    const name = entry.id.replace("components/", "");
    const payload = registryJson[`../../public/r/${name}.json`] as
      | { files?: { path: string; content: string }[] }
      | undefined;
    for (const file of payload?.files ?? []) {
      sections.push(
        "",
        `## Source (${file.path})`,
        "",
        "```tsx",
        file.content.trim(),
        "```"
      );
    }
  }

  return sections.join("\n") + "\n";
}
