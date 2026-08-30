import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const guide = read("src/content/docs/3d-extras.mdx");

describe("3D extras guide", () => {
  test("keeps the heavy runtime optional and discoverable", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      dependencies: Record<string, string>;
    };

    for (const dependency of ["three", "@react-three/fiber", "@react-three/drei"]) {
      assert.equal(packageJson.dependencies[dependency], undefined);
      assert.match(guide, new RegExp(dependency.replace("/", "\\/")));
    }

    assert.match(read("src/config/docs.ts"), /3D extras.*\/docs\/3d-extras/);
    assert.match(read("src/content/docs/index.mdx"), /\[3D extras\]\(\/docs\/3d-extras\)/);
  });

  test("locks the token, performance and accessibility contracts", () => {
    for (const contract of [
      "color-mix(in srgb",
      "SRGBColorSpace",
      'frameloop="demand"',
      "dpr={[1, 1.5]}",
      'aria-hidden="true"',
      'role="status"',
      "prefers-reduced-motion: reduce",
      "product-poster.webp",
      "useGLTF.preload",
      "client:visible",
      "ssr: false",
    ]) {
      assert.ok(guide.includes(contract), `missing 3D contract: ${contract}`);
    }

    assert.match(guide, /r3f\.docs\.pmnd\.rs\/advanced\/scaling-performance/);
    assert.match(guide, /threejs\.org\/manual\/en\/color-management\.html/);
  });
});
