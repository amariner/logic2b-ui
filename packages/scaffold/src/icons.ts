import type { IconLibrary } from "@logic2b/tokens"

export const ICON_PACKAGE_VERSIONS = {
  "lucide-react": "1.23.0",
  "@tabler/icons-react": "3.46.0",
  "@phosphor-icons/react": "2.1.10",
  "@hugeicons/react": "1.1.10",
  "@hugeicons/core-free-icons": "4.3.0",
} as const

const TABLER = {
  ArrowLeftIcon: "IconArrowLeft", ArrowRightIcon: "IconArrowRight", BlocksIcon: "IconBlocks",
  BotIcon: "IconRobot", CheckIcon: "IconCheck", ChevronDownIcon: "IconChevronDown",
  ChevronLeft: "IconChevronLeft", ChevronLeftIcon: "IconChevronLeft",
  ChevronRight: "IconChevronRight", ChevronRightIcon: "IconChevronRight",
  ChevronUpIcon: "IconChevronUp", CircleIcon: "IconCircle", CopyIcon: "IconCopy",
  DownloadIcon: "IconDownload", GripVerticalIcon: "IconGripVertical", Home: "IconHome",
  Inbox: "IconInbox", Loader2Icon: "IconLoader2", LockIcon: "IconLock", MenuIcon: "IconMenu",
  MinusIcon: "IconMinus", MoonIcon: "IconMoon", MoreHorizontal: "IconDots",
  MoreHorizontalIcon: "IconDots", PaletteIcon: "IconPalette",
  PanelLeftIcon: "IconLayoutSidebarLeftCollapse", PlusIcon: "IconPlus", Search: "IconSearch",
  SearchIcon: "IconSearch", SendIcon: "IconSend", Settings: "IconSettings",
  SparklesIcon: "IconSparkles", StarIcon: "IconStar", TerminalIcon: "IconTerminal",
  TrashIcon: "IconTrash", TrendingDownIcon: "IconTrendingDown", TrendingUpIcon: "IconTrendingUp",
  UploadIcon: "IconUpload", UserPlusIcon: "IconUserPlus", XIcon: "IconX", ZapIcon: "IconBolt",
} as const

const PHOSPHOR = {
  ArrowLeftIcon: "ArrowLeftIcon", ArrowRightIcon: "ArrowRightIcon", BlocksIcon: "SquaresFourIcon",
  BotIcon: "RobotIcon", CheckIcon: "CheckIcon", ChevronDownIcon: "CaretDownIcon",
  ChevronLeft: "CaretLeftIcon", ChevronLeftIcon: "CaretLeftIcon",
  ChevronRight: "CaretRightIcon", ChevronRightIcon: "CaretRightIcon",
  ChevronUpIcon: "CaretUpIcon", CircleIcon: "CircleIcon", CopyIcon: "CopyIcon",
  DownloadIcon: "DownloadIcon", GripVerticalIcon: "DotsSixVerticalIcon", Home: "HouseIcon",
  Inbox: "TrayIcon", Loader2Icon: "SpinnerGapIcon", LockIcon: "LockIcon", MenuIcon: "ListIcon",
  MinusIcon: "MinusIcon", MoonIcon: "MoonIcon", MoreHorizontal: "DotsThreeIcon",
  MoreHorizontalIcon: "DotsThreeIcon", PaletteIcon: "PaletteIcon", PanelLeftIcon: "SidebarSimpleIcon",
  PlusIcon: "PlusIcon", Search: "MagnifyingGlassIcon", SearchIcon: "MagnifyingGlassIcon",
  SendIcon: "PaperPlaneTiltIcon", Settings: "GearIcon", SparklesIcon: "SparkleIcon",
  StarIcon: "StarIcon", TerminalIcon: "TerminalIcon", TrashIcon: "TrashIcon",
  TrendingDownIcon: "TrendDownIcon", TrendingUpIcon: "TrendUpIcon", UploadIcon: "UploadIcon",
  UserPlusIcon: "UserPlusIcon", XIcon: "XIcon", ZapIcon: "LightningIcon",
} as const

const HUGEICONS = {
  ArrowLeftIcon: "ArrowLeft01Icon", ArrowRightIcon: "ArrowRight01Icon", BlocksIcon: "BlocksIcon",
  BotIcon: "BotIcon", CheckIcon: "Tick02Icon", ChevronDownIcon: "ChevronDownIcon",
  ChevronLeft: "ChevronLeftIcon", ChevronLeftIcon: "ChevronLeftIcon",
  ChevronRight: "ChevronRightIcon", ChevronRightIcon: "ChevronRightIcon",
  ChevronUpIcon: "ChevronUpIcon", CircleIcon: "CircleIcon", CopyIcon: "Copy01Icon",
  DownloadIcon: "Download01Icon", GripVerticalIcon: "GripVerticalIcon", Home: "Home01Icon",
  Inbox: "InboxIcon", Loader2Icon: "Loading03Icon", LockIcon: "LockIcon", MenuIcon: "Menu01Icon",
  MinusIcon: "MinusSignIcon", MoonIcon: "Moon02Icon", MoreHorizontal: "MoreHorizontalIcon",
  MoreHorizontalIcon: "MoreHorizontalIcon", PaletteIcon: "PaletteIcon", PanelLeftIcon: "PanelLeftIcon",
  PlusIcon: "PlusSignIcon", Search: "Search01Icon", SearchIcon: "Search01Icon", SendIcon: "SentIcon",
  Settings: "Settings01Icon", SparklesIcon: "SparklesIcon", StarIcon: "StarIcon",
  TerminalIcon: "TerminalIcon", TrashIcon: "TrashIcon", TrendingDownIcon: "TrendingDownIcon",
  TrendingUpIcon: "TrendingUpIcon", UploadIcon: "Upload01Icon", UserPlusIcon: "UserPlusIcon",
  XIcon: "Cancel01Icon", ZapIcon: "ZapIcon",
} as const

export const ICON_EXPORT_MAPS = {
  tabler: TABLER,
  phosphor: PHOSPHOR,
  hugeicons: HUGEICONS,
} as const

export const SUPPORTED_LUCIDE_ICONS = Object.freeze(Object.keys(TABLER))

const ICON_DEPENDENCIES: Record<IconLibrary, readonly string[]> = {
  lucide: ["lucide-react"],
  tabler: ["@tabler/icons-react"],
  phosphor: ["@phosphor-icons/react"],
  hugeicons: ["@hugeicons/react", "@hugeicons/core-free-icons"],
}

const ICON_IMPORT = /import\s*{([^}]*)}\s*from\s*["']lucide-react["'];?/g

interface ImportedIcon {
  imported: string
  local: string
}

function parseImports(source: string): ImportedIcon[] {
  return source
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^(\w+)(?:\s+as\s+(\w+))?$/.exec(part)
      if (!match) throw new Error(`Unsupported lucide-react import specifier "${part}".`)
      return { imported: match[1], local: match[2] ?? match[1] }
    })
}

function mappedExport(library: Exclude<IconLibrary, "lucide">, imported: string): string {
  const mapped = (ICON_EXPORT_MAPS[library] as Record<string, string>)[imported]
  if (!mapped) {
    throw new Error(
      `Icon "${imported}" has no verified ${library} mapping. Add it to @logic2b/scaffold before generating this source.`,
    )
  }
  return mapped
}

function hugeiconsBlock(icons: ImportedIcon[]): string {
  const dataImports = icons.map(({ imported, local }) =>
    `  ${mappedExport("hugeicons", imported)} as Logic2b${local}Data,`
  ).join("\n")
  const wrappers = icons.map(({ local }) => `function ${local}(props: Logic2bIconProps) {
  return createLogic2bIconElement(HugeiconsIcon, {
    icon: Logic2b${local}Data,
    strokeWidth: 2,
    ...props,
  })
}`).join("\n\n")

  return `import {
  createElement as createLogic2bIconElement,
  type ComponentProps as Logic2bComponentProps,
} from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
${dataImports}
} from "@hugeicons/core-free-icons"

type Logic2bIconProps = Omit<Logic2bComponentProps<typeof HugeiconsIcon>, "icon">

${wrappers}`
}

export function rewriteIconImports(
  content: string,
  library: IconLibrary,
): { content: string; transformed: boolean } {
  if (library === "lucide" || !content.includes("lucide-react")) {
    return { content, transformed: false }
  }

  const imports: ImportedIcon[] = []
  for (const match of content.matchAll(ICON_IMPORT)) imports.push(...parseImports(match[1]))
  if (imports.length === 0) {
    throw new Error("Found a lucide-react reference that is not a supported named import.")
  }

  const unique = [...new Map(imports.map((icon) => [icon.local, icon])).values()]
  let emitted = false
  const next = content.replace(ICON_IMPORT, () => {
    if (emitted) return ""
    emitted = true
    if (library === "hugeicons") return hugeiconsBlock(unique)
    const packageName = ICON_DEPENDENCIES[library][0]
    const specifiers = unique.map(({ imported, local }) =>
      `${mappedExport(library, imported)} as ${local}`
    ).join(", ")
    return `import { ${specifiers} } from "${packageName}"`
  })
  if (next.includes("lucide-react")) {
    throw new Error("A lucide-react reference remained after icon transformation.")
  }
  return { content: next, transformed: true }
}

export function rewriteIconDependencies(
  dependencies: readonly string[] | undefined,
  library: IconLibrary,
  transformed: boolean,
): string[] | undefined {
  if (!transformed || library === "lucide") return dependencies ? [...dependencies] : undefined
  const next = new Set((dependencies ?? []).filter((dependency) => dependency !== "lucide-react"))
  for (const dependency of ICON_DEPENDENCIES[library]) next.add(dependency)
  return [...next]
}

export interface IconTransformableItem<File extends { content: string } = { content: string }> {
  dependencies?: string[]
  files?: File[]
}

export function transformIconItem<T extends IconTransformableItem>(
  item: T,
  library: IconLibrary,
): T {
  let transformed = false
  const files = item.files?.map((file) => {
    const result = rewriteIconImports(file.content, library)
    transformed ||= result.transformed
    return { ...file, content: result.content }
  })
  const dependencyNeedsRewrite = item.dependencies?.includes("lucide-react") ?? false
  return {
    ...item,
    ...(files ? { files } : {}),
    ...(transformed || dependencyNeedsRewrite
      ? { dependencies: rewriteIconDependencies(item.dependencies, library, true) }
      : {}),
  }
}

export function transformIconItems<T extends IconTransformableItem>(
  items: Map<string, T>,
  library: IconLibrary,
): Map<string, T> {
  return new Map([...items].map(([name, item]) => [name, transformIconItem(item, library)]))
}
