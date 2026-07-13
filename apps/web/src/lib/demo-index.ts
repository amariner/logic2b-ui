/**
 * Demo index — the docs' usage examples as machine-readable data.
 *
 * The site renders 150+ demo components (src/demos/*.tsx) inside
 * <ComponentPreview>. This module maps each demo to its registry item and
 * rewrites the internal `@/registry/*` imports to the paths an installed
 * project uses, so /r/demos/*.json (and the MCP `get_demo` tool) can serve
 * copy-paste-ready examples.
 */

import registryIndex from "../../public/r/index.json";

const demoSources = import.meta.glob<string>("../demos/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
});

export interface DemoEntry {
  /** Demo name, e.g. "accordion-controlled-demo". */
  name: string;
  /** Registry item the demo belongs to, e.g. "accordion". */
  item: string;
  content: string;
}

/** Registry item names, longest first so "alert-dialog-demo" matches
 *  "alert-dialog" before "alert". */
const itemNames = (registryIndex as { name: string }[])
  .map((i) => i.name)
  .sort((a, b) => b.length - a.length);

function itemFor(demoName: string): string | undefined {
  return itemNames.find((n) => demoName === `${n}-demo` || demoName.startsWith(`${n}-`));
}

function transform(source: string): string {
  return source
    .replaceAll("@/registry/ui/", "@/components/ui/")
    .replaceAll("@/registry/blocks/", "@/components/")
    .replaceAll("@/registry/lib/", "@/lib/")
    .trim();
}

let cache: DemoEntry[] | undefined;

/** Every component demo with its item and installed-project source. */
export function getDemos(): DemoEntry[] {
  if (!cache) {
    cache = Object.entries(demoSources)
      .map(([path, source]) => {
        const name = path.replace("../demos/", "").replace(".tsx", "");
        const item = itemFor(name);
        return item ? { name, item, content: transform(source) } : undefined;
      })
      .filter((d): d is DemoEntry => d !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return cache;
}

/** Item → demo names, for the /r/demos/index.json payload. */
export function getDemoIndex(): { item: string; demos: string[] }[] {
  const byItem = new Map<string, string[]>();
  for (const demo of getDemos()) {
    const list = byItem.get(demo.item) ?? [];
    list.push(demo.name);
    byItem.set(demo.item, list);
  }
  return [...byItem.entries()]
    .map(([item, demos]) => ({ item, demos }))
    .sort((a, b) => a.item.localeCompare(b.item));
}
