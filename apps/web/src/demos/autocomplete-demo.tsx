"use client"

import * as React from "react"

import { Autocomplete } from "@/registry/ui/autocomplete"

const frameworks = [
  "Next.js",
  "Vite",
  "Astro",
  "Remix",
  "TanStack Start",
  "SvelteKit",
  "Nuxt",
  "SolidStart",
]

export default function AutocompleteDemo() {
  const [value, setValue] = React.useState("")

  return (
    <div className="w-full max-w-xs">
      <Autocomplete
        options={frameworks}
        value={value}
        onValueChange={setValue}
        placeholder="Search framework..."
        aria-label="Framework"
      />
    </div>
  )
}
