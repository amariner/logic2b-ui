"use client"

import * as React from "react"
import { FolderIcon, LayersIcon } from "lucide-react"

import { Button } from "@/registry/ui/button"
import { TreeItem, TreeView } from "@/registry/ui/tree-view"

const ALL = ["workspace", "apps", "packages"]

export default function TreeViewControlledDemo() {
  const [expanded, setExpanded] = React.useState<string[]>(["workspace"])
  const [selected, setSelected] = React.useState<string | null>(null)

  return (
    <div className="flex w-full max-w-72 flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setExpanded(ALL)}>
          Expand all
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded([])}>
          Collapse all
        </Button>
      </div>
      <TreeView
        aria-label="Monorepo"
        expanded={expanded}
        onExpandedChange={setExpanded}
        selected={selected}
        onSelectedChange={setSelected}
      >
        <TreeItem value="workspace" label="workspace" icon={<LayersIcon />}>
          <TreeItem value="apps" label="apps" icon={<FolderIcon />}>
            <TreeItem value="web" label="web" />
            <TreeItem value="docs" label="docs" />
          </TreeItem>
          <TreeItem value="packages" label="packages" icon={<FolderIcon />}>
            <TreeItem value="ui" label="ui" />
            <TreeItem value="cli" label="cli" />
          </TreeItem>
        </TreeItem>
      </TreeView>
      <p className="text-muted-foreground text-sm">
        Selected: <span className="font-medium">{selected ?? "none"}</span>
      </p>
    </div>
  )
}
