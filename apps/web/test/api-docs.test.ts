import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";

import { registry } from "@logic2b/registry/registry";

const docsDir = resolve("src/content/docs/components");
const docs = new Set(
  readdirSync(docsDir)
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => name.slice(0, -4)),
);
const uiItems = registry.filter((item) => item.type === "registry:ui");

describe("generated component API reference", () => {
  test("covers every registry UI item and its docs page", () => {
    assert.equal(uiItems.length, 71);
    for (const item of uiItems) {
      assert.ok(docs.has(item.name), `${item.name} should have a docs page`);
      assert.ok(item.api, `${item.name} should have generated API metadata`);
      assert.ok(item.api?.exports.length, `${item.name} should expose public exports`);
    }
  });

  test("does not retain hand-maintained API sections", () => {
    for (const name of docs) {
      const source = readFileSync(resolve(docsDir, `${name}.mdx`), "utf8");
      assert.doesNotMatch(source, /^## API\s*$/m, `${name} has a manual API section`);
    }
  });
});
