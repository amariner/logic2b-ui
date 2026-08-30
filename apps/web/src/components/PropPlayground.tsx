import * as React from "react"

import {
  PLAYGROUND_RECIPES,
  type PlaygroundControl,
  type PlaygroundDateValue,
  type PlaygroundName,
  type PlaygroundNode,
  type PlaygroundRecipe,
  type PlaygroundValue,
} from "@/data/playground-recipes"

type PlaygroundComponent = React.ComponentType<Record<string, unknown>>
type PlaygroundModule = Record<string, unknown>
type PlaygroundLoader = () => Promise<PlaygroundModule>
type PlaygroundDependencies = {
  registry: PlaygroundModule
  recharts: PlaygroundModule
  sonner: PlaygroundModule
}

const modules = import.meta.glob<PlaygroundModule>(
  "../../../../packages/registry/src/ui/*.tsx",
)

function usePlaygroundReady(
  setReady: React.Dispatch<React.SetStateAction<boolean>>,
) {
  React.useEffect(() => {
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [setReady])
}

function isDateValue(value: PlaygroundValue): value is PlaygroundDateValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "$type" in value &&
    value.$type === "date" &&
    "value" in value &&
    typeof value.value === "string"
  )
}

function dateParts(value: PlaygroundDateValue): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.value)
  if (!match) throw new Error(`Invalid playground date: ${value.value}`)
  return [Number(match[1]), Number(match[2]) - 1, Number(match[3])]
}

function expressionFor(value: PlaygroundValue): string {
  if (isDateValue(value)) {
    return `new Date(${dateParts(value).join(", ")})`
  }
  if (Array.isArray(value)) {
    return `[${value.map(expressionFor).join(", ")}]`
  }
  if (typeof value === "object" && value !== null) {
    return `{ ${Object.entries(value)
      .map(([key, entry]) => `${JSON.stringify(key)}: ${expressionFor(entry)}`)
      .join(", ")} }`
  }
  return JSON.stringify(value)
}

function materialize(value: PlaygroundValue): unknown {
  if (isDateValue(value)) return new Date(...dateParts(value))
  if (Array.isArray(value)) return value.map(materialize)
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, materialize(entry)]),
    )
  }
  return value
}

function formatProp(name: string, value: PlaygroundValue): string {
  if (value === true) return name
  if (typeof value === "string") return `${name}=${JSON.stringify(value)}`
  return `${name}={${expressionFor(value)}}`
}

function sourceFor(
  exportName: string,
  props: Readonly<Record<string, PlaygroundValue>>,
  children?: string,
  options?: readonly { value: string; label: string }[],
): string {
  const attributes = Object.entries(props)
    .filter(([, value]) => value !== false)
    .map(([name, value]) => `  ${formatProp(name, value)}`)
    .join("\n")
  const open = attributes ? `<${exportName}\n${attributes}\n>` : `<${exportName}>`

  if (options) {
    const optionLines = options
      .map(({ value, label }) => `  <option value=${JSON.stringify(value)}>${label}</option>`)
      .join("\n")
    return `${open}\n${optionLines}\n</${exportName}>`
  }
  if (children) return `${open}${children}</${exportName}>`
  return attributes ? open.replace(/>$/, " />") : `<${exportName} />`
}

function formSourceFor(
  state: Readonly<Record<string, PlaygroundValue>>,
): string {
  const placeholder = expressionFor(state.placeholder ?? "")
  const description = expressionFor(state.description ?? "")
  const disabled = state.disabled === true ? "\n                  disabled" : ""

  return `const form = useForm({
  defaultValues: { username: "" },
})

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(console.log)}>
      <FormField
        control={form.control}
        name="username"
        rules={{ required: "Username is required." }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={${placeholder}}${disabled}
              />
            </FormControl>
            <FormDescription>{${description}}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit"${state.disabled === true ? " disabled" : ""}>Save profile</Button>
    </form>
  </Form>
)`
}

function pickRootValues(
  recipe: PlaygroundRecipe,
  state: Readonly<Record<string, PlaygroundValue>>,
): Record<string, PlaygroundValue> {
  if (!recipe.rootProps) return { ...state }
  return Object.fromEntries(
    recipe.rootProps.map((name) => [name, state[name]]),
  ) as Record<string, PlaygroundValue>
}

function pickRootProps(
  recipe: PlaygroundRecipe,
  state: Readonly<Record<string, PlaygroundValue>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(pickRootValues(recipe, state)).map(([name, value]) => [
      name,
      materialize(value),
    ]),
  )
}

function nodeValues(
  node: PlaygroundNode,
  state: Readonly<Record<string, PlaygroundValue>>,
): Record<string, PlaygroundValue> {
  const props = { ...node.props }
  for (const [prop, stateKey] of Object.entries(node.bindings ?? {})) {
    props[prop] = state[stateKey]
  }
  return props
}

function nodeProps(
  node: PlaygroundNode,
  state: Readonly<Record<string, PlaygroundValue>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(nodeValues(node, state)).map(([name, value]) => [
      name,
      materialize(value),
    ]),
  )
}

function nodeSource(
  node: PlaygroundNode,
  state: Readonly<Record<string, PlaygroundValue>>,
  depth = 0,
): string {
  const name = node.exportName ?? node.element
  if (!name) throw new Error("A playground composition node needs an exportName or element.")

  const indent = "  ".repeat(depth)
  const props = nodeValues(node, state)
  const attributes = [
    ...Object.entries(props)
    .filter(([, value]) => value !== false && value !== undefined)
    .map(([prop, value]) => `${indent}  ${formatProp(prop, value)}`),
    ...(node.action
      ? [
          `${indent}  ${node.action.event}={() => toast(${JSON.stringify(node.action.message)})}`,
        ]
      : []),
  ]
    .join("\n")
  const open = attributes ? `${indent}<${name}\n${attributes}\n${indent}>` : `${indent}<${name}>`

  if (typeof node.children === "string") {
    return `${open}${node.children}</${name}>`
  }
  if (node.children?.length) {
    const children = node.children
      .map((child) => nodeSource(child, state, depth + 1))
      .join("\n")
    return `${open}\n${children}\n${indent}</${name}>`
  }
  return attributes
    ? open.replace(/>$/, " />")
    : `${indent}<${name} />`
}

function composedSourceFor(
  recipe: PlaygroundRecipe,
  state: Readonly<Record<string, PlaygroundValue>>,
): string {
  return nodeSource(
    {
      ...(recipe.rootElement
        ? { element: recipe.rootElement }
        : { exportName: recipe.exportName }),
      props: pickRootValues(recipe, state),
      children: recipe.composition,
    },
    state,
  )
}

function moduleComponent(
  module: PlaygroundModule,
  exportName: string,
  recipeName: string,
): React.ElementType {
  const component = module[exportName]
  if (typeof component !== "function" && typeof component !== "object") {
    throw new Error(
      `Registry export ${exportName} was not found in ${recipeName}.`,
    )
  }
  return component as React.ElementType
}

function moduleForNode(
  dependencies: PlaygroundDependencies,
  node: PlaygroundNode,
): PlaygroundModule {
  return node.module === "recharts"
    ? dependencies.recharts
    : dependencies.registry
}

function nodesUse(
  nodes: readonly PlaygroundNode[] | undefined,
  predicate: (node: PlaygroundNode) => boolean,
): boolean {
  return Boolean(
    nodes?.some(
      (node) =>
        predicate(node) ||
        (Array.isArray(node.children) && nodesUse(node.children, predicate)),
    ),
  )
}

function renderNode(
  dependencies: PlaygroundDependencies,
  node: PlaygroundNode,
  state: Readonly<Record<string, PlaygroundValue>>,
  recipeName: string,
  key: string,
): React.ReactNode {
  const Component = node.exportName
    ? moduleComponent(moduleForNode(dependencies, node), node.exportName, recipeName)
    : node.element
  if (!Component) {
    throw new Error(`A composition node in ${recipeName} has no component.`)
  }
  const children =
    typeof node.children === "string" || node.children === undefined
      ? node.children
      : node.children.map((child, index) =>
        renderNode(dependencies, child, state, recipeName, `${key}.${index}`),
      )

  const actionProps = node.action
    ? {
        [node.action.event]: () => {
          const toast = dependencies.sonner.toast
          if (typeof toast !== "function") {
            throw new Error(`Toast action is unavailable in ${recipeName}.`)
          }
          toast(node.action?.message)
        },
      }
    : {}

  return React.createElement(
    Component,
    { key, ...nodeProps(node, state), ...actionProps },
    children,
  )
}

function controlValue(value: PlaygroundValue): string | number {
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === "string" || typeof first === "number" ? first : ""
  }
  if (value === null || typeof value === "boolean" || typeof value === "object") {
    return ""
  }
  return value
}

function PlaygroundControlField({
  control,
  value,
  onChange,
  locale,
}: {
  control: PlaygroundControl
  value: PlaygroundValue
  onChange: (value: PlaygroundValue) => void
  locale: "en" | "es"
}) {
  const id = `playground-${control.prop}`
  const spanishLabels: Record<string, string> = {
    Variant: "Variante",
    Size: "Tamaño",
    Disabled: "Desactivado",
    Width: "Anchura",
    Open: "Abierto",
    "Chart size": "Tamaño del gráfico",
    Placeholder: "Texto de ejemplo",
    Description: "Descripción",
  }
  const spanishOptions: Record<string, string> = {
    Small: "Pequeño",
    Medium: "Mediano",
    Large: "Grande",
    "Extra small": "Muy pequeño",
    Compact: "Compacto",
    Default: "Predeterminado",
    Wide: "Ancho",
  }
  const label = locale === "es" ? spanishLabels[control.label] ?? control.label : control.label

  if (control.kind === "boolean") {
    return (
      <label className="flex min-h-9 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
        <span>{label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
          className="size-4 accent-primary"
        />
      </label>
    )
  }

  return (
    <label className="grid gap-1.5 text-sm" htmlFor={id}>
      <span className="font-medium">{label}</span>
      {control.kind === "select" ? (
        <select
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>
              {locale === "es" ? spanishOptions[option.label] ?? option.label : option.label}
            </option>
          ))}
        </select>
      ) : control.kind === "code" ? (
        <textarea
          id={id}
          value={String(value)}
          maxLength={control.maxLength}
          rows={5}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs"
        />
      ) : (
        <input
          id={id}
          type={control.kind}
          value={controlValue(value)}
          min={control.kind === "number" ? control.min : undefined}
          max={control.kind === "number" ? control.max : undefined}
          step={control.kind === "number" ? control.step : undefined}
          maxLength={control.kind === "text" ? control.maxLength : undefined}
          onChange={(event) => {
            if (control.kind === "number") {
              const next = event.currentTarget.valueAsNumber
              if (!Number.isFinite(next)) return
              onChange(control.array ? [next] : next)
            } else {
              onChange(event.currentTarget.value)
            }
          }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
      )}
    </label>
  )
}

export function PropPlayground({
  name,
  locale = "en",
}: {
  name: PlaygroundName
  locale?: "en" | "es"
}) {
  const recipe: PlaygroundRecipe = PLAYGROUND_RECIPES[name]
  const loader = modules[`../../../../packages/registry/src/ui/${name}.tsx`] as
    | PlaygroundLoader
    | undefined
  const [previewReady, setPreviewReady] = React.useState(false)
  const Component = React.useMemo(
    () =>
      loader
        ? React.lazy(async () => {
            if (recipe.adapter === "form") {
              const adapter = await import("./playground-form")
              const PlaygroundAdapter: PlaygroundComponent = (state) => {
                usePlaygroundReady(setPreviewReady)
                return React.createElement(
                  adapter.default as unknown as PlaygroundComponent,
                  state,
                )
              }
              return {
                default: PlaygroundAdapter,
              }
            }
            const needsRecharts = nodesUse(
              recipe.composition,
              (node) => node.module === "recharts",
            )
            const needsSonner = nodesUse(
              recipe.composition,
              (node) => node.action?.type === "toast",
            )
            const [module, recharts, sonner] = await Promise.all([
              loader(),
              needsRecharts
                ? import("./playground-recharts")
                : Promise.resolve({}),
              needsSonner ? import("sonner") : Promise.resolve({}),
            ])
            const dependencies: PlaygroundDependencies = {
              registry: module,
              recharts,
              sonner,
            }
            const Root = recipe.rootElement
              ? recipe.rootElement
              : moduleComponent(module, recipe.exportName, name)
            const PlaygroundComposition: PlaygroundComponent = (state) => {
              usePlaygroundReady(setPreviewReady)
              const values = state as Record<string, PlaygroundValue>
              const children = recipe.composition
                ? recipe.composition.map((node, index) =>
                    renderNode(dependencies, node, values, name, String(index)),
                  )
                : recipe.options
                  ? recipe.options.map(({ value, label }) =>
                      React.createElement("option", { key: value, value }, label),
                    )
                  : recipe.children
              return React.createElement(
                Root,
                pickRootProps(recipe, values),
                children,
              )
            }
            return { default: PlaygroundComposition }
          })
        : null,
    [loader, name, recipe],
  )
  const [props, setProps] = React.useState<Record<string, PlaygroundValue>>(
    () => ({ ...recipe.initialProps }),
  )
  const [copyStatus, setCopyStatus] = React.useState<
    "idle" | "copied" | "failed"
  >("idle")
  const source = recipe.adapter === "form"
    ? formSourceFor(props)
    : recipe.composition
      ? composedSourceFor(recipe, props)
      : sourceFor(recipe.exportName, props, recipe.children, recipe.options)

  const update = (prop: string, value: PlaygroundValue) => {
    setProps((current) => ({ ...current, [prop]: value }))
  }

  const copy = async () => {
    const textarea = document.createElement("textarea")
    textarea.value = source
    textarea.readOnly = true
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    document.body.append(textarea)
    textarea.select()

    // Keep the legacy path inside the original click task: Safari and embedded
    // previews can revoke user activation after an awaited clipboard rejection.
    let success = false
    try {
      success = document.execCommand("copy")
    } catch {
      success = false
    }
    textarea.remove()
    try {
      if (!success && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(source)
        success = true
      }
    } catch {
      success = false
    }
    setCopyStatus(success ? "copied" : "failed")
    window.setTimeout(() => setCopyStatus("idle"), 1_500)
  }

  return (
    <div className="grid overflow-hidden rounded-xl border lg:grid-cols-[17rem_minmax(0,1fr)]">
      <form
        className="grid content-start gap-4 border-b bg-muted/20 p-4 lg:border-b-0 lg:border-r"
        onSubmit={(event) => event.preventDefault()}
      >
        {recipe.controls.map((control) => (
          <PlaygroundControlField
            key={control.prop}
            control={control}
            value={props[control.prop] ?? ""}
            onChange={(value) => update(control.prop, value)}
            locale={locale}
          />
        ))}
        <button
          type="button"
          className="btn btn-sm btn-outline mt-1"
          onClick={() => setProps({ ...recipe.initialProps })}
        >
          {locale === "es" ? "Restablecer propiedades" : "Reset props"}
        </button>
      </form>

      <div className="min-w-0">
        <div className="flex min-h-64 items-center justify-center p-8">
          <React.Suspense
            fallback={<div className="h-10 w-40 animate-pulse rounded-md bg-muted" role="status" aria-label={locale === "es" ? `Cargando el playground de ${name}` : `Loading ${name} playground`} />}
          >
            {Component ? (
              <div
                className={recipe.previewClassName}
                data-playground-ready={previewReady ? name : undefined}
              >
                {React.createElement(
                  Component,
                  { key: JSON.stringify(props), ...props },
                )}
              </div>
            ) : (
              <p className="text-sm text-destructive">{locale === "es" ? "No se ha encontrado el módulo del playground." : "Playground module not found."}</p>
            )}
          </React.Suspense>
        </div>
        <div className="border-t bg-[#0d1117] text-[#e6edf3]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <span className="text-xs font-medium text-white/60">{locale === "es" ? "JSX generado" : "Generated JSX"}</span>
            <button
              type="button"
              aria-label={locale === "es" ? `Copiar el JSX generado de ${recipe.exportName}` : `Copy ${recipe.exportName} generated JSX`}
              className="text-xs font-medium text-white/80 hover:text-white"
              onClick={copy}
            >
              <span aria-live="polite">
                {copyStatus === "copied"
                  ? locale === "es" ? "Copiado" : "Copied"
                  : copyStatus === "failed"
                    ? locale === "es" ? "No se puede copiar" : "Copy unavailable"
                    : locale === "es" ? "Copiar código" : "Copy code"}
              </span>
            </button>
          </div>
          <pre className="max-h-72 overflow-auto p-4 text-xs leading-6" tabIndex={0} role="region" aria-label={locale === "es" ? `JSX generado de ${recipe.exportName}` : `${recipe.exportName} generated JSX`}>
            <code>{source}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
