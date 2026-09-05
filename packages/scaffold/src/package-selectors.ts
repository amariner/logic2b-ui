/** Public beta package policy. Registry versions are a separate selector. */
export const PACKAGE_CHANNEL = "next" as const
export const CLI_PACKAGE_SELECTOR = `logic2b@${PACKAGE_CHANNEL}`
export const MCP_PACKAGE_SELECTOR = `@logic2b/mcp@${PACKAGE_CHANNEL}`
export const PACKAGE_RUNNERS = {
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
  bun: "bunx",
} as const
