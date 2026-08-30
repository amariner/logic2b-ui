import manifest from "../package.json" with { type: "json" }

if (typeof manifest.version !== "string" || !manifest.version) {
  throw new Error("@logic2b/mcp package.json has no valid version")
}

export const PACKAGE_VERSION = manifest.version
