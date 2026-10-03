import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { DEFAULT_CONFIG, encodePreset } from "@logic2b/tokens"
import { buildScaffoldPlan } from "../src/scaffold.ts"
import { createServer } from "../src/server.ts"
import { committedRegistryFetch } from "./helpers/committed-registry.mts"
import { verifyRuleRefresh } from "./helpers/verify-rule-refresh.mts"

await createServer().close()
const root = await mkdtemp(join(tmpdir(), "logic2b-mcp-rules-refresh-"))
try {
  for (const [name, preset] of [["reference-defaults", undefined], ["selected-preset", encodePreset({ ...DEFAULT_CONFIG, iconLibrary: "tabler" })]] as const) {
    const plan = await buildScaffoldPlan({ base: "https://ui.logic2b.com", framework: "vite", starter: "auth", name,
      preset, fetchImpl: committedRegistryFetch })
    const target = join(root, name)
    for (const file of plan.files) {
      await mkdir(dirname(join(target, file.path)), { recursive: true })
      await writeFile(join(target, file.path), file.content)
    }
    await verifyRuleRefresh(target, plan)
    console.log(`✓ ${name}: MCP refresh preserves project text, validates preconditions and repeats unchanged`)
  }
} finally {
  await rm(root, { recursive: true, force: true })
}
