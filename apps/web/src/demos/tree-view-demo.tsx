import { FileCodeIcon, FileTextIcon, FolderIcon } from "lucide-react"

import { TreeItem, TreeView } from "@/registry/ui/tree-view"

export default function TreeViewDemo() {
  return (
    <TreeView
      aria-label="Project files"
      className="w-full max-w-72"
      defaultExpanded={["src", "components"]}
      defaultSelected="button"
    >
      <TreeItem value="src" label="src" icon={<FolderIcon />}>
        <TreeItem value="components" label="components" icon={<FolderIcon />}>
          <TreeItem value="button" label="button.tsx" icon={<FileCodeIcon />} />
          <TreeItem value="card" label="card.tsx" icon={<FileCodeIcon />} />
          <TreeItem value="tree-view" label="tree-view.tsx" icon={<FileCodeIcon />} />
        </TreeItem>
        <TreeItem value="lib" label="lib" icon={<FolderIcon />}>
          <TreeItem value="utils" label="utils.ts" icon={<FileCodeIcon />} />
        </TreeItem>
        <TreeItem value="styles" label="styles" icon={<FolderIcon />}>
          <TreeItem value="theme" label="theme.css" icon={<FileTextIcon />} />
        </TreeItem>
      </TreeItem>
      <TreeItem value="readme" label="README.md" icon={<FileTextIcon />} />
      <TreeItem value="package" label="package.json" icon={<FileTextIcon />} disabled />
    </TreeView>
  )
}
