import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";

interface OgPage {
  id: string;
  title: string;
  image: string;
  bytes: number;
  sha256: string;
}

interface OgManifest {
  version: number;
  width: number;
  height: number;
  pages: OgPage[];
}

const docsDir = resolve("src/content/docs");
const docsEsDir = resolve("src/content/docs-es");
const outputDir = resolve("public/og/docs");
const manifest = JSON.parse(
  readFileSync(resolve(outputDir, "manifest.json"), "utf8"),
) as OgManifest;

function docsIds(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const id = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return docsIds(resolve(dir, entry.name), id);
    return entry.name.endsWith(".mdx") ? [id.slice(0, -4)] : [];
  });
}

function pngDimensions(buffer: Buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("generated documentation Open Graph images", () => {
  test("covers every docs route exactly once", () => {
    const expected = [
      ...docsIds(docsDir),
      ...docsIds(docsEsDir, "es"),
      "components/index",
    ].sort();
    assert.deepEqual(manifest.pages.map((page) => page.id).sort(), expected);
    assert.equal(new Set(manifest.pages.map((page) => page.id)).size, expected.length);
  });

  test("publishes valid deterministic 1200x630 PNGs", () => {
    assert.equal(manifest.version, 1);
    assert.equal(manifest.width, 1200);
    assert.equal(manifest.height, 630);
    for (const page of manifest.pages) {
      const path = resolve(outputDir, `${page.id}.png`);
      const png = readFileSync(path);
      assert.deepEqual(pngDimensions(png), { width: 1200, height: 630 });
      assert.equal(statSync(path).size, page.bytes);
      assert.equal(createHash("sha256").update(png).digest("hex"), page.sha256);
      assert.equal(page.image, `/og/docs/${page.id}.png`);
    }
  });
});
