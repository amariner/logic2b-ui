import { defineConfig } from "tsup"
import { readFileSync } from "node:fs"

// Private workspace packages and the review parser ship inlined; only the
// declared public runtime dependencies remain external. Retain Babel's notice.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node18",
  clean: true,
  banner: { js: `/*! @babel/parser (MIT)\n${readFileSync(new URL("../review/node_modules/@babel/parser/LICENSE", import.meta.url), "utf8")}*/` },
  noExternal: ["@logic2b/review", "@babel/parser", "@logic2b/scaffold", "@logic2b/tokens"],
})
