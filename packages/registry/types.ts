export type RegistryItemType =
  | "registry:ui"
  | "registry:lib"
  | "registry:block"
  | "registry:chart"

export interface RegistryItem {
  name: string
  type: RegistryItemType
  description: string
  dependencies?: string[]
  registryDependencies?: string[]
  files: { path: string; type: RegistryItemType }[]
}
