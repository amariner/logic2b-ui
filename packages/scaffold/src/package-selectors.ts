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

/**
 * Registry channel resolved when an MCP caller omits `version`. The channel
 * is looked up in `/r/versions.json` and resolved to one exact release whose
 * manifest and content-addressed payloads are SHA-256 verified. It is
 * independent from the npm package channel above: moving one does not move
 * the other. The CLI keeps pinning the registry version it was built with.
 */
export const REGISTRY_DEFAULT_CHANNEL = "next" as const
