import {
  buildScaffoldPlan as buildSharedScaffoldPlan,
  SCAFFOLD_FRAMEWORKS,
  SCAFFOLD_STARTERS,
  SCAFFOLD_STARTER_DEFINITIONS,
  type ScaffoldFramework,
  type ScaffoldPlan,
  type ScaffoldPlanOptions as SharedScaffoldPlanOptions,
  type ScaffoldStarter,
} from "@logic2b/scaffold"

import { buildInstallPlan } from "./plan.ts"
import type { FetchLike } from "./registry.ts"

export {
  SCAFFOLD_FRAMEWORKS,
  SCAFFOLD_STARTERS,
  SCAFFOLD_STARTER_DEFINITIONS,
  type ScaffoldFramework,
  type ScaffoldPlan,
  type ScaffoldStarter,
}

export interface ScaffoldPlanOptions
  extends Omit<SharedScaffoldPlanOptions, "resolveInstallPlan"> {
  fetchImpl?: FetchLike
}

/** MCP adapter over the shared scaffold composer. */
export async function buildScaffoldPlan(
  options: ScaffoldPlanOptions,
): Promise<ScaffoldPlan> {
  return buildSharedScaffoldPlan({
    ...options,
    resolveInstallPlan: (names, installOptions) =>
      buildInstallPlan(names, {
        ...installOptions,
        fetchImpl: options.fetchImpl,
      }),
  })
}
