import { defineConfig } from "tsup"

// Private workspace packages and the review parser ship inlined in the
// published dist. Only declared public runtime dependencies stay external.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node18",
  clean: true,
  noExternal: ["@logic2b/scaffold", "@logic2b/tokens", "@logic2b/review", "@babel/parser"],
})
