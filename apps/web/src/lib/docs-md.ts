import type { CollectionEntry } from "astro:content";
import type { RegistryApiContract } from "@logic2b/registry/types";
import { integrationPathsMarkdown } from "@/data/integration-paths";

const demoSources = import.meta.glob<string>("../demos/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
});
const chartSources = import.meta.glob<string>(
  "../../../../packages/registry/src/charts/*.tsx",
  { query: "?raw", import: "default", eager: true },
);

const registryJson = import.meta.glob<Record<string, unknown>>(
  "../../public/r/*.json",
  { eager: true }
);

function tableCell(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function apiReferenceMarkdown(
  name: string,
  contract: RegistryApiContract,
  locale: "en" | "es",
): string {
  const copy = locale === "es"
    ? {
        title: "Referencia de API",
        generated: "Generada a partir de las exportaciones públicas de TypeScript en",
        alias: "Alias directo de",
        prop: "Propiedad",
        type: "Tipo",
        required: "Obligatoria",
        default: "Valor predeterminado",
        description: "Descripción",
        yes: "Sí",
        no: "No",
      }
    : {
        title: "API reference",
        generated: "Generated from the public TypeScript exports in",
        alias: "Direct alias of",
        prop: "Prop",
        type: "Type",
        required: "Required",
        default: "Default",
        description: "Description",
        yes: "Yes",
        no: "No",
      };
  const lines = [
    `## ${copy.title}`,
    "",
    `${copy.generated} \`${contract.source}\`. JSON: [\`/r/${name}.json#api\`](/r/${name}.json#api).`,
  ];

  for (const entry of contract.exports) {
    lines.push("", `### ${entry.name} (${entry.kind})`);
    if (entry.description) lines.push("", entry.description);
    if (entry.aliasOf) lines.push("", `${copy.alias} \`${entry.aliasOf}\`.`);
    if (entry.propsType) lines.push("", `Props: \`${entry.propsType}\``);
    if (entry.signature) lines.push("", "```ts", entry.signature, "```");
    if (entry.definition) lines.push("", "```ts", entry.definition, "```");
    if (entry.props?.length) {
      lines.push(
        "",
        `| ${copy.prop} | ${copy.type} | ${copy.required} | ${copy.default} | ${copy.description} |`,
        "| --- | --- | --- | --- | --- |",
        ...entry.props.map(
          (prop) =>
            `| \`${tableCell(prop.name)}\` | \`${tableCell(prop.type)}\` | ${prop.required ? copy.yes : copy.no} | ${prop.default ? `\`${tableCell(prop.default)}\`` : "—"} | ${prop.description ? tableCell(prop.description) : "—"} |`,
        ),
      );
    }
  }
  return lines.join("\n");
}

/**
 * Converts a docs MDX entry to plain LLM-friendly Markdown:
 * strips imports, inlines demo sources for <ComponentPreview>, and appends
 * the full component source for component pages.
 */
export function entryToMarkdown(
  entry: CollectionEntry<"docs"> | CollectionEntry<"docsEs">,
): string {
  let body = entry.body ?? "";
  const locale = entry.collection === "docsEs" ? "es" : "en";

  // Strip MDX import statements.
  body = body.replace(/^import\s.+?;?\s*$/gm, "");

  // Replace component previews (including wide/install/locale props) with source.
  body = body.replace(
    /<ComponentPreview\b[^>]*\bname="([^"]+)"[^>]*\/>/g,
    (_match, name: string) => {
      const source =
        demoSources[`../demos/${name}.tsx`] ??
        chartSources[`../../../../packages/registry/src/charts/${name}.tsx`];
      if (!source) return "";
      return [
        locale === "es" ? "### Ejemplo" : "### Example",
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

  // Installation widgets become deterministic commands in agent-facing Markdown.
  body = body.replace(
    /<Install\b[^>]*\bname="([^"]+)"[^>]*\/>/g,
    (_match, name: string) => [
      "```bash",
      name === "theme"
        ? "npx logic2b@latest init"
        : `npx logic2b@latest add ${name}`,
      "```",
    ].join("\n"),
  );

  // Keep the human comparison matrix and its agent-readable twin on the same
  // typed source instead of leaking an unresolved Astro component into .md.
  body = body.replace(
    /<IntegrationPaths(?:\s+locale="(es)")?\s*\/>/g,
    (_match, locale: "es" | undefined) => integrationPathsMarkdown(locale ?? "en"),
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
      | {
          api?: RegistryApiContract;
          files?: { path: string; content: string }[];
        }
      | undefined;
    if (payload?.api) sections.push("", apiReferenceMarkdown(name, payload.api, locale));
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
