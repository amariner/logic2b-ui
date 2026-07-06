export type { RegistryItem, RegistryItemType } from "./types.ts"
import type { RegistryItem } from "./types.ts"

import { items as core } from "./items/core.ts"
import { items as overlays } from "./items/overlays.ts"
import { items as forms } from "./items/forms.ts"
import { items as misc } from "./items/misc.ts"
import { items as charts } from "./items/charts.ts"

export const registry: RegistryItem[] = [
  ...core,
  ...overlays,
  ...forms,
  ...misc,
  ...charts,
]
