import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { DEFAULT_CONFIG, encodePreset } from "../src/index.ts"
import { portableTokenBundle, tokensStudioBundle } from "../src/export.ts"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = resolve(packageRoot, "../../apps/web/public/tokens/default")
const manifest = JSON.parse(
  await readFile(resolve(outDir, "manifest.json"), "utf8"),
) as {
  schemaVersion?: number
  preset?: string
  generator?: string
  files?: Record<string, string>
}

const errors: string[] = []
if (manifest.schemaVersion !== 1) errors.push("manifest schemaVersion must be 1")
if (manifest.preset !== encodePreset(DEFAULT_CONFIG)) {
  errors.push("manifest preset does not match DEFAULT_CONFIG")
}
if (manifest.generator !== "style-dictionary@5.5.2") {
  errors.push("manifest generator does not match the pinned Style Dictionary")
}

for (const [path, expected] of Object.entries(manifest.files ?? {})) {
  if (path.startsWith("/") || path.split("/").includes("..")) {
    errors.push(`unsafe artifact path: ${path}`)
    continue
  }
  const content = await readFile(resolve(outDir, path), "utf8")
  const actual = `sha256-${createHash("sha256").update(content).digest("base64")}`
  if (actual !== expected) errors.push(`integrity drift: ${path}`)
  if ((path.endsWith(".swift") || path.endsWith(".xml")) && content.includes("oklch(")) {
    errors.push(`native artifact still contains oklch: ${path}`)
  }
}

const generatedBundle = JSON.parse(
  await readFile(resolve(outDir, "logic2b.tokens.json"), "utf8"),
)
if (JSON.stringify(generatedBundle) !== JSON.stringify(portableTokenBundle(DEFAULT_CONFIG))) {
  errors.push("DTCG token bundle is stale; run pnpm --filter @logic2b/tokens build")
}

const generatedTokensStudioBundle = JSON.parse(
  await readFile(resolve(outDir, "logic2b.tokens-studio.json"), "utf8"),
)
if (
  JSON.stringify(generatedTokensStudioBundle) !==
  JSON.stringify(tokensStudioBundle(DEFAULT_CONFIG))
) {
  errors.push(
    "Tokens Studio bundle is stale; run pnpm --filter @logic2b/tokens build",
  )
}

if (errors.length > 0) {
  throw new Error(`Portable token exports failed:\n- ${errors.join("\n- ")}`)
}
console.log(
  `✓ portable token exports verified: ${Object.keys(manifest.files ?? {}).length} files, integrity + source parity`,
)
