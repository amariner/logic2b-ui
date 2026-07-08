import { CloudIcon } from "lucide-react"

import { Button } from "@/registry/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/ui/empty"

export default function EmptyActionsDemo() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CloudIcon />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>
          Create your first project to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button size="sm">Create project</Button>
          <Button size="sm" variant="outline">
            Import
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  )
}
