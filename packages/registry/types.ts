export type RegistryItemType =
  | "registry:ui"
  | "registry:lib"
  | "registry:hook"
  | "registry:block"
  | "registry:style"
  | "registry:theme"

/** CSS custom properties shipped with a style/theme item, mirroring the
 *  shadcn registry-item schema. `theme` applies to both modes; `light`/`dark`
 *  scope to `:root` and `.dark`. */
export interface RegistryCssVars {
  theme?: Record<string, string>
  light?: Record<string, string>
  dark?: Record<string, string>
}

export interface RegistryItem {
  name: string
  type: RegistryItemType
  /** Human-facing name shown in docs/registry UIs. */
  title?: string
  description: string
  dependencies?: string[]
  registryDependencies?: string[]
  files?: { path: string; type: RegistryItemType }[]
  cssVars?: RegistryCssVars
  /** Raw CSS (e.g. @import, @custom-variant, @layer) merged into the app's stylesheet. */
  css?: Record<string, unknown>
  /** Categories for grouping (blocks, charts…). */
  categories?: string[]
  /** Extra install notes surfaced by the CLI. */
  docs?: string
}
