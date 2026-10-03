import { buildStudioAgentsMd, type RuleCatalogEntry } from "@logic2b/scaffold/rules"
import { BEHAVIOR_CONTRACTS } from "@logic2b/registry/behavior"
import type { ThemeConfig } from "@logic2b/tokens"
import registryIndex from "../../public/r/index.json"

/** Studio parity shim; installed-rule plans use the same shared package. */
export function buildAgentsMd(cfg: ThemeConfig): string {
  return buildStudioAgentsMd(cfg, registryIndex as RuleCatalogEntry[], BEHAVIOR_CONTRACTS)
}
