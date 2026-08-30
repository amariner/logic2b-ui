import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

import * as hugeicons from "@hugeicons/core-free-icons"
import * as phosphor from "@phosphor-icons/react"
import * as tabler from "@tabler/icons-react"

import {
  ICON_EXPORT_MAPS,
  rewriteIconImports,
  transformIconItem,
} from "../src/icons.ts"

const here = dirname(fileURLToPath(import.meta.url))

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : []
  }))
  return nested.flat()
}

describe("icon export contract", () => {
  it("maps every supported name to a real package export", () => {
    const packages = { tabler, phosphor, hugeicons } as const
    for (const [library, mappings] of Object.entries(ICON_EXPORT_MAPS)) {
      for (const target of Object.values(mappings)) {
        assert.ok(
          target in packages[library as keyof typeof packages],
          `${library} does not export ${target}`,
        )
      }
    }
  })

  it("covers every Lucide icon currently used by canonical registry sources", async () => {
    const files = await sourceFiles(join(here, "../../registry/src"))
    const imported = new Set<string>()
    for (const path of files) {
      const source = await readFile(path, "utf8")
      for (const match of source.matchAll(/import\s*{([^}]*)}\s*from\s*["']lucide-react["']/g)) {
        for (const part of match[1].split(",")) {
          const name = part.trim().split(/\s+as\s+/)[0]
          if (name) imported.add(name)
        }
      }
    }
    assert.ok(imported.size > 0)
    for (const name of imported) {
      for (const [library, mappings] of Object.entries(ICON_EXPORT_MAPS)) {
        assert.ok(name in mappings, `${name} is missing from ${library}`)
      }
    }
  })
})

describe("source rewriting", () => {
  const source = `import { ArrowLeftIcon, Search as SearchGlyph } from "lucide-react"\n\nexport { ArrowLeftIcon, SearchGlyph }\n`

  it("preserves local component names for Tabler and Phosphor", () => {
    const tablerResult = rewriteIconImports(source, "tabler").content
    assert.match(tablerResult, /IconArrowLeft as ArrowLeftIcon/)
    assert.match(tablerResult, /IconSearch as SearchGlyph/)
    assert.match(tablerResult, /from "@tabler\/icons-react"/)

    const phosphorResult = rewriteIconImports(source, "phosphor").content
    assert.match(phosphorResult, /ArrowLeftIcon as ArrowLeftIcon/)
    assert.match(phosphorResult, /MagnifyingGlassIcon as SearchGlyph/)
    assert.doesNotMatch(phosphorResult, /lucide-react/)
  })

  it("builds typed Hugeicons wrappers and replaces package dependencies", () => {
    const item = transformIconItem({
      dependencies: ["lucide-react", "clsx"],
      files: [{ path: "ui/example.tsx", content: source }],
    }, "hugeicons")
    const output = item.files![0].content
    assert.match(output, /HugeiconsIcon/)
    assert.match(output, /ArrowLeft01Icon as Logic2bArrowLeftIconData/)
    assert.match(output, /function SearchGlyph\(props: Logic2bIconProps\)/)
    assert.deepEqual(item.dependencies, [
      "clsx",
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
    ])
  })

  it("fails closed when a registry source introduces an unmapped icon", () => {
    assert.throws(
      () => rewriteIconImports('import { UnmappedIcon } from "lucide-react"', "tabler"),
      /no verified tabler mapping/,
    )
  })
})
