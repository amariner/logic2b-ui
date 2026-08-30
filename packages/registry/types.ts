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

export type AccessibilitySupport =
  | "native"
  | "primitive"
  | "authored"
  | "consumer"

export interface AccessibilityKeyInteraction {
  keys: string[]
  action: string
}

/** Machine-readable accessibility contract shipped with interactive or
 * semantically significant registry items. `consumer` is deliberately
 * separate from built-in behavior: it names what composition code still has
 * to provide (usually a contextual accessible name). */
export interface RegistryAccessibility {
  support: AccessibilitySupport
  pattern: string
  primitive?: string
  keyboard: AccessibilityKeyInteraction[]
  aria: string[]
  consumer: string[]
  limitations?: string[]
}

export type RegistryApiExportKind =
  | "component"
  | "hook"
  | "type"
  | "utility"

export interface RegistryApiProp {
  name: string
  type: string
  required: boolean
  default?: string
  description?: string
}

export interface RegistryApiExport {
  name: string
  kind: RegistryApiExportKind
  description?: string
  /** Source-level props expression, including inherited React/library props. */
  propsType?: string
  /** Props owned or defaulted by this wrapper, excluding generic pass-through props. */
  props?: RegistryApiProp[]
  /** Source expression when the export directly aliases another component. */
  aliasOf?: string
  /** Compact source definition for exported interfaces and type aliases. */
  definition?: string
  /** Callable signature for exported hooks and other public functions. */
  signature?: string
}

export interface RegistryApiContract {
  source: string
  exports: RegistryApiExport[]
}

export type RegistryApiContracts = Record<string, RegistryApiContract>

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
  accessibility?: RegistryAccessibility
  /** Generated from the public TypeScript exports in the item's UI source. */
  api?: RegistryApiContract
}
