import { copyFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// The repository file is canonical; this generated staging copy is included
// only by the package's explicit publication allowlist.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const source = resolve(packageRoot, "../../skills/logic2b-ui/SKILL.md")
const target = resolve(packageRoot, "skills/logic2b-ui/SKILL.md")
await mkdir(dirname(target), { recursive: true })
await copyFile(source, target)
