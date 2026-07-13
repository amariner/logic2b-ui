"use client"

import * as React from "react"

import { Label } from "@/registry/ui/label"
import { TagsInput } from "@/registry/ui/tags-input"

export default function TagsInputMaxDemo() {
  const [tags, setTags] = React.useState(["design"])

  return (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor="skills">Skills (max 3)</Label>
      <TagsInput
        id="skills"
        value={tags}
        onValueChange={setTags}
        placeholder="Add a skill…"
        max={3}
      />
      <p className="text-muted-foreground text-sm">
        {tags.length}/3 — the field locks when the limit is reached.
      </p>
    </div>
  )
}
