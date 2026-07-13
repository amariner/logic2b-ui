"use client"

import * as React from "react"

import { Label } from "@/registry/ui/label"
import { TagsInput } from "@/registry/ui/tags-input"

export default function TagsInputDemo() {
  const [tags, setTags] = React.useState(["react", "tailwind"])

  return (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor="topics">Topics</Label>
      <TagsInput
        id="topics"
        value={tags}
        onValueChange={setTags}
        placeholder="Add a topic…"
      />
      <p className="text-muted-foreground text-sm">
        Press <kbd className="bg-muted rounded px-1">Enter</kbd> or comma to
        add, <kbd className="bg-muted rounded px-1">Backspace</kbd> to remove.
      </p>
    </div>
  )
}
