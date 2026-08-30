export type {
  RegistryApiContract,
  RegistryApiExport,
  RegistryApiProp,
  RegistryItem,
  RegistryItemType,
} from "./types.ts"
import type { RegistryItem } from "./types.ts"
import { accessibilityFor } from "./accessibility.ts"
import { API_CONTRACTS } from "./api.generated.ts"

import { items as theme } from "./items/theme.ts"
import { items as core } from "./items/core.ts"
import { items as overlays } from "./items/overlays.ts"
import { items as forms } from "./items/forms.ts"
import { items as misc } from "./items/misc.ts"
import { items as motion } from "./items/motion.ts"
import { items as scroll } from "./items/scroll.ts"
import { items as charts } from "./items/charts.ts"
import { items as blocks } from "./items/blocks.ts"

const items: RegistryItem[] = [
  ...theme,
  ...core,
  ...overlays,
  ...forms,
  ...misc,
  ...motion,
  ...scroll,
  ...charts,
  ...blocks,
]

export const registry: RegistryItem[] = items.map((item) => {
  const accessibility = accessibilityFor(item.name)
  const api = item.type === "registry:ui" ? API_CONTRACTS[item.name] : undefined
  return {
    ...item,
    ...(accessibility ? { accessibility } : {}),
    ...(api ? { api } : {}),
  }
})
