import { buildAgentsMd as buildSharedAgentsMd } from "@logic2b/scaffold/rules"
import type { ThemeConfig } from "@logic2b/tokens"
import registryIndex from "../../public/r/index.json"

/** Studio compatibility adapter; generator and inventory contract are shared. */
export function buildAgentsMd(cfg: ThemeConfig): string {
  return buildSharedAgentsMd(cfg, registryIndex)
}
