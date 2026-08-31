import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import { SPANISH_COMPONENT_LABELS } from "../src/config/docs.ts";

const read = (path: string) => readFileSync(resolve(path), "utf8");
function docsIds(dir: string, prefix = ""): string[] {
  return readdirSync(resolve(dir), { withFileTypes: true }).flatMap((entry) => {
    const id = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return docsIds(`${dir}/${entry.name}`, id);
    return entry.name.endsWith(".mdx") ? [id.slice(0, -4)] : [];
  });
}

const translatedIds = docsIds("src/content/docs-es").sort();
const translatedComponents = [
  "accordion",
  "alert",
  "alert-dialog",
  "avatar",
  "badge",
  "button",
  "card",
  "chart",
  "checkbox",
  "dialog",
  "dropdown-menu",
  "form",
  "input",
  "select",
  "sheet",
  "switch",
  "table",
  "tabs",
  "textarea",
  "tooltip",
];

describe("Spanish documentation", () => {
  test("publishes a deliberate two-wave translation set", () => {
    assert.deepEqual(translatedIds, [
      "3d-extras",
      "agent-benchmarks",
      "backend",
      "benchmarks",
      ...translatedComponents.map((name) => `components/${name}`),
      "cross-platform-tokens",
      "index",
      "installation",
      "integration-paths",
      "llms",
      "theming",
    ]);
    for (const id of translatedIds) {
      assert.ok(read(`src/content/docs-es/${id}.mdx`).includes("description:"));
      assert.ok(read(`src/content/docs/${id}.mdx`).includes("description:"));
    }
  });

  test("connects localized HTML, Markdown, agents and discovery surfaces", () => {
    for (const contract of [
      'lang={lang}',
      'rel="alternate"',
      'hreflang={alternateLang}',
    ]) {
      assert.ok(
        read("src/layouts/BaseLayout.astro").includes(contract),
        `missing locale contract: ${contract}`,
      );
    }
    for (const contract of ['locale="es"', 'ogId={`es/${entry.id}`}']) {
      assert.ok(
        read("src/pages/es/docs/[...slug].astro").includes(contract),
        `missing Spanish route contract: ${contract}`,
      );
    }
    for (const contract of [
      "ComponentPlayground",
      "ApiReference",
      "AccessibilityContract",
    ]) {
      assert.ok(
        read("src/pages/es/docs/[...slug].astro").includes(contract),
        `missing Spanish component route contract: ${contract}`,
      );
    }

    assert.match(read("src/lib/search-index.ts"), /spanishDocItems/);
    assert.match(read("src/lib/search-index.ts"), /startsWith\("components\/"\).*"Components"/);
    assert.match(read("src/layouts/DocsLayout.astro"), /spanishComponentDocs/);
    assert.match(read("src/components/PropPlayground.tsx"), /Restablecer propiedades/);
    assert.match(read("src/components/ApiReference.astro"), /Referencia de API/);
    assert.match(read("src/components/AccessibilityContract.astro"), /Contrato de accesibilidad/);
    assert.match(read("src/layouts/BaseLayout.astro"), /locale=\{lang\}/);
    assert.match(read("src/components/search/CommandMenu.tsx"), /Buscar documentación/);
    assert.match(read("src/pages/sitemap.xml.ts"), /spanishDocRoutes/);
    assert.match(read("src/pages/es/llms.txt.ts"), /documentación en español/);
    assert.match(read("src/pages/es/llms-full.txt.ts"), /entryToMarkdown/);
    assert.match(read("src/content/docs-es/integration-paths.mdx"), /IntegrationPaths locale="es"/);
    assert.match(read("src/content/docs-es/benchmarks.mdx"), /FrameworkBenchmarks locale="es"/);
    assert.match(read("src/content/docs-es/agent-benchmarks.mdx"), /AgentBenchmarkStatus locale="es"/);
    for (const contract of [
      "color-mix(in srgb",
      'frameloop="demand"',
      'aria-hidden="true"',
      "prefers-reduced-motion: reduce",
      "useGLTF.preload",
    ]) {
      assert.ok(
        read("src/content/docs-es/3d-extras.mdx").includes(contract),
        `missing Spanish 3D contract: ${contract}`,
      );
    }
    assert.match(
      read("scripts/generate-docs-og.mjs"),
      /page\.id\.startsWith\("es\/"\).*\/es\/docs\/\$\{page\.id\.slice/s,
    );
  });

  test("publishes twenty complete core component translations", () => {
    assert.deepEqual(Object.keys(SPANISH_COMPONENT_LABELS).sort(), translatedComponents);
    for (const name of translatedComponents) {
      const source = read(`src/content/docs-es/components/${name}.mdx`);
      const previews = source.match(/<ComponentPreview\b[^>]*\/>/g) ?? [];
      const installs = source.match(/<Install\b[^>]*\/>/g) ?? [];
      assert.ok(previews.length > 0, `${name} has no preview`);
      for (const preview of previews) assert.match(preview, /locale="es"/);
      assert.equal(installs.length, 1, `${name} must have one install surface`);
      assert.match(installs[0], new RegExp(`name="${name}"`));
      assert.match(installs[0], /locale="es"/);
    }

    const markdown = read("src/lib/docs-md.ts");
    assert.match(markdown, /entry\.collection === "docsEs"/);
    assert.match(markdown, /<Install\\b/);
  });
});
