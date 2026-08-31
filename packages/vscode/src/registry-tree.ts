import * as vscode from "vscode"

import {
  fetchRegistryIndex,
  groupRegistryItems,
  registryKind,
  type RegistryGroup,
  type RegistryIndexItem,
} from "./core"

export class RegistryGroupNode extends vscode.TreeItem {
  constructor(public readonly group: RegistryGroup) {
    super(group.label, vscode.TreeItemCollapsibleState.Expanded)
    this.description = String(group.items.length)
    this.contextValue = "logic2b.registryGroup"
    this.iconPath = new vscode.ThemeIcon(
      group.kind === "component"
        ? "symbol-class"
        : group.kind === "chart"
          ? "graph"
          : "multiple-windows",
    )
  }
}

export class RegistryItemNode extends vscode.TreeItem {
  constructor(
    public readonly item: RegistryIndexItem,
    installed: boolean,
  ) {
    super(item.title ?? item.name, vscode.TreeItemCollapsibleState.None)
    this.description = installed ? "Installed" : item.name
    this.contextValue = "logic2b.registryItem"
    this.iconPath = new vscode.ThemeIcon(installed ? "pass-filled" : "add")
    // Registry copy is untrusted input for custom origins; keep the tooltip
    // plain so Markdown images and links are never interpreted by the editor.
    this.tooltip = `${item.title ?? item.name}\n\n${item.description}`
    this.command = {
      command: "logic2b.openDocumentation",
      title: "Open Documentation",
      arguments: [this],
    }
  }
}

export type RegistryTreeNode = RegistryGroupNode | RegistryItemNode

async function installedItemNames(): Promise<Set<string>> {
  const names = new Set<string>()
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    try {
      const raw = await vscode.workspace.fs.readFile(
        vscode.Uri.joinPath(folder.uri, ".logic2b", "manifest.json"),
      )
      const parsed: unknown = JSON.parse(new TextDecoder().decode(raw))
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) continue
      const items = (parsed as Record<string, unknown>).items
      if (typeof items !== "object" || items === null || Array.isArray(items)) continue
      for (const name of Object.keys(items)) names.add(name)
    } catch {
      // A workspace without an install manifest simply has no installed badges.
    }
  }
  return names
}

export class RegistryTreeProvider
  implements vscode.TreeDataProvider<RegistryTreeNode>
{
  private readonly emitter = new vscode.EventEmitter<RegistryTreeNode | undefined>()
  readonly onDidChangeTreeData = this.emitter.event

  private cache: RegistryIndexItem[] | undefined
  private query = ""

  constructor(private readonly registry: () => string) {}

  getTreeItem(element: RegistryTreeNode): vscode.TreeItem {
    return element
  }

  async getChildren(element?: RegistryTreeNode): Promise<RegistryTreeNode[]> {
    if (element instanceof RegistryItemNode) return []
    if (element instanceof RegistryGroupNode) {
      const installed = await installedItemNames()
      return element.group.items.map(
        (item) => new RegistryItemNode(item, installed.has(item.name)),
      )
    }
    const groups = groupRegistryItems(await this.getItems(), this.query)
    return groups.map((group) => new RegistryGroupNode(group))
  }

  async getItems(): Promise<RegistryIndexItem[]> {
    this.cache ??= await fetchRegistryIndex(this.registry())
    return this.cache
  }

  getQuery(): string {
    return this.query
  }

  setQuery(query: string): void {
    this.query = query.trim()
    this.emitter.fire(undefined)
  }

  refresh(options: { refetch?: boolean } = {}): void {
    if (options.refetch) this.cache = undefined
    this.emitter.fire(undefined)
  }

  dispose(): void {
    this.emitter.dispose()
  }
}
