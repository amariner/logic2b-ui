import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, test } from "node:test"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const registryRoot = resolve(packageRoot, "../../apps/web/public/r")

async function text(path: string) {
  return readFile(join(registryRoot, path), "utf8")
}

describe("published registry representation", () => {
  test("keeps every mutable discovery mirror as canonical compact JSON", async () => {
    const rootFiles = (await readdir(registryRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
    const changelogFiles = (await readdir(join(registryRoot, "changelog")))
      .filter((name) => name.endsWith(".json"))
      .map((name) => join("changelog", name))

    for (const path of [...rootFiles, ...changelogFiles]) {
      const raw = await text(path)
      assert.equal(raw, JSON.stringify(JSON.parse(raw)), path)
    }
  })

  test("hashes immutable bytes while active mirrors preserve the same data", async () => {
    const index = JSON.parse(await text("index.json")) as {
      name: string
      integrity: string
      content: string
    }[]

    for (const entry of index) {
      const active = await text(`${entry.name}.json`)
      const immutable = await text(entry.content.replace(/^\/r\//, ""))
      const integrity = `sha256-${createHash("sha256")
        .update(immutable)
        .digest("base64")}`

      assert.equal(integrity, entry.integrity, entry.name)
      assert.deepEqual(JSON.parse(active), JSON.parse(immutable), entry.name)
    }
  })
})
