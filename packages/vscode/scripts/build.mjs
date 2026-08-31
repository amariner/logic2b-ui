import { build } from "esbuild"

await build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
  outfile: "dist/extension.js",
  sourcemap: false,
  minify: true,
  legalComments: "none",
})

console.log("✓ VS Code extension bundled → dist/extension.js")
