import { defineConfig } from "tsup"

// @logic2b/tokens is a private workspace package (the theme source of truth);
// it ships inlined in the published dist. The MCP SDK (in dependencies)
// remains external.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node18",
  clean: true,
  noExternal: ["@logic2b/tokens"],
})
